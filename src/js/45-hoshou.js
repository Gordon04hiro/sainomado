/* ---------- 必要保障額の目安（もしものときに、家族に必要なお金） ----------
   考え方：亡くなった年から、残された家族の毎年のお金の出入り（生活費・住居費・教育費 と、残る人の収入・遺族年金・児童手当・自分の年金）を
   1年ずつ積み上げ、今ある貯蓄を足しても「いちばん足りなくなる時点」の不足額を必要保障額とする（単純な「支出の合計−収入の合計」より、時期のずれを考えられる）。
   ・本人が亡くなった場合／配偶者が亡くなった場合の両方を出す
   ・遺族年金は令和8年度の額。2028年4月からの見直し（子のない配偶者の遺族厚生年金の有期化・中高齢寡婦加算の縮小・子の加算の引き上げ）も、亡くなる年に応じて反映
   ・今亡くなった場合だけでなく、1年後・2年後…に亡くなった場合の必要保障額の推移も出す（子どもが大きくなるほど減っていく） */
const HSEDU={pub:{kg:'pub',sch:'pub',uni:'pub'},pubpri:{kg:'pri',sch:'pub',uni:'pri_b'},prijh:{kg:'pri',sch:'pri_jh',uni:'pri_b'},hs:{kg:'pub',sch:'pub',uni:'none'}};
const HSJOB=[['emp','会社員・公務員（厚生年金）'],['self','自営業・フリーランス（国民年金）'],['dep','扶養の範囲内のパート・専業主婦（主夫）']];
const HSROLE=V=>V.role==='w'?['妻','夫']:['夫','妻']; // [本人, 配偶者]
function hsWho(V,who){const me=who==='self',[r1,r2]=HSROLE(V);
  const P=(x)=>x?{age:n(V.age),inc:n(V.inc),workEnd:n(V.workEnd),pen:n(V.pen),job:V.job,avg:n(V.gavg),yrs:n(V.yrs),sev:n(V.sev),cover:n(V.cover),role:r1}
                :{age:n(V.sage),inc:n(V.sinc),workEnd:n(V.sworkEnd),pen:n(V.spen),job:V.sjob,avg:n(V.sgavg),yrs:n(V.syrs),sev:n(V.ssev),cover:n(V.scover),role:r2};
  const d=P(me),s=P(!me);s.wife=s.role==='妻';return{d,s,label:(me?'ご本人':'配偶者')+'（'+d.role+'）'}}
/* 厚生年金（報酬比例部分）の年額（万円）。avg は平均年収（額面・万円）、yrs は加入年数 */
const hsKosei=(avg,yrs,minM)=>Math.min(n(avg),CFG.pension.incCap)/12*CFG.pension.rate/1000*Math.max(minM||0,Math.round(n(yrs)*12));
function hsSim(V,who,off){
  off=off||0;const I=CFG.izoku,P=CFG.pension,p=hsWho(V,who),Yd=Y0+off,sA=p.s.age+off,c=HSEDU[V.edu]||HSEDU.pub;
  const kids=[V.kid1,V.kid2,V.kid3].map(n).filter(b=>b>1900&&b<=Yd).sort((a,b)=>a-b);
  const emp=p.d.job==='emp',dYrs=p.d.yrs+(p.d.age+off<p.d.workEnd?off:Math.max(0,p.d.workEnd-p.d.age));
  const K=emp?hsKosei(p.d.avg,dYrs,I.months)*0.75:0; // 遺族厚生年金（報酬比例の3/4、300月みなし）
  // 残る人の、自分の老齢厚生年金（65歳から）
  const ownK=p.s.job==='emp'?hsKosei(p.s.avg,p.s.yrs+Math.max(0,Math.min(p.s.workEnd,65)-p.s.age)):0;
  const ys=kids.length?Math.max(Yd,kids[kids.length-1]+19):Yd, a0=sA+(ys-Yd); // 子の要件がなくなる年と、そのときの年齢
  const newRule=Yd>=I.reform;
  let start=ys,end=Infinity,mult=1;
  if(!newRule){ if(p.s.wife){if(!kids.length&&sA<30)end=ys+5}else{start=sA>=55?Math.max(ys,Yd+(60-sA)):Infinity} }
  else{const young=p.s.wife?(p.s.age-(Y0-I.reform))<40:true;if(a0<60&&young){end=ys+5;mult=I.boost}} // 女性は2028年度末に40歳未満の人が対象（その後の段階的な拡大は含めない）
  // 2028年からの有期給付の人は、65歳から「死亡分割」で自分の厚生年金がふえる（結婚していた期間の記録の分割。結婚は亡くなった人が27歳のときと仮定し、その半分を目安に）
  const split=emp&&mult>1?hsKosei(p.d.avg,Math.min(dYrs,Math.max(0,p.d.age+off-27)))/2:0;
  const chuOK=emp&&p.s.wife&&a0>=40&&start<Infinity, chuAmt=I.chukou*(newRule?Math.max(0,1-(ys-I.reform)/25):1); // 縮小は2028年4月より後に受給権ができる人だけ
  const hc=V.house, rows=[], T={live:0,house:0,edu:0,one:0,work:0,own:0,izoku:0,al:0,sev:0};
  let cum=n(V.assets)+n(V.saveY)*off, min=cum, minA=sA;
  const endA=Math.max(sA,n(V.until)||90);
  for(let t=0;sA+t<=endA;t++){
    const y=Yd+t,sa=sA+t,ks=kids.map(b=>y-b),elig=ks.filter(k=>k<=18).length,dep=ks.some(k=>k<=22);
    const izB=elig?I.basic+(y>=I.reform?elig*I.kidNew:Math.min(elig,2)*I.kid12+Math.max(0,elig-2)*I.kid3):0;
    let izK=0,chu=0,kafu=0;
    let cont=0;
    if(emp){ if(elig)izK=K; else if(y>=start&&y<end)izK=K*mult;
      else if(mult>1&&y>=end&&sa<65){ // 5年のあとの継続給付：残る人の収入が少ないほど多く（収入が多いと止まる）。額面は手取りの約1.25倍で判定
        const g=(sa<p.s.workEnd?p.s.inc:0)*1.25,lo=p.s.wife?I.contLoW:I.contLoH,hi=I.contHi;izK=K*mult*Math.max(0,Math.min(1,(hi-g)/(hi-lo)));cont=izK}
      if(!elig&&izK>0&&chuOK&&sa>=40&&sa<65)chu=chuAmt;
      if(sa>=65&&izK>0){const full=K/0.75,alt=Math.max(izK,full/2+ownK/2);izK=Math.max(0,alt-ownK)} }
    else if(p.d.job==='self'&&p.s.wife&&dYrs>=10&&!elig&&sa>=60&&sa<65) kafu=P.basic*12*Math.min(40,dYrs)/40*0.75; // 寡婦年金
    const work=sa<p.s.workEnd?p.s.inc:0, own=sa>=65?p.s.pen*12+split:0, sev=t===0?p.d.sev:0;
    let al=0,rank=0;ks.forEach(k=>{if(k<=22)rank++;if(k>=0&&k<=17)al+=rank>=3?CFG.allowance.third:(k<=2?CFG.allowance.u3:CFG.allowance.std)});
    const live=n(V.live)*12*(dep?n(V.r1):n(V.r2))/100;
    const house=hc==='rent'?n(V.rent)*12:n(V.hcost)+(hc==='own_loan'&&t<n(V.loanYrs)-off?n(V.loanPay)*12:0);
    const edu=ks.reduce((s,k)=>s+eduCost(k,c),0), one=t===0?n(V.funeral)+n(V.extra):0;
    const izoku=izB+izK+chu+kafu, inc=work+own+izoku+al+sev, exp=live+house+edu+one;
    cum+=inc-exp; if(cum<min){min=cum;minA=sa}
    T.live+=live;T.house+=house;T.edu+=edu;T.one+=one;T.work+=work;T.own+=own;T.izoku+=izoku;T.al+=al;T.sev+=sev;
    rows.push({a:sa,y,bal:Math.round(cum),izB,izK,chu,kafu,cont,izoku,inc,exp,elig});
  }
  const need=Math.max(0,Math.ceil((n(V.keep)-min)/10)*10);
  return{p,need,min,minA,rows,T,start0:n(V.assets)+n(V.saveY)*off,K,ys,a0,newRule,mult,end,kids,emp,split};
}
/* 遺族年金の時期ごとのまとめ（同じ額が続く期間をひとまとめに） */
function hsTimeline(r){const out=[];r.rows.forEach(x=>{const v=Math.round(x.izoku*10)/10,last=out[out.length-1];
  if(last&&Math.abs(last.v-v)<0.05)last.to=x;else out.push({from:x,to:x,v,x})});return out}
function hsCalc(V){
  const A=hsSim(V,'self'),B=hsSim(V,'sp');
  const youngest=Math.max(0,...[V.kid1,V.kid2,V.kid3].map(n).filter(b=>b>1900));
  const N=Math.max(10,Math.min(30,youngest?youngest+22-Y0:20));
  const tr=k=>Array.from({length:N+1},(_,i)=>({a:hsWho(V,k).d.age+i,bal:hsSim(V,k,i).need}));
  return{A,B,trA:tr('self'),trB:tr('sp'),N};
}
const HSBASE=()=>({role:'h',age:35,sage:33,kid1:Y0-5,kid2:Y0-2,kid3:'',edu:'pubpri',
  job:'emp',inc:450,workEnd:65,gavg:500,yrs:13,pen:15,sev:0,cover:0,
  sjob:'dep',sinc:100,sworkEnd:60,sgavg:0,syrs:0,spen:7,ssev:0,scover:0,
  house:'own_dan',rent:8,hcost:15,loanPay:9,loanYrs:30,
  live:25,r1:70,r2:50,funeral:200,extra:0,keep:100,assets:500,saveY:50,until:90});
const HSDEF={id:'hoshou',title:'必要保障額の目安',example:'夫35歳（会社員）・妻33歳（パート）・子ども2人・持ち家（団信つき）',
  lead:'もしも本人や配偶者が亡くなったとき、残された家族の生活に<b>あといくら必要か</b>（必要保障額）を計算します。遺族年金（2028年からの見直しも反映）・残る人の収入・教育費・住まいを1年ずつ積み上げ、いちばん足りなくなる時点の不足額を出します。本人と配偶者、両方の場合を並べて見られます。',
  base:HSBASE,
  groups:[
   {g:'家族',s:'年齢は今年の誕生日を迎えた時点',f:[
    {id:'role',l:'ご本人は',type:'sel',o:[['h','夫'],['w','妻']],h:'遺族年金の受け取り方が、夫と妻で違うため'},
    {id:'age',l:'ご本人の年齢',u:'歳'},{id:'sage',l:'配偶者の年齢',u:'歳'},
    {id:'kid1',l:'第1子の生まれ年',u:'年',h:'子どもがいなければ空欄に'},{id:'kid2',l:'第2子の生まれ年',u:'年'},{id:'kid3',l:'第3子の生まれ年',u:'年'},
    {id:'edu',l:'子どもの進路',type:'sel',o:[['pub','公立中心・大学は国公立'],['pubpri','公立中心・大学は私立文系'],['prijh','中学から私立・大学は私立文系'],['hs','高校まで（大学に行かない）']],h:'教育費は文部科学省・日本政策金融公庫の調査の平均で計算'}]},
   {g:'ご本人の仕事と年金',f:[
    {id:'job',l:'働き方',type:'sel',o:HSJOB},
    {id:'inc',l:'手取りの年収',u:'万円',h:'配偶者が亡くなった場合の、ご本人の収入として使います'},
    {id:'workEnd',l:'何歳まで働く',u:'歳'},
    {id:'gavg',l:'これまでの平均年収（額面）',u:'万円',h:'遺族厚生年金の計算に使います。わからなければ今の年収（額面）の8〜9割',show:V=>V.job==='emp'},
    {id:'yrs',l:'年金の加入年数（これまで）',u:'年',h:'会社員なら厚生年金、自営業なら国民年金に入っていた年数。ねんきん定期便でわかります'},
    {id:'pen',l:'自分の年金（65歳から・手取り）',u:'万円/月',h:'ねんきん定期便の見込み額が目安'},
    {id:'sev',l:'亡くなったときの死亡退職金・弔慰金',u:'万円',h:'会社の規程で決まります。わからなければ0'},
    {id:'cover',l:'今入っている死亡保険金の合計',u:'万円',h:'ご本人が亡くなったときに受け取る額（団信は含めない）'}]},
   {g:'配偶者の仕事と年金',f:[
    {id:'sjob',l:'働き方',type:'sel',o:HSJOB},
    {id:'sinc',l:'手取りの年収',u:'万円',h:'ご本人が亡くなった場合の、配偶者の収入として使います。働き方を変える予定があれば、その額で'},
    {id:'sworkEnd',l:'何歳まで働く',u:'歳'},
    {id:'sgavg',l:'これまでの平均年収（額面）',u:'万円',show:V=>V.sjob==='emp'},
    {id:'syrs',l:'年金の加入年数（これまで）',u:'年',show:V=>V.sjob!=='dep'},
    {id:'spen',l:'自分の年金（65歳から・手取り）',u:'万円/月'},
    {id:'ssev',l:'亡くなったときの死亡退職金・弔慰金',u:'万円',show:V=>V.sjob==='emp'},
    {id:'scover',l:'今入っている死亡保険金の合計',u:'万円',h:'配偶者が亡くなったときに受け取る額'}]},
   {g:'住まい',f:[
    {id:'house',l:'住まい',type:'sel',o:[['own_dan','持ち家（住宅ローンは団信で0になる）'],['own_paid','持ち家（ローンなし）'],['own_loan','持ち家（団信なし・返済が続く）'],['rent','賃貸']],h:'住宅ローンの団体信用生命保険（団信）に入っていれば、契約者が亡くなるとローンは0になります'},
    {id:'rent',l:'家賃（管理費込み）',u:'万円/月',show:V=>V.house==='rent'},
    {id:'hcost',l:'持ち家の維持費（固定資産税・修繕・管理費など）',u:'万円/年',show:V=>V.house!=='rent'},
    {id:'loanPay',l:'住宅ローンの返済',u:'万円/月',show:V=>V.house==='own_loan'},
    {id:'loanYrs',l:'返済の残り年数',u:'年',show:V=>V.house==='own_loan'}]},
   {g:'生活費と、今ある備え',f:[
    {id:'live',l:'今の生活費（住居費・教育費・保険料を除く）',u:'万円/月',h:'食費・光熱費・通信費・日用品・お小遣いなど'},
    {id:'r1',l:'亡くなったあとの生活費（子どもが独立するまで）',u:'%',h:'今の生活費に対する割合。一般に約7割が目安'},
    {id:'r2',l:'亡くなったあとの生活費（子どもの独立後・子どもがいない場合）',u:'%',h:'一般に約5割が目安'},
    {id:'funeral',l:'葬儀・お墓など',u:'万円'},
    {id:'extra',l:'ほかに備えておきたいお金',u:'万円',h:'子どもの結婚・住宅の援助、車の買い替えなど。なければ0'},
    {id:'keep',l:'いつも手元に残しておきたいお金',u:'万円',h:'急な出費に備える分。この額を下回らないように必要保障額を出します'},
    {id:'assets',l:'今の預貯金・投資',u:'万円',h:'NISA・iDeCoなども含めた金融資産'},
    {id:'saveY',l:'毎年ふえる貯蓄（今の家計のまま）',u:'万円/年',h:'「1年後・2年後に亡くなった場合」の計算に使います'},
    {id:'until',l:'計算する期間（残る人が何歳まで）',u:'歳',h:'90歳か95歳が目安'}]}
  ],
  fix(V){if(!V.edu)V.edu='pubpri'},
  calc:V=>hsCalc(V),
  result(V,R){
    const one=(r,label,cover)=>{const gap=r.need-cover;return `<section class="panel"><div class="ph"><span class="nm">${esc(label)}が亡くなった場合</span><span class="chip ${gap>0?'bad':'good'}">${r.need===0?'今の備えで足りる計算':gap>0?'今の保険では不足':'今の保険で足りる'}</span></div>
      <div class="kv">${kvRow('必要保障額の目安',fmt(r.need)+'<small>万円</small>')}${kvRow('今の死亡保険金',fmt(cover)+'<small>万円</small>')}${kvRow(gap>0?'不足する額':'上回っている額',fmt(Math.abs(gap))+'<small>万円</small>',gap>0)}${kvRow('遺族年金（今年の年額）',(Math.round(r.rows[0].izoku*10)/10).toLocaleString('ja-JP')+'<small>万円</small>')}</div></section>`};
    const tl=r=>{const L=hsTimeline(r);return `<table class="cf hs"><tbody><tr class="hd"><th>時期（残る人の年齢）</th><td>遺族年金（年額）</td><td>内訳</td></tr>${L.map(g=>{const x=g.x,parts=[x.izB?'遺族基礎年金'+(x.elig?'（子'+x.elig+'人分の加算込み）':''):'',x.cont?'遺族厚生年金（継続給付）':x.izK?'遺族厚生年金':'',x.chu?'中高齢寡婦加算':'',x.kafu?'寡婦年金':''].filter(Boolean);
      return `<tr><th>${g.from.y}〜${g.to.y}年（${g.from.a}〜${g.to.a}歳）</th><td>${g.v?fmt1(g.v)+'万円':'なし'}</td><td style="text-align:left">${parts.join('＋')||(g.from.a>=65?'自分の年金のみ':'—')}</td></tr>`}).join('')}</tbody></table>`};
    const fmt1=v=>(Math.round(v*10)/10).toLocaleString('ja-JP');
    const flow=r=>`<table class="cf hs"><tbody>
      <tr class="sec"><th>これから必要なお金</th><td></td></tr><tr><th>生活費</th><td>${fmt(r.T.live)}万円</td></tr><tr><th>住居費</th><td>${fmt(r.T.house)}万円</td></tr><tr><th>教育費</th><td>${fmt(r.T.edu)}万円</td></tr><tr><th>葬儀・そのほか</th><td>${fmt(r.T.one)}万円</td></tr>
      <tr class="sec"><th>入ってくるお金</th><td></td></tr><tr><th>残る人の収入（手取り）</th><td>${fmt(r.T.work)}万円</td></tr><tr><th>遺族年金</th><td>${fmt(r.T.izoku)}万円</td></tr><tr><th>残る人の年金（65歳から）</th><td>${fmt(r.T.own)}万円</td></tr><tr><th>児童手当</th><td>${fmt(r.T.al)}万円</td></tr><tr><th>死亡退職金など</th><td>${fmt(r.T.sev)}万円</td></tr>
      <tr class="sec"><th>今ある預貯金・投資</th><td>${fmt(r.start0)}万円</td></tr>
      <tr class="tot"><th>いちばん少なくなる時（${r.minA}歳）の残高</th><td>${r.min<0?'▲':''}${fmt(Math.abs(Math.round(r.min)))}万円</td></tr></tbody></table>`;
    const detail=(r,label,id,open)=>`<details class="grp hsd"${open?' open':''}><summary>${esc(label)}が亡くなった場合の内訳</summary><div class="body">
      <h3 class="hs3">遺族年金の目安（時期ごと）</h3>${tl(r)}
      ${r.newRule&&r.mult>1?`<p class="unit">2028年4月からの見直しで、子どもが独立したあとの遺族厚生年金は<b>${r.ys}〜${r.end-1}年の5年間</b>は加算で約1.3倍、その後65歳までは残る人の収入に応じた継続給付になる計算です（収入が多いと減ったり止まったりします）。65歳からは遺族厚生年金のかわりに、死亡分割で自分の厚生年金が年約${(Math.round(r.split*10)/10).toLocaleString('ja-JP')}万円ふえる目安で計算しています。</p>`:''}
      <h3 class="hs3">お金の出入り（${r.rows[0].a}歳〜${r.rows[r.rows.length-1].a}歳の合計）</h3>${flow(r)}
      <h3 class="hs3">保険がない場合の、預貯金の推移</h3>${chartSVG([{rows:r.rows,color:'var(--brand)'}],null,'hsc_'+id)}
      <p class="unit">横軸は残る人の年齢。0を下回るところが「足りなくなる」時期です。手元に${fmt(n(V.keep))}万円を残す前提で、いちばん下の点から必要保障額を出しています。</p></div></details>`;
    const A=R.A,B=R.B,na=A.p.label,nb=B.p.label;
    const kidsTxt=A.kids.length?`末子が18歳になる年度まで（${Math.max(...A.kids)+18}年まで）は遺族基礎年金が出ます。`:'子どもがいないため、遺族基礎年金は出ない計算です。';
    return `<h2>計算結果</h2><p class="unit">入力するたびに自動で更新されます（単位：万円・今の物価で計算）。</p>
     <div class="panels">${one(A,na,A.p.d.cover)}${one(B,nb,B.p.d.cover)}</div>
     <section class="advice"><h3>入力した条件で計算すると</h3><ul>
      <li>${esc(na)}が今亡くなった場合、残された家族のお金は<b>${A.minA}歳ごろ</b>にいちばん少なくなり、手元に${fmt(n(V.keep))}万円を残すには<b>約${fmt(A.need)}万円</b>の備えが必要な計算です。${kidsTxt}</li>
      <li>${esc(nb)}が今亡くなった場合の必要保障額は<b>約${fmt(B.need)}万円</b>です。収入の少ない人でも、亡くなると家事・育児の外部サービス代などがかかることがあります。必要なら生活費の割合を上げて確かめてください。</li>
      <li>必要保障額は、子どもが大きくなるほど<b>年々減っていきます</b>（下のグラフ）。今の金額をずっと備え続ける必要はありません。</li>
      ${V.house==='own_dan'?'<li>住宅ローンは団信で0になる前提です。団信に入っていない・夫婦の片方だけが契約者の場合は、住まいを「団信なし」にして確かめてください。</li>':''}</ul></section>
     <section class="chartcard"><div class="legend"><b style="color:var(--ink);font-size:14px">必要保障額の推移（亡くなる年ごと）</b><span><span class="dot a"></span>${esc(na)}</span><span><span class="dot b"></span>${esc(nb)}</span></div>
      ${chartSVG([{rows:R.trA,color:PCOL.A},{rows:R.trB,color:PCOL.B,dash:PDASH.B}],null,'hstr')}
      <p class="unit" style="margin:6px 0 0">横軸は、その年に亡くなった場合の本人・配偶者の年齢です。毎年${fmt(n(V.saveY))}万円ずつ貯蓄がふえ、子どもが大きくなるにつれて必要な額が減っていきます。${CFG.izoku.reform}年4月より後に亡くなった場合は、見直し後の遺族年金で計算するため、グラフに段差が出ることがあります。</p></section>
     ${detail(A,na,'a',true)}${detail(B,nb,'b',false)}
     ${ctaHTML()}
     <div class="taxnote">遺族年金は令和8年度の額で計算した<b>目安</b>です（遺族基礎年金 年84.73万円・子の加算・中高齢寡婦加算 年63.55万円、遺族厚生年金は平均年収×5.481/1000×加入月数（300月未満は300月）×3/4）。2028年4月からの見直し（子のない配偶者の遺族厚生年金の原則5年の有期化と加算、中高齢寡婦加算の段階的な縮小、子の加算の引き上げ）は、亡くなる年に応じておおまかに反映しています（5年後の継続給付は、残る人の手取り年収から額面を見積もって、収入が多いほど減る形でおおまかに計算）。保険料の納付要件は満たしている前提です。正確な見込額は年金事務所や「ねんきんネット」で確かめてください。</div>`;
  },
  dock:(V,R)=>['必要保障額（'+R.A.p.label+'）',fmt(R.A.need)+' 万円'],
  related:['lifeplan','loan','souzokuzei']
};
GDEF.hoshou=HSDEF;
/* ライフプラン診断の入力を引き継ぐ（パターンAなど、選んでいるパターン） */
HSDEF.fromLP=function(V,S){
  const wk=w=>w==='self'||w==='none'?'self':(w==='part'||w==='dep'||w==='house')?'dep':'emp';
  V.age=Math.round(n(S.age));V.inc=n(S.inc);V.workEnd=n(S.workEnd)||65;V.pen=n(S.pen);V.job=wk(S.wwork||'emp');V.gavg=Math.round(toGross(S.inc)*0.85);V.yrs=Math.max(1,Math.round(n(S.age))-22);
  if(S.spouse==='yes'){V.sage=Math.round(n(S.sage));V.sinc=n(S.sinc);V.sworkEnd=n(S.sworkEnd)||60;V.spen=n(S.spen);V.sjob=S.swwork?wk(S.swwork):(n(S.sinc)>=130?'emp':'dep');V.sgavg=V.sjob==='emp'?Math.round(toGross(S.sinc)*0.85):0;V.syrs=V.sjob==='dep'?0:Math.max(1,Math.round(n(S.sage))-22)}
  const ks=(S.kids||[]).slice(0,3);V.kid1=ks[0]?n(ks[0].by):'';V.kid2=ks[1]?n(ks[1].by):'';V.kid3=ks[2]?n(ks[2].by):'';
  if(ks[0]){const k=ks[0];V.edu=k.uni==='none'?'hs':(k.sch==='pri_jh'||k.sch==='pri_all')?'prijh':/^pri/.test(k.uni||'')?'pubpri':'pub'}
  if(S.house==='rent'&&!(planBuy(S)&&n(S.buyAge)<=n(S.age))){V.house='rent';V.rent=n(S.rent)}else{V.house=(S.house==='own'&&!(n(S.loanPay)>0))?'own_paid':'own_dan';V.hcost=n(S.hcost)||15}
  V.live=n(S.live);
  const A=S.assets||{};V.assets=Math.round(['cash','nisa','tax','ideco','kyosai'].reduce((s,k)=>s+Math.max(0,n(A[k]&&A[k].bal)),0)+(A.others||[]).reduce((s,o)=>s+Math.max(0,n(o.bal)),0));
  try{const r=sim(clone(S));V.saveY=Math.max(0,Math.round(r.slice(0,5).reduce((s,x)=>s+x.net,0)/5))}catch(e){}
};
SHARE.hoshou={get:()=>gtState(HSDEF),set:d=>{GT.hoshou=d}};
