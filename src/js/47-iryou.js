/* ---------- 病気・けがの備え診断（医療保険・共済がいるかを、数字で確かめる） ----------
   考え方：病気・けがのときに出ていくお金（医療費の自己負担・食事・差額ベッド・雑費）と、収入の減り方（会社員は傷病手当金）を、
   3つの場面＋自分で決める場面で計算し、「生活防衛資金を残して使える貯蓄」で足りるかを見る。
   ・医療費は高額療養費（令和8年8月からの限度額。多数回該当・年間上限も）で上限をかける。健保の付加給付があればその上限も
   ・足りない場面だけ「入院1日あたり約○円の給付があれば埋まる」目安を出す（保険の勧誘はしない） */
const IRK=V=>{const T=CFG.iryou.kougaku.map(r=>({n:r[0],max:r[1],base:r[2],th:r[3],many:r[4],year:r[5]*10000}));
  if(V.kubun==='o')return{n:'オ（住民税非課税）',base:36900,th:0,many:24600,year:290000};
  if(V.kubun&&V.kubun!=='auto'){const x=T.find(r=>r.n===V.kubun);if(x)return x}
  const g=n(V.gross);return T.slice().reverse().find(r=>g<r.max)||T[0]};
/* 1か月の自己負担（円）。total は医療費の総額（10割・円）、k は何か月目に上限に達したか（4回目からは多数回該当） */
function irMonth(V,K,total,hits){const raw=total*0.3;const cap=K.th?K.base+Math.max(0,total-K.th)*0.01:K.base;let lim=hits>=3?Math.min(cap,K.many):cap;
  if(V.fuka==='yes')lim=Math.min(lim,n(V.fukaCap)*10000);return{pay:Math.min(raw,lim),hit:raw>=lim}}
/* 場面ごとの計算（金額は円で計算し、最後に万円） */
function irScene(V,sc){
  const I=CFG.iryou,K=IRK(V),days=n(sc.days),outM=n(sc.out),outMed=n(sc.outMed)*10000,off=n(sc.off);
  // 月ごとの医療費：入院は30日ずつ、そのあと通院
  const months=[];let d=days;while(d>0){const x=Math.min(30,d);months.push({hosp:x,total:x*I.dayMed*10000});d-=x}
  for(let i=0;i<outM;i++)months.push({hosp:0,total:outMed});
  let med=0,hits=0;months.forEach(m=>{const r=irMonth(V,K,m.total,hits);med+=r.pay;if(r.hit)hits++});
  med=Math.min(med,K.year); // 年間上限（12か月以内として）
  const meal=days*3*I.meal, room=V.room==='yes'?days*n(V.roomDay):0, misc=days*n(V.misc)+outM*n(V.outMisc);
  // 収入の減り方（月・円）
  const G=n(V.gross)*10000/12, net=G*I.take;
  let loss=0;const offEff=Math.max(0,off-(V.job==='self'?0:n(V.paid)/20)); // 有給休暇（20日≒1か月）を先に使う
  if(V.job==='self'){loss=offEff*net*n(V.selfLoss)/100}
  else{const sm=Math.min(offEff,I.shoubyouMonths),rest=Math.max(0,offEff-I.shoubyouMonths);
    loss=sm*(net-(G*I.shoubyou-G*I.social))+rest*net}
  const spend=med+meal+room+misc, total=spend+loss, can=Math.max(0,n(V.savings)-n(V.keep))*10000;
  const short=Math.max(0,total-can);
  return{sc,K,med,meal,room,misc,loss,spend,total,can,short,perDay:days>0&&short>0?Math.ceil(short/days/1000)*1000:0,months:months.length,hits};
}
const IRSC=V=>[
  {k:'s',t:'2週間の入院',d:'盲腸・骨折など。退院後半月ほどで復帰',days:14,out:1,outMed:3,off:1},
  {k:'m',t:'2か月の入院',d:'脳卒中・大きなけがなど。退院後1か月は通院で休む',days:60,out:3,outMed:5,off:3},
  {k:'l',t:'がんなどで1年の治療',d:'1か月の入院のあと、通院で抗がん剤などの治療。その間は働けない',days:30,out:11,outMed:30,off:12},
  {k:'c',t:'自分で決めた場面',d:`入院${n(V.cDays)}日・通院${n(V.cOut)}か月・働けない期間${n(V.cOff)}か月`,days:n(V.cDays),out:n(V.cOut),outMed:n(V.cOutMed),off:n(V.cOff)}];
function irCalc(V){const S=IRSC(V).map(sc=>irScene(V,sc));const live=n(V.live);return{S,K:IRK(V),months:live>0?Math.floor(n(V.savings)/live*10)/10:0,worst:S.reduce((a,b)=>b.short>a.short?b:a,S[0])}}
const irMan=v=>(Math.round(v/1000)/10).toLocaleString('ja-JP');
const IRDEF={id:'iryou',title:'病気・けがの備え診断',example:'会社員・年収500万円・貯蓄300万円・個室は希望しない',
  lead:'病気やけがで入院・休職したときに、<b>医療費の自己負担と収入の減り方</b>を計算し、貯蓄で足りるかを確かめます。高額療養費（2026年8月からの限度額）と傷病手当金を入れて、医療保険や共済で備えるかを考える材料にしてください。',
  base:()=>({job:'emp',gross:500,kubun:'auto',fuka:'no',fukaCap:2.5,paid:10,selfLoss:100,live:30,savings:300,keep:90,room:'no',roomDay:6000,misc:2000,outMisc:10000,cDays:30,cOut:6,cOutMed:10,cOff:6}),
  groups:[
   {g:'働き方と収入',f:[
    {id:'job',l:'働き方',type:'sel',o:[['emp','会社員・公務員（健康保険）'],['self','自営業・フリーランス（国民健康保険）']],h:'会社員は休んでいる間に傷病手当金（給料の約3分の2）が出ます。国民健康保険には原則ありません'},
    {id:'gross',l:'年収（額面）',u:'万円',h:'自営業は、売上から経費を引いた所得'},
    {id:'kubun',l:'高額療養費の区分',type:'sel',o:[['auto','年収から自動で決める'],['ア','ア（年収約1,160万円〜）'],['イ','イ（年収約770万〜1,160万円）'],['ウ','ウ（年収約370万〜770万円）'],['エ','エ（年収約370万円まで）'],['o','オ（住民税非課税）']]},
    {id:'fuka',l:'会社の健康保険の付加給付',type:'sel',o:[['no','ない・わからない'],['yes','ある（自己負担の上限が決まっている）']],h:'大企業の健康保険組合などでは、1か月の自己負担が2万5千円ほどまでになる「付加給付」があることも',show:V=>V.job!=='self'},
    {id:'fukaCap',l:'付加給付で決まっている1か月の上限',u:'万円',st:.1,show:V=>V.job!=='self'&&V.fuka==='yes'},
    {id:'paid',l:'残っている有給休暇',u:'日',h:'先に有給休暇を使い、そのあと傷病手当金になる前提です',show:V=>V.job!=='self'},
    {id:'selfLoss',l:'休んだときに減る収入の割合',u:'%',h:'店を閉める・仕事を受けられないなら100%。人に任せて続けられる分があれば下げてください',show:V=>V.job==='self'}]},
   {g:'貯蓄と生活費',f:[
    {id:'live',l:'毎月の生活費（住居費も含む）',u:'万円/月',h:'家族全体の生活費。貯蓄が何か月分になるかの目安に使います'},
    {id:'savings',l:'すぐに使える預貯金',u:'万円',h:'普通預金・定期預金など。NISAなどの投資も、取り崩すつもりなら含めて'},
    {id:'keep',l:'手をつけずに残したいお金（生活防衛資金）',u:'万円',h:'生活費の3〜6か月分が目安。この額は使わない前提で計算します'}]},
   {g:'入院したときの希望',f:[
    {id:'room',l:'個室など（差額ベッド）',type:'sel',o:[['no','希望しない（大部屋）'],['yes','希望する']],h:'差額ベッド代は高額療養費の対象外で、全額自己負担です'},
    {id:'roomDay',l:'差額ベッド代（1日）',u:'円',h:'1人部屋は1日5,000〜1万円ほどが多い',show:V=>V.room==='yes'},
    {id:'misc',l:'入院中の雑費（1日）',u:'円',h:'日用品・テレビカード・家族の交通費や外食など'},
    {id:'outMisc',l:'通院中の雑費（1か月）',u:'円',h:'通院の交通費・薬以外の費用など'}]},
   {g:'自分で決める場面',s:'4つ目の場面として計算します',f:[
    {id:'cDays',l:'入院日数',u:'日'},{id:'cOut',l:'退院後の通院の期間',u:'か月'},
    {id:'cOutMed',l:'通院の医療費の総額（1か月・10割）',u:'万円',h:'抗がん剤などは月30万〜100万円ほどになることも'},
    {id:'cOff',l:'働けない期間（入院も含む）',u:'か月'}]}
  ],
  calc:V=>irCalc(V),
  result(V,R){
    const card=r=>{const ok=r.short<=0;return `<section class="panel"><div class="ph"><span class="nm">${esc(r.sc.t)}</span><span class="chip ${ok?'good':'bad'}">${ok?'貯蓄で足りる':'貯蓄では不足'}</span></div>
      <p class="unit" style="margin:0 0 6px">${esc(r.sc.d)}</p>
      <div class="kv">${kvRow('医療費の自己負担',irMan(r.med)+'<small>万円</small>')}${kvRow('食事・差額ベッド・雑費',irMan(r.meal+r.room+r.misc)+'<small>万円</small>')}${kvRow(V.job==='self'?'収入の減少':'収入の減少（傷病手当金を引いた後）',irMan(r.loss)+'<small>万円</small>')}${kvRow('合計',irMan(r.total)+'<small>万円</small>')}${kvRow(ok?'貯蓄の残り（生活防衛資金とは別）':'足りない額',irMan(Math.abs(r.can-r.total))+'<small>万円</small>',!ok)}</div>
      ${ok?'':r.loss>r.spend&&r.sc.off>0?`<p class="unit" style="margin:6px 0 0">足りない分の多くは<b>収入の減少</b>です。働けない間の収入を補う形で備えるなら、<b>月約${irMan(Math.ceil(r.short/r.sc.off/10000)*10000)}万円</b>（${r.sc.off}か月分）で埋まる計算です。</p>`:r.perDay?`<p class="unit" style="margin:6px 0 0">保険で備えるなら、入院1日あたり<b>約${r.perDay.toLocaleString('ja-JP')}円</b>の給付があれば埋まる計算です（入院${r.sc.days}日）。</p>`:''}</section>`};
    const S=R.S,bad=S.filter(r=>r.short>0),K=R.K;
    const capTxt=K.th?`${K.base.toLocaleString('ja-JP')}円＋（医療費−${K.th.toLocaleString('ja-JP')}円）×1%`:`${K.base.toLocaleString('ja-JP')}円`;
    return `<h2>計算結果</h2><p class="unit">入力するたびに自動で更新されます。</p>
     <div class="panels">${S.map(card).join('')}</div>
     <section class="advice"><h3>入力した条件で計算すると</h3><ul>
      <li>高額療養費の区分は<b>${esc(K.n)}</b>で、1か月の自己負担の上限は<b>${capTxt}</b>です（4か月目からは${K.many.toLocaleString('ja-JP')}円、1年の上限は${irMan(K.year)}万円）。${V.job!=='self'&&V.fuka==='yes'?`付加給付で、1か月${n(V.fukaCap)}万円までになる計算です。`:''}</li>
      <li>すぐに使える預貯金は、毎月の生活費の<b>約${R.months}か月分</b>です。${R.months<3?'生活費の3か月分に届いていないので、まず貯蓄をつくることが先決です。':R.months>=6?'生活費の6か月分以上あり、病気やけがの出費の多くは貯蓄で対応できる水準です。':''}</li>
      ${bad.length?`<li><b>${bad.map(r=>r.sc.t).join('・')}</b>では、貯蓄だけでは<b>最大約${irMan(R.worst.short)}万円</b>足りない計算です。足りない場面が「よく起きること」か「めったに起きないこと」かで、保険で備えるか、貯蓄を増やして備えるかを考えましょう。</li>`:'<li>4つの場面とも、生活防衛資金を残したまま貯蓄で払える計算です。医療保険・共済に入らず、貯蓄で備えるという考え方もできます。</li>'}
      ${V.job==='self'?'<li><b>自営業・フリーランスは、休んだ分の収入がそのまま減ります。</b>医療費より、働けない間の収入をどう補うかが大きな問題です。</li>':'<li>会社員は、傷病手当金で給料の約3分の2が最長1年6か月出ます。長く休むほど、医療費より<b>収入の減り方</b>の影響が大きくなります。</li>'}
      <li>先進医療の技術料（数十万〜数百万円）や、保険のきかない治療・薬は、高額療養費の対象外です。この計算には入っていません。</li></ul></section>
     <div class="taxnote">2026年8月からの高額療養費の自己負担限度額（69歳以下）で計算した<b>目安</b>です。入院中の医療費の総額は1日5万円、食事は1食510円、傷病手当金は額面の月収の3分の2（休んでいる間も社会保険料は約15%払う）、手取りは額面の約78%として計算しています。収入の区分は年収から自動で決めています（実際は標準報酬月額などで決まります）。2027年8月以降にも見直しが予定されています。医療保険や共済に入るかどうかは、保障の内容と保険料を比べ、募集人の説明を受けて判断してください。</div>`;
  },
  dock:(V,R)=>R.S.some(r=>r.short>0)?['貯蓄で足りない額（最大）',irMan(R.worst.short)+' 万円',true]:['4つの場面とも','貯蓄で足りる'],
  related:['hoshou','lifeplan','furusato']
};
GDEF.iryou=IRDEF;
SHARE.iryou={get:()=>gtState(IRDEF),set:d=>{GT.iryou=d}};
IRDEF.fromLP=function(V,S){
  const w=S.wwork||'emp';V.job=(w==='self'||w==='none')?'self':'emp';V.gross=toGross(S.inc);
  const house=S.house==='rent'?n(S.rent):(n(S.loanPay)||0);V.live=Math.round(n(S.live)+house+n(S.ins||0));
  const A=S.assets||{};V.savings=Math.round(['cash','nisa','tax'].reduce((s,k)=>s+Math.max(0,n(A[k]&&A[k].bal)),0));V.keep=Math.round(V.live*3);
};
