/* ---------- 共通：入力フォーム型ツール ---------- */
const GT={};
function gtState(def){
  if(GT[def.id]) return GT[def.id];
  let v=null;try{const s=localStorage.getItem('sainomado-'+def.id+'-v1');if(s)v=JSON.parse(s)}catch(e){}
  if(!v) v=Object.assign(def.base(),{example:true});
  if(def.fix) def.fix(v);
  GT[def.id]=v;return v;
}
function gtSave(def){if(window.__shared)return;try{localStorage.setItem('sainomado-'+def.id+'-v1',JSON.stringify(GT[def.id]))}catch(e){}}
function gtField(def,f,V){
  const v=V[f.id], hint=f.h?`<span class="hint">${esc(f.h)}</span>`:'';
  const at=`id="g_${def.id}_${f.id}" data-gt="${def.id}" data-gk="${f.id}"`;
  if(f.type==='sel') return `<label class="fld" data-gf="${def.id}_${f.id}"><span class="lab">${esc(f.l)}</span><select ${at}>${f.o.map(o=>`<option value="${o[0]}"${v===o[0]?' selected':''}>${esc(o[1])}</option>`).join('')}</select>${hint}</label>`;
  return `<label class="fld" data-gf="${def.id}_${f.id}"><span class="lab">${esc(f.l)}</span><span class="inp"><input ${at} type="number" inputmode="decimal" step="${f.st||1}" value="${esc(v)}"><span class="u">${f.u}</span></span>${hint}</label>`;
}
function gtVis(def){const V=gtState(def);def.groups.flatMap(g=>g.f).forEach(f=>{if(f.show){const el=document.querySelector(`[data-gf="${def.id}_${f.id}"]`);if(el)el.hidden=!f.show(V)}})}
function vGen(def,v){
  const V=gtState(def);
  v.innerHTML=`<div class="wrap"><div class="crumb"><a href="#home">サイのまど</a> › ${esc(def.title)}</div>
  <div class="thead"><h1>${esc(def.title)}</h1><p>${def.lead}</p>
   <div class="safe">✓ 入力内容はこの端末の中だけに保存され、どこにも送信されません</div>
   <p class="unit exnote" style="margin-top:8px"${V.example?'':' hidden'}>いまは入力例（${def.example}）が入っています。ご自分の数字に書き換えてください。</p><p class="resetrow" style="margin:8px 0 0"${V.example?' hidden':''}><button class="btn small ghost" data-act="gtreset" data-id="${def.id}">入力例に戻す</button></p></div>
  <div class="formgrid">${def.groups.map(g=>`<details class="grp" open><summary>${g.g}${g.s?`<small>${g.s}</small>`:''}</summary><div class="body"><div class="fields">${g.f.map(f=>gtField(def,f,V)).join('')}</div></div></details>`).join('')}</div>
  <section class="result" id="gresult"></section></div>`;
  gtVis(def); gtRender(def);
}
function gtRender(def){
  const box=document.getElementById('gresult'); if(!box) return;
  const V=gtState(def), R=def.calc(V);
  box.innerHTML=`<div class="exportbar" style="justify-content:flex-end">${shareBtn()}</div>`+def.result(V,R)+`<div class="sect" style="padding-bottom:0"><h3 style="font-size:16px;margin-bottom:10px">あわせて使いたいツール</h3><div class="tools">${def.related.map(id=>toolCard(TOOLS.find(t=>t.href==='#'+id))).join('')}</div></div>`;
  const d=document.getElementById('dockin'); if(d&&def.dock){const k=def.dock(V,R);d.innerHTML=`<div class="v"><span>${k[0]}<b class="${k[2]?'neg':''}">${k[1]}</b></span></div><button class="btn primary" data-act="togresult">結果を見る</button>`}
}
let gT=0;
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset.gt)return;const def=GDEF[t.dataset.gt];const V=gtState(def);const f=def.groups.flatMap(g=>g.f).find(x=>x.id===t.dataset.gk);
  V[t.dataset.gk]=f&&f.type==='sel'?t.value:(t.value===''?'':parseFloat(t.value));V.example=false;if(def.onChange)def.onChange(V,t.dataset.gk);if(def.id==='loan'&&t.dataset.gk==='rate'&&V.rtype!=='custom'){V.rtype='custom';const sl=document.getElementById('g_loan_rtype');if(sl)sl.value='custom'}exShown(false);gtVis(def);gtSave(def);clearTimeout(gT);gT=setTimeout(()=>gtRender(def),250)});
/* 入力例に戻す（直前の入力は「元に戻す」で戻せる） */
let gtPrev=null;
function exShown(ex){const a=document.querySelector('.exnote'),b=document.querySelector('.resetrow');if(a)a.hidden=!ex;if(b)b.hidden=ex}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,v=document.getElementById('view');
  if(a==='gtreset'){const def=GDEF[b.dataset.id];if(!def)return;gtPrev={id:def.id,V:clone(gtState(def))};GT[def.id]=Object.assign(def.base(),{example:true});gtSave(def);vGen(def,v);toastAct('入力例に戻しました','元に戻す','gtundo')}
  else if(a==='gtundo'&&gtPrev){const def=GDEF[gtPrev.id];GT[def.id]=gtPrev.V;gtPrev=null;gtSave(def);document.getElementById('toast').hidden=true;vGen(def,v);toast('元の入力に戻しました')}
  else if(a==='svreset'){svPrev=clone(SV);SV=sellBase();saveSV();vSell(v);toastAct('入力例に戻しました','元に戻す','svundo')}
  else if(a==='svundo'&&svPrev){SV=svPrev;svPrev=null;saveSV();document.getElementById('toast').hidden=true;vSell(v);toast('元の入力に戻しました')}
});
let svPrev=null;
document.addEventListener('click',e=>{if(e.target.closest('[data-act="togresult"]'))document.getElementById('gresult').scrollIntoView({behavior:'smooth'})});
const man=v=>fmt(v)+'<small>万円</small>';
const kvRow=(l,v,neg)=>`<span>${l}</span><b class="${neg?'neg':''}">${v}</b>`;
function bars(items,unit){
  const mx=Math.max(1,...items.map(x=>Math.abs(x.v)));
  return `<div class="bars">${items.map(x=>{const w=Math.abs(x.v)/mx*100;return `<div class="bar"><span>${esc(x.l)}</span><span class="tr"><i style="left:0;width:${w.toFixed(1)}%;background:${x.v<0?'var(--bad)':x.c||'var(--accent)'};opacity:${x.v<0?.55:1}"></i></span><b class="${x.v<0?'neg':''}">${fmt(x.v)}<small class="unit"> ${unit}</small></b></div>`}).join('')}</div>`;
}

/* ---------- 住宅ローン・購入予算診断 ---------- */
const LOANDEF={id:'loan',title:'住宅ローン・購入予算診断',example:'世帯年収600万円・頭金300万円・35歳',
  lead:'年収と毎月の返済から、無理なく返せる借入額と、金融機関の審査で借りられる上限の目安、そこから考えた物件価格の目安を出します。金利が上がった場合の返済額も確かめられます。',
  base:()=>({income:600,other:0,age:35,down:300,costRate:7,rtype:'hendo',rate:CFG.loanRates.hendo,term:35,target:25,screen:CFG.screenRate}),
  fix:V=>{if(!V.rtype)V.rtype='custom'},
  onChange(V,k){if(k==='rtype'&&V.rtype!=='custom'){V.rate=CFG.loanRates[V.rtype];const el=document.getElementById('g_loan_rate');if(el)el.value=V.rate}},
  groups:[
   {g:'収入と今の借入',f:[
    {id:'income',l:'世帯の年収（額面）',u:'万円',h:'ペアローン・収入合算をする場合は合計'},
    {id:'other',l:'ほかのローンの返済',u:'万円/月',h:'車・カード・奨学金など'},
    {id:'age',l:'借りる人の年齢',u:'歳',h:'完済時80歳までで返済期間を調整します'}]},
   {g:'買い方',f:[
    {id:'down',l:'頭金（預貯金から出す額）',u:'万円'},
    {id:'costRate',l:'諸費用',u:'%',st:.5,h:'物件価格に対する割合。新築マンション3〜5%、中古・戸建て6〜9%が目安'},
    {id:'rtype',l:'金利のタイプ',type:'sel',o:[['hendo','変動金利'],['kotei10','10年固定'],['flat','全期間固定（フラット35など）'],['custom','自分で入れる']],h:`選ぶと、${CFG.loanRates.asOf}ごろの水準の目安（変動${CFG.loanRates.hendo}%・10年固定${CFG.loanRates.kotei10}%・全期間固定${CFG.loanRates.flat}%）が入ります。実際の金利は金融機関や審査で変わります`},
    {id:'rate',l:'借入金利',u:'%',st:.01,h:'ここを直すと「自分で入れる」になります'},
    {id:'term',l:'返済期間',u:'年'}]},
   {g:'判断の基準',s:'一般的な目安を初期値にしています',f:[
    {id:'target',l:'無理のない返済負担率',u:'%',h:'手取りで暮らしを考えるなら20〜25%がよく使われる目安'},
    {id:'screen',l:'審査で使われる金利',u:'%',st:.1,h:'銀行の審査では、実際の金利より高い3〜4%程度で計算されることが多い'}]}
  ],
  calc(V){
    const term=Math.max(1,Math.min(n(V.term),80-n(V.age)));
    const lim=n(V.income)>=400?35:30;
    const mOk=Math.max(0,n(V.income)*n(V.target)/100/12-n(V.other));
    const mMax=Math.max(0,n(V.income)*lim/100/12-n(V.other));
    const ok=pv(mOk,V.rate,term), max=pv(mMax,V.screen,term);
    const price=b=>(b+n(V.down))/(1+n(V.costRate)/100);
    const scen=[0,1,2].map(d=>({d,m:pmt(ok,n(V.rate)+d,term)}));
    return{term,lim,mOk,ok,max,priceOk:price(ok),priceMax:price(max),scen};
  },
  result(V,R){
    return `<h2>診断結果</h2><p class="unit">入力するたびに自動で更新されます（単位：万円）。</p>
    <div class="panels">
     <section class="panel"><div class="ph"><span class="nm">無理なく返せる目安</span><span class="chip good">返済負担率${n(V.target)}%</span></div>
      <div class="kv">${kvRow('借入額',man(R.ok))}${kvRow('物件価格の目安',man(R.priceOk))}${kvRow('毎月の返済',(Math.round(R.mOk*10)/10).toLocaleString('ja-JP')+'<small>万円</small>')}</div></section>
     <section class="panel"><div class="ph"><span class="nm">審査で借りられる上限の目安</span><span class="chip warn">返済負担率${R.lim}%</span></div>
      <div class="kv">${kvRow('借入額',man(R.max))}${kvRow('物件価格の目安',man(R.priceMax))}${kvRow('審査金利',n(V.screen)+'<small>%</small>')}</div></section>
    </div>
    <section class="advice"><h3>入力した条件で計算すると</h3><ul>
     ${V.rtype==='hendo'?'<li><b>変動金利</b>は、借りたあとに金利が上がると返済額が増えます。下の「金利が上がった場合」の返済額も確かめておきましょう。</li>':V.rtype==='kotei10'?'<li><b>10年固定</b>は、11年目以降の金利がそのときの水準で決め直されます。ここでは完済まで同じ金利で計算しています。</li>':V.rtype==='flat'?'<li><b>全期間固定</b>は、完済まで金利が変わらないので、返済額が増える心配はありません。そのぶん、変動金利より金利が高めです。</li>':''}
     <li>無理なく返せる借入額は約${fmt(R.ok)}万円、頭金と諸費用を考えた物件価格の目安は約${fmt(R.priceOk)}万円です。</li>
     <li>審査では約${fmt(R.max)}万円まで借りられる可能性がありますが、「借りられる額」と「返せる額」は違います。差は${fmt(R.max-R.ok)}万円です。</li>
     ${R.term<n(V.term)?`<li>完済時80歳までとすると、返済期間は${R.term}年になります。</li>`:''}
     <li>変動金利の場合、金利が1%上がると毎月の返済は約${(Math.round((R.scen[1].m-R.scen[0].m)*10)/10).toLocaleString('ja-JP')}万円増えます（下の表）。</li></ul></section>${bridgeHTML('この予算で買うと、家計はどうなる？',`物件価格の目安（約${fmt(R.priceOk)}万円）で家を買うパターンを、ライフプラン診断に入れて、教育費や老後まで続けて確かめられます。`,'loan2lp')}${ctaHTML()}
    <div class="cfhead"><h3>金利が上がった場合の毎月の返済（無理のない借入額の場合）</h3></div>
    <div class="cfwrap"><table class="cf"><tbody><tr class="hd"><th>金利</th><td>毎月の返済</td><td>年間の返済</td><td>返済負担率</td></tr>
     ${R.scen.map(s=>`<tr${s.d===0?' class="tot"':''}><th>${(n(V.rate)+s.d).toFixed(2)}%${s.d?'（＋'+s.d+'%）':'（今の金利）'}</th><td>${(Math.round(s.m*10)/10).toLocaleString('ja-JP')}万円</td><td>${fmt(s.m*12)}万円</td><td>${n(V.income)?((s.m*12+n(V.other)*12)/n(V.income)*100).toFixed(1):'–'}%</td></tr>`).join('')}
    </tbody></table></div>
    <p class="unit">元利均等返済、ボーナス返済なしで計算しています。金利上昇は借りた時点から上がった場合の比較で、実際の変動金利には5年ルール・125%ルールなどがある商品もあります。返済負担率は年収（額面）に対する年間返済額の割合で、審査基準は金融機関によって異なります。</p>`;
  },
  dock:(V,R)=>['無理のない物件価格',fmt(R.priceOk)+' 万円'],
  related:['lifeplan','vs']
};

/* ---------- 相続した家・空き家の診断 ---------- */
const AKIYADEF={id:'akiya',title:'相続した家・空き家の診断',example:'築45年の木造住宅・今売ると900万円',
  lead:'相続した家を「そのまま持つ」「貸す」「そのまま売る」「解体して土地で売る」の4つで、決めた期間のお金の出入りを比べます。',
  base:()=>({sell:900,land:1000,demolish:180,tax:8,keep:15,rent:6,reform:150,vacancy:15,mgmt:10,years:10,repair:10}),
  groups:[
   {g:'売る場合',f:[
    {id:'sell',l:'建物つきで売った場合の価格',u:'万円',h:'査定額や近くの売り出し価格が目安'},
    {id:'land',l:'更地にした場合の土地の価格',u:'万円'},
    {id:'demolish',l:'解体費',u:'万円',h:'木造なら坪4〜6万円程度が目安。延床30坪で120〜180万円'}]},
   {g:'持ち続ける場合',f:[
    {id:'tax',l:'固定資産税・都市計画税',u:'万円/年',h:'毎年届く納税通知書で確認できます'},
    {id:'keep',l:'管理費・保険・草刈り・光熱費など',u:'万円/年'}]},

   {g:'貸す場合',f:[
    {id:'rent',l:'家賃',u:'万円/月'},
    {id:'reform',l:'貸す前のリフォーム費',u:'万円'},
    {id:'vacancy',l:'空室の割合',u:'%'},
    {id:'mgmt',l:'管理委託料',u:'%',h:'家賃に対する割合'},
    {id:'repair',l:'貸している間の修繕費',u:'万円/年'}]},
   {g:'比べる期間',f:[{id:'years',l:'何年分で比べるか',u:'年'}]}
  ],
  calc(V){
    const N=Math.max(1,n(V.years));
    const hold=-(n(V.tax)+n(V.keep))*N;
    const rentIn=n(V.rent)*12*(1-n(V.vacancy)/100)*(1-n(V.mgmt)/100);
    const lend=(rentIn-n(V.tax)-n(V.keep)*0.3-n(V.repair))*N-n(V.reform);
    const sellNet=n(V.sell)-brokerFee(n(V.sell))-stampTax(n(V.sell))-5;
    const landNet=n(V.land)-n(V.demolish)-brokerFee(n(V.land))-stampTax(n(V.land))-5;
    const items=[
      {k:'hold',l:'空き家のまま持つ',v:hold,c:'var(--muted)'},
      {k:'lend',l:'貸す',v:lend,c:'var(--planC)'},
      {k:'sell',l:'建物つきで売る',v:sellNet,c:'var(--accent)'},
      {k:'land',l:'解体して土地で売る',v:landNet,c:'var(--coin)'}];
    return{N,hold,rentIn,lend,sellNet,landNet,items};
  },
  result(V,R){
    const best=R.items.slice().sort((a,b)=>b.v-a.v)[0];
    return `<h2>診断結果</h2><p class="unit">${R.N}年間のお金の出入りの合計です（単位：万円）。売る場合は、売ったときの手取りです。</p>
    <section class="chartcard">${bars(R.items,'万円')}</section>
    <section class="advice"><h3>入力した条件で計算すると</h3><ul>
     <li>${R.N}年間の数字だけで比べると、いちばん多く残るのは「${best.l}」（${fmt(best.v)}万円）です。</li>
     <li>空き家のまま持つと、${R.N}年間で約${fmt(-R.hold)}万円の持ち出しになる計算です。その間に建物は傷み、売れる価格も下がっていくことが多いです。</li>
     <li>貸す場合、家賃の手取りは年約${fmt(R.rentIn)}万円です。リフォーム費を回収できるまでの年数や、借り手が見つかるかも確かめておきましょう。</li>
     <li>解体すると土地は売りやすくなりますが、更地のまま持ち続けると固定資産税が上がることがあります。売るまでの期間を考えて決めるのが安心です。</li></ul></section>${bridgeHTML('売った手取りを、老後の家計に入れると？',`建物つきで売った場合の手取り（約${fmt(R.sellNet)}万円）を、ライフプラン診断の老後資金に足して、95歳まで比べられます。`,'akiya2lp')}${ctaHTML()}
    <details class="grp" style="margin-top:14px" open><summary>知っておきたい制度<small>一般的な説明です</small></summary><div class="body reqs">
     <p><b>相続登記の義務化</b>：2024年4月から、相続で家や土地を取得したことを知った日から3年以内に相続登記をすることが義務になりました。正当な理由なく怠ると、10万円以下の過料の対象になります。それ以前の相続も対象です。</p>
     <p><b>管理が不十分な空き家</b>：2023年の法改正で、放置すると「特定空家」になるおそれがある空き家も「管理不全空家」として指導・勧告の対象になりました。勧告を受けると、土地の固定資産税を下げる住宅用地の特例が外れます。</p>
     <p><b>相続した空き家を売ったときの特例</b>：昭和56年5月31日以前に建てられた家を相続し、一定の要件を満たして売ると、売却益から最高3,000万円（相続人が3人以上の場合は2,000万円）を差し引ける特例があります。${jd(CFG.akiyaUntil)}までの売却が対象で、相続から3年後の年末までに売るなどの要件があります。使えるかどうかは税務署や税理士にご確認ください。</p>
    </div></details>
    ${expNote('akiyaUntil','相続空き家の特例')}<div class="taxnote">この診断は、入力した金額をもとにした単純な比較です。売ったときの税金、家の価値の変化、貸したときの所得税は含めていません。当サイトでは個別の税務相談にはお答えしていません。</div>`;
  },
  dock:(V,R)=>{const b=R.items.slice().sort((a,c)=>c.v-a.v)[0];return['いちばん多く残るのは',b.l]},
  related:['sell','souzoku']
};

/* ---------- 賃貸vs持ち家 ---------- */
const VSDEF={id:'vs',title:'賃貸vs持ち家 比べる診断',example:'35歳・家賃9万円と、3,500万円の戸建て',
  lead:'今の年齢から決めた年齢までに払う住居費の合計を、賃貸と購入で比べます。購入の場合は、最後に残る家の価値も差し引いて比べます。',
  base:()=>({age:35,end:85,rent:9,renew:1,rentUp:0.3,price:3500,down:300,costRate:7,rate:CFG.loanRates.hendo,term:35,type:'house',upkeep:2,ptax:12,remain:25}),
  groups:[
   {g:'比べる期間',f:[{id:'age',l:'今の年齢',u:'歳'},{id:'end',l:'比べる年齢',u:'歳'}]},
   {g:'賃貸',f:[
    {id:'rent',l:'家賃（管理費込み）',u:'万円/月'},
    {id:'renew',l:'更新料（2年ごと）',u:'か月分',st:.5},
    {id:'rentUp',l:'家賃の上がり方',u:'%/年',st:.1}]},
   {g:'購入',f:[
    {id:'type',l:'家の種類',type:'sel',o:[['house','戸建て'],['mansion','マンション']]},
    {id:'price',l:'物件価格',u:'万円'},
    {id:'down',l:'頭金',u:'万円'},
    {id:'costRate',l:'諸費用',u:'%',st:.5},
    {id:'rate',l:'金利',u:'%',st:.01},
    {id:'term',l:'返済期間',u:'年'},
    {id:'upkeep',l:'管理費・修繕積立金・修繕費',u:'万円/月',h:'マンションは管理費＋修繕積立金。戸建ては将来の修繕のための積立の目安（月1.5〜2.5万円）'},
    {id:'ptax',l:'固定資産税など',u:'万円/年'},
    {id:'remain',l:'比べる年齢での家の価値',u:'%',h:'物件価格に対する割合。戸建ては土地の分、マンションは立地しだい'}]}
  ],
  calc(V){
    const a0=Math.round(n(V.age)),a1=Math.max(a0+1,Math.round(n(V.end)));
    const loan=Math.max(0,n(V.price)-n(V.down)), m=pmt(loan,V.rate,V.term);
    let cr=0,cb=n(V.down)+n(V.price)*n(V.costRate)/100;const pts=[];let cross=null;
    for(let a=a0;a<a1;a++){
      const t=a-a0;
      const r=n(V.rent)*12*Math.pow(1+n(V.rentUp)/100,t)+((t%2===1)?n(V.rent)*n(V.renew)*Math.pow(1+n(V.rentUp)/100,t):0);
      cr+=r;
      cb+=(t<n(V.term)?m*12:0)+n(V.upkeep)*12+n(V.ptax);
      pts.push({a:a+1,cr,cb});
      if(cross==null&&cb<cr) cross=a+1;
    }
    const value=n(V.price)*n(V.remain)/100;
    return{a0,a1,m,cr,cb,value,net:cb-value,pts,cross};
  },
  result(V,R){
    const W=680,H=240,L=58,Rr=14,T=14,B=30,N=R.pts.length;
    const mx=Math.max(R.cr,R.cb);const tk=niceTicks(0,mx,5),y1=tk[tk.length-1];
    const X=i=>L+i*(W-L-Rr)/Math.max(1,N-1),Y=v=>T+(y1-v)*(H-T-B)/(y1||1);
    let g='';tk.forEach(v=>{g+=`<line x1="${L}" x2="${W-Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${v.toLocaleString('ja-JP')}</text>`});
    R.pts.forEach((p,i)=>{if(p.a%10===0)g+=`<text x="${X(i)}" y="${H-10}" text-anchor="middle">${p.a}歳</text>`});
    g+=`<polyline points="${R.pts.map((p,i)=>X(i).toFixed(1)+','+Y(p.cr).toFixed(1)).join(' ')}" fill="none" stroke="var(--planB)" stroke-width="2.4" stroke-dasharray="6 4"/>`;
    g+=`<polyline points="${R.pts.map((p,i)=>X(i).toFixed(1)+','+Y(p.cb).toFixed(1)).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.4"/>`;
    g+=`<text x="${L-8}" y="${T-2}" text-anchor="end" style="font-size:10px">万円</text>`;
    const diff=R.cr-R.net;
    return `<h2>診断結果</h2><p class="unit">${R.a0}歳から${R.a1}歳までの住居費の合計です（単位：万円）。</p>
    <div class="panels">
     <section class="panel"><div class="ph"><span class="dot b"></span><span class="nm">賃貸</span></div><div class="kv">${kvRow('住居費の合計',man(R.cr))}${kvRow('最初の家賃',n(V.rent)+'<small>万円/月</small>')}</div></section>
     <section class="panel"><div class="ph"><span class="dot a"></span><span class="nm">購入（${V.type==='mansion'?'マンション':'戸建て'}）</span></div><div class="kv">${kvRow('住居費の合計',man(R.cb))}${kvRow(R.a1+'歳での家の価値',man(R.value))}${kvRow('価値を引いた実質の負担',man(R.net))}${kvRow('毎月のローン返済',(Math.round(R.m*10)/10).toLocaleString('ja-JP')+'<small>万円</small>')}</div></section>
    </div>
    <section class="chartcard"><div class="legend"><b style="color:var(--ink);font-size:14px">住居費の合計の推移</b><span><span class="dot a"></span>購入</span><span><span class="dot b"></span>賃貸（点線）</span></div>${`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="住居費の合計の推移">${g}</svg>`}</section>
    <section class="advice"><h3>入力した条件で計算すると</h3><ul>
     <li>${R.a1}歳までの実質の負担は、${diff>=0?`購入のほうが約${fmt(diff)}万円少ない`:`賃貸のほうが約${fmt(-diff)}万円少ない`}計算です。</li>
     ${R.cross?`<li>払った住居費の合計は、${R.cross}歳ごろに購入が賃貸を下回ります。</li>`:'<li>比べた期間の中では、払った住居費の合計は購入のほうが多いままです。</li>'}
     <li>賃貸は住み替えやすく、修繕の負担がありません。購入はローン完済後の住居費が下がり、家が資産として残ります。老後に借りにくくなることも、賃貸を選ぶときに考えておきたい点です。</li></ul></section>${ctaHTML()}
    <p class="unit">頭金を運用した場合の利益、住宅ローン控除、家財・火災保険、賃貸の引越し費用は含めていません。家賃は毎年同じ割合で上がる前提です。</p>`;
  },
  dock:(V,R)=>{const d=R.cr-R.net;return[`住居費の合計は、${d>=0?'購入':'賃貸'}のほうが`,fmt(Math.abs(d))+' 万円少ない']},
  related:['loan','lifeplan']
};
const GDEF={loan:LOANDEF,akiya:AKIYADEF,vs:VSDEF};

