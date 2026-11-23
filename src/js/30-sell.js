/* ---------- 売却・住み替えシミュレーター ---------- */
const SKEY='sainomado-sell-v2';
function sellBase(){return{price:3200,loan:1800,buyYear:Y0-12,buyPrice:3800,bldPrice:1800,struct:'wood',tokurei:'3000',feeMode:'std',
  other:30,move:20,
  plan:'buy',newPrice:4200,newCostRate:7,cash:300,rate:CFG.loanRates.hendo,term:35,income:600,example:true}}
let SV=null;
try{const s=localStorage.getItem(SKEY);if(s)SV=JSON.parse(s)}catch(e){}
if(!SV||SV.price==null) SV=sellBase();
let svT=0;const saveSV=()=>{if(window.__shared)return;clearTimeout(svT);svT=setTimeout(()=>{try{localStorage.setItem(SKEY,JSON.stringify(SV))}catch(e){}},300)};

/* 構造ごとの非業務用の償却率（耐用年数×1.5年の旧定額法相当） */
const STRUCT={wood:['木造',0.031],light:['軽量鉄骨',0.025],steel:['鉄骨造',0.020],rc:['鉄筋コンクリート',0.015]};
const TK={'3000':'3,000万円特別控除（＋所有10年超なら軽減税率）',kaikae:'特定のマイホーム買い替え特例',none:'特例を使わない'};
function brokerFee(p,mode){ // 上限額・税込（10%）
  if(p<=0) return 0;
  if(mode==='low'&&p<=CFG.fee.lowMax) return CFG.fee.lowCap;
  let f=p>400?p*0.03+6:p>200?p*0.04+2:p*0.05;
  return f*(1+CFG.fee.tax);
}
function stampTax(p){ // 売買契約書の印紙税（軽減税率）単位：万円
  for(const [lim,v] of CFG.stamp){if(p<=lim)return v}
  return 0;
}
/* 税額の計算例（mode：'3000' / 'kaikae' / 'none'） */
function taxCalc(V,c,mode){
  const o={mode,ded:0,taxable:0,tax:0,rateLabel:'',deferred:0,kaikaeIncome:0,kaikaeExp:0,ok:true,why:''};
  const longRate=CFG.tax.long, shortRate=CFG.tax.short;
  if(mode==='kaikae'){
    if(V.plan!=='buy'){o.ok=false;o.why='住み替え先を買う場合だけ計算できます';}
    else if(c.years<=10){o.ok=false;o.why='所有期間が10年を超えている必要があります';}
    else if(c.p>10000){o.ok=false;o.why='売却価格が1億円以下である必要があります';}
    if(!o.ok){mode='none';o.mode='none';}
    else{
      const buy=n(V.newPrice);
      if(c.gain<=0){return o}
      if(buy>=c.p){o.deferred=c.gain;return o}
      o.kaikaeIncome=c.p-buy;
      o.kaikaeExp=(c.acq+c.costs)*o.kaikaeIncome/c.p;
      o.taxable=Math.max(0,o.kaikaeIncome-o.kaikaeExp);
      o.deferred=Math.max(0,c.gain-o.taxable);
      o.tax=o.taxable*longRate;o.rateLabel='長期譲渡';
      return o;
    }
  }
  if(mode==='3000') o.ded=CFG.tax.ded;
  o.taxable=Math.max(0,c.gain-o.ded);
  if(o.taxable>0){
    if(mode==='3000'&&c.years>10){const a=Math.min(o.taxable,CFG.tax.reducedCap);o.tax=a*CFG.tax.reduced+(o.taxable-a)*longRate;o.rateLabel='軽減税率'}
    else if(c.years>5){o.tax=o.taxable*longRate;o.rateLabel='長期譲渡'}
    else{o.tax=o.taxable*shortRate;o.rateLabel='短期譲渡'}
  }
  return o;
}
function sellCalc(V,priceOverride){
  const p=priceOverride!=null?priceOverride:n(V.price);
  const years=Math.max(0,Y0-Math.round(n(V.buyYear))); // 売った年の1月1日時点の所有期間の目安
  const st=STRUCT[V.struct]||STRUCT.wood;
  const bld=Math.min(n(V.bldPrice),n(V.buyPrice));
  const dep=Math.min(bld*0.9*st[1]*years,bld*0.95);
  let acq=n(V.buyPrice)-dep;
  const est=p*0.05; const usedEst=acq<est; if(usedEst) acq=est;
  const fee=brokerFee(p,V.feeMode), stamp=stampTax(p), release=n(V.loan)>0?2:0;
  const costs=fee+stamp+n(V.other);
  const gain=p-acq-costs;
  const c={p,years,dep,acq,usedEst,fee,stamp,release,other:n(V.other),move:n(V.move),costs,gain};
  c.t=taxCalc(V,c,V.tokurei||'3000');
  c.tax=c.t.tax;
  c.net=p-costs-release-c.tax-n(V.loan)-n(V.move);
  return c;
}
function pmt(P,ratePct,years){const i=n(ratePct)/100/12,N=Math.max(1,n(years)*12);if(P<=0)return 0;return i>0?P*i/(1-Math.pow(1+i,-N)):P/N}
function pv(M,ratePct,years){const i=n(ratePct)/100/12,N=Math.max(1,n(years)*12);if(M<=0)return 0;return i>0?M*(1-Math.pow(1+i,-N))/i:M*N}
function breakEven(V){ // 手取りがゼロになる売却価格
  let lo=0,hi=Math.max(n(V.loan)*2+2000,10000);
  for(let k=0;k<60;k++){const m=(lo+hi)/2;if(sellCalc(V,m).net<0)lo=m;else hi=m}
  return hi;
}
function moveCalc(V,s){
  if(V.plan!=='buy') return null;
  const need=n(V.newPrice)*(1+n(V.newCostRate)/100);
  const own=Math.max(0,s.net)+n(V.cash);
  const shortfall=s.net<0?-s.net:0;
  const borrow=Math.max(0,need-own)+shortfall;
  const m=pmt(borrow,V.rate,V.term);
  const ratio=n(V.income)>0?m*12/n(V.income)*100:0;
  return{need,own,shortfall,borrow,m,ratio,st:ratio<=25?['good','返済負担率25%以下']:ratio<=35?['warn','返済負担率25〜35%']:['bad','返済負担率35%超']};
}
const SF=[
 {g:'今の家',f:[
  {id:'price',l:'売れそうな価格',u:'万円',h:'査定額や近くの売り出し価格が目安'},
  {id:'loan',l:'住宅ローンの残り',u:'万円',h:'返済予定表で確認できます。なければ0'},
  {id:'feeMode',l:'仲介手数料の計算',type:'sel',o:[['std','通常の上限で計算'],['low','800万円以下の特例で計算（上限33万円）']],h:'800万円以下の家は、事前に説明・合意があれば上限が33万円（税込）になる特例があります',show:V=>n(V.price)<=CFG.fee.lowMax},
 ]},
 {g:'買ったときのこと',closed:1,s:'税金の計算例に使います。わかる範囲で（開いて入力）',f:[
  {id:'buyYear',l:'買った年',u:'年'},
  {id:'buyPrice',l:'買った価格（土地＋建物）',u:'万円',h:'分からない場合は0。売却価格の5%で計算します'},
  {id:'bldPrice',l:'うち建物の価格',u:'万円',h:'契約書に内訳がなければ、戸建てなら半分程度が目安'},
  {id:'struct',l:'建物の構造',type:'sel',o:Object.entries(STRUCT).map(([k,v])=>[k,v[0]])},
  {id:'tokurei',l:'計算に使う特例',type:'sel',o:Object.entries(TK),h:'使えるかどうかは要件によります。下の「特例の主な要件」で確認してください'},
 ]},
 {g:'売るときにかかるお金',s:'仲介手数料・印紙代・抵当権の抹消費用は自動で計算します',f:[
  {id:'other',l:'その他の費用',u:'万円',h:'測量・解体・片付け・リフォームなど'},
  {id:'move',l:'引越し・仮住まい',u:'万円'},
 ]},
 {g:'住み替え先',f:[
  {id:'plan',l:'売ったあと',type:'sel',o:[['buy','家を買い替える'],['none','買い替えない（賃貸・実家など）']]},
  {id:'newPrice',l:'次の家の価格',u:'万円',show:V=>V.plan==='buy'},
  {id:'newCostRate',l:'次の家の諸費用',u:'%',st:.5,h:'新築マンションで3〜5%、中古や戸建てで6〜9%が目安',show:V=>V.plan==='buy'},
  {id:'cash',l:'預貯金から出す額',u:'万円',show:V=>V.plan==='buy'},
  {id:'rate',l:'新しいローンの金利',u:'%',st:.01,show:V=>V.plan==='buy'},
  {id:'term',l:'返済期間',u:'年',show:V=>V.plan==='buy'},
  {id:'income',l:'世帯の年収（額面）',u:'万円',show:V=>V.plan==='buy'},
 ]}
];
const SALL=SF.flatMap(g=>g.f);
function sField(f){
  const v=SV[f.id], hint=f.h?`<span class="hint">${esc(f.h)}</span>`:'';
  if(f.type==='sel') return `<label class="fld" data-sf="${f.id}"><span class="lab">${esc(f.l)}</span><select id="s_${f.id}" data-sk="${f.id}">${f.o.map(o=>`<option value="${o[0]}"${v===o[0]?' selected':''}>${esc(o[1])}</option>`).join('')}</select>${hint}</label>`;
  return `<label class="fld" data-sf="${f.id}"><span class="lab">${esc(f.l)}</span><span class="inp"><input id="s_${f.id}" data-sk="${f.id}" type="number" inputmode="decimal" step="${f.st||1}" value="${esc(v)}"><span class="u">${f.u}</span></span>${hint}</label>`;
}
function sVis(){SALL.forEach(f=>{if(f.show){const el=document.querySelector(`[data-sf="${f.id}"]`);if(el)el.hidden=!f.show(SV)}})}
const TAXNOTE='<div class="taxnote">税金はすべて一般的な計算方法による<b>計算例</b>です。特例が使えるかどうかの判断や実際の税額は、税理士または税務署にご確認ください。当サイトでは個別の税務相談にはお答えしていません。</div>';
function vSell(v){
  v.innerHTML=`<div class="wrap"><div class="crumb"><a href="#home">サイのまど</a> › 売却・住み替えシミュレーター</div>
  <div class="thead"><h1>売却・住み替えシミュレーター</h1><p>今の家を売ったら、手元にいくら残るか。ローンを返し切れるか。次の家を買うなら、いくら借りることになるか。売る前に確かめておきたい数字の目安をまとめて出します。</p>
   <div class="safe">✓ 入力内容はこの端末の中だけに保存され、どこにも送信されません</div>
   <p class="unit exnote" style="margin-top:8px"${SV.example?'':' hidden'}>いまは入力例（築12年の木造戸建て・ローン残り1,800万円）が入っています。ご自分の数字に書き換えてください。</p><p class="resetrow" style="margin:8px 0 0"${SV.example?' hidden':''}><button class="btn small ghost" data-act="svreset">入力例に戻す</button></p></div>
  <div class="formgrid">${SF.map(g=>`<details class="grp"${g.closed?'':' open'}><summary>${g.g}${g.s?`<small>${g.s}</small>`:''}</summary><div class="body"><div class="fields">${g.f.map(sField).join('')}</div></div></details>`).join('')}</div>
  <section class="result" id="sresult"></section></div>`;
  sVis(); sRender(); sDock();
}
function sChart(V,s){
  const W=680,H=230,L=58,R=14,T=16,B=30;
  const p0=Math.max(100,s.p*0.6),p1=s.p*1.3,N=40,pts=[];
  for(let i=0;i<=N;i++){const p=p0+(p1-p0)*i/N;pts.push([p,sellCalc(V,p).net])}
  let lo=Math.min(0,...pts.map(x=>x[1])),hi=Math.max(0,...pts.map(x=>x[1]));
  const tk=niceTicks(lo,hi,4),y0=tk[0],y1=tk[tk.length-1];
  const X=p=>L+(p-p0)/(p1-p0)*(W-L-R),Y=v=>T+(y1-v)*(H-T-B)/((y1-y0)||1);
  let g='';
  tk.forEach(v=>{g+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="${v===0?1.6:1}"${v===0?'':' stroke-dasharray="2 3"'}/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${v<0?'▲':''}${Math.abs(v).toLocaleString('ja-JP')}</text>`});
  const xt=niceTicks(p0,p1,5).filter(v=>v>=p0&&v<=p1);
  xt.forEach(v=>{g+=`<text x="${X(v)}" y="${H-10}" text-anchor="middle">${v.toLocaleString('ja-JP')}</text>`});
  if(y0<0) g+=`<rect x="${L}" y="${Y(0)}" width="${W-L-R}" height="${Y(y0)-Y(0)}" fill="var(--bad)" fill-opacity=".06"/>`;
  g+=`<polyline points="${pts.map(x=>X(x[0]).toFixed(1)+','+Y(x[1]).toFixed(1)).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.4"/>`;
  const be=breakEven(V);
  if(be>p0&&be<p1) g+=`<line x1="${X(be)}" x2="${X(be)}" y1="${T}" y2="${H-B}" stroke="var(--coin)" stroke-dasharray="4 3"/><text x="${X(be)+4}" y="${T+10}" style="fill:var(--coin)">完済ライン ${Math.round(be).toLocaleString('ja-JP')}</text>`;
  g+=`<circle cx="${X(s.p)}" cy="${Y(s.net)}" r="5" fill="var(--surface)" stroke="var(--accent)" stroke-width="2.6"/>`;
  g+=`<text x="${L-8}" y="${T-4}" text-anchor="end" style="font-size:10px">万円</text><text x="${W-R}" y="${H-B-6}" text-anchor="end" style="font-size:10px">売却価格（万円）→</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="売却価格と手取り額の関係">${g}</svg>`;
}
function sRender(){
  const box=document.getElementById('sresult'); if(!box) return;
  const s=sellCalc(SV), mv=moveCalc(SV,s), be=breakEven(SV), t=s.t;
  const st=s.net>=0?['good','ローンを返し切れる']:['bad','ローンが残る'];
  const row=(l,v,cls='')=>`<tr class="${cls}"><th>${l}</th><td class="${v<-0.5?'neg':''}">${fmt(v)}</td></tr>`;
  const alt=['3000','kaikae','none'].map(m=>{const x=taxCalc(SV,s,m);return{m,x}});
  let taxRows='';
  if(t.mode==='kaikae'&&t.ok){
    taxRows=SV.plan==='buy'&&n(SV.newPrice)>=s.p
      ?row('税金の計算例（買い替え特例・課税の繰延べ）',-t.tax)+row('繰り延べられる利益',t.deferred)
      :row('課税される収入（売却価格−次の家の価格）',t.kaikaeIncome)+row('対応する取得費・費用',-t.kaikaeExp)+row('課税される利益',t.taxable)+row('税金の計算例（'+t.rateLabel+'）',-t.tax)+row('繰り延べられる利益',t.deferred);
  }else{
    taxRows=row('3,000万円特別控除',-Math.min(t.ded,Math.max(0,s.gain)))+row('課税される利益',t.taxable)+row('税金の計算例'+(t.rateLabel?'（'+t.rateLabel+'）':''),-t.tax);
  }
  box.innerHTML=`<div class="rhead"><h2>シミュレーション結果</h2><div class="exportbar">${shareBtn()}</div></div><p class="unit">入力するたびに自動で更新されます（単位：万円）。</p>
  <div class="panels">
   <section class="panel"><div class="ph"><span class="nm">売ったあとの手取り</span><span class="chip ${st[0]}">${st[1]}</span></div>
    <div class="kv"><span>手元に残るお金</span><b class="${s.net<0?'neg':''}">${fmt(s.net)}<small>万円</small></b>
    <span>ローンを返し切れる価格</span><b>${fmt(be)}<small>万円以上</small></b>
    <span>税金の計算例</span><b>${fmt(s.tax)}<small>万円</small></b></div></section>
   ${mv?`<section class="panel"><div class="ph"><span class="nm">住み替え後のローン</span><span class="chip ${mv.st[0]}">${mv.st[1]}</span></div>
    <div class="kv"><span>新しく借りる額</span><b>${fmt(mv.borrow)}<small>万円</small></b>
    <span>毎月の返済</span><b>${(Math.round(mv.m*10)/10).toLocaleString('ja-JP')}<small>万円</small></b>
    <span>返済負担率（年収に対する割合）</span><b class="${mv.ratio>35?'neg':''}">${mv.ratio.toFixed(1)}<small>%</small></b></div></section>`:''}
  </div>
  ${TAXNOTE}${expNote('stampUntil','印紙税の軽減措置')}${t.mode==='kaikae'?expNote('kaikaeUntil','買い替え特例'):''}
  <section class="chartcard"><div class="legend"><b style="color:var(--ink);font-size:14px">売却価格ごとの手取り</b><span><span class="dot a"></span>手取り額</span><span><span class="dot" style="background:var(--coin)"></span>ローンを返し切れる価格</span></div>
   ${sChart(SV,s)}<div class="unit">○が今の入力（${fmt(s.p)}万円）です。値下げしたときに、手取りがどれだけ減るかの目安になります。</div></section>
  <section class="advice"><h3>入力した条件で計算すると</h3><ul>${sAdvice(s,mv,be).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>
  ${bridgeHTML('この売却で、わが家の家計はどうなる？',`売ったあとの手取り（約${fmt(s.net)}万円）${SV.plan==='buy'?'と、次の家の購入':''}を、ライフプラン診断に入れて、今のままの場合と95歳まで比べられます。`,'sell2lp')}${ctaHTML()}
  <div class="cfhead"><h3>計算の内訳</h3></div>
  <div class="cfwrap"><table class="cf"><tbody>
   ${row('売却価格',s.p,'tot')}
   <tr class="sec"><th>売るときの費用</th><td></td></tr>
   ${row('仲介手数料（上限・税込）'+(SV.feeMode==='low'&&s.p<=CFG.fee.lowMax?'※800万円以下の特例':''),-s.fee)}${row('売買契約書の印紙代',-s.stamp)}${row('抵当権の抹消費用',-s.release)}${row('その他の費用',-s.other)}
   <tr class="sec"><th>税金（計算例）</th><td></td></tr>
   ${row('取得費'+(s.usedEst?'（売却価格の5%）':'（建物は減価償却後）'),s.acq)}${row('譲渡所得（利益）',s.gain)}
   ${taxRows}
   <tr class="sec"><th>そのほか</th><td></td></tr>
   ${row('住宅ローンの返済',-n(SV.loan))}${row('引越し・仮住まい',-s.move)}
   ${row('手元に残るお金',s.net,'bal')}
   ${mv?`<tr class="sec"><th>住み替え</th><td></td></tr>${row('次の家の価格＋諸費用',mv.need)}${row('売却の手取り＋預貯金',mv.own)}${mv.shortfall?row('返し切れないローン',mv.shortfall):''}${row('新しく借りる額',mv.borrow,'bal')}`:''}
  </tbody></table></div>
  <div class="cfhead"><h3>特例ごとの税金の計算例</h3></div>
  <div class="cfwrap"><table class="cf"><tbody><tr class="hd"><th>計算に使う特例</th><td>税金の計算例</td><td>繰り延べ</td></tr>
   ${alt.map(a=>`<tr${a.m===t.mode?' class="tot"':''}><th>${esc(TK[a.m])}</th><td>${a.x.ok?fmt(a.x.tax):'—'}</td><td>${a.x.ok&&a.x.deferred?fmt(a.x.deferred):(a.x.ok?'—':esc(a.x.why))}</td></tr>`).join('')}
  </tbody></table></div>
  <details class="grp" style="margin-top:14px"><summary>特例の主な要件<small>国税庁の資料をもとにした一般的な説明です</small></summary><div class="body reqs">
   <p><b>3,000万円特別控除</b>：住んでいる家、または住まなくなってから3年後の12月31日までに売る家が対象。親子・夫婦など特別な関係の人への売却は対象外。売った年の前年・前々年にこの控除や買い替え特例などを使っていないこと。</p>
   <p><b>軽減税率の特例</b>：3,000万円控除のあと、売った年の1月1日時点で家と土地の所有期間がともに10年を超えている場合、課税される利益のうち6,000万円までの部分の税率が下がります。</p>
   <p><b>特定のマイホーム買い替え特例</b>：${jd(CFG.kaikaeUntil)}までの売却が対象。居住期間10年以上、所有期間10年超、売却価格1億円以下。買い替え先は売った年の前年から翌年までに取得し、床面積50㎡以上・土地500㎡以下などの要件があります。新築は省エネ基準、中古は築25年以内または耐震基準の要件があります。税金がなくなるのではなく、次の家を売るときまで繰り延べる仕組みです。3,000万円控除・軽減税率とは一緒に使えません。</p>
   <p><b>仲介手数料の800万円以下の特例</b>：売買価格が800万円以下の家・土地は、通常の上限を超えて30万円（税込33万円）まで受け取れる特例です。仲介を頼む前に、不動産会社から説明を受けて合意することが前提です。</p>
  </div></details>
  <p class="unit">目安の計算です。仲介手数料は法定の上限額、印紙税は${jd(CFG.stampUntil)}までの軽減税率で計算しています。所有期間は売った年の1月1日時点で判定するため、「売る年−買った年」を目安にしています。住民税・復興特別所得税を含む税率で計算しています。</p>
  <div class="sect" style="padding-bottom:0"><h3 style="font-size:16px;margin-bottom:10px">あわせて使いたいツール</h3><div class="tools">
   ${['lifeplan','loan'].map(id=>toolCard(TOOLS.find(t=>t.href==='#'+id))).join('')}</div></div>`;
}
function sAdvice(s,mv,be){
  const out=[], t=s.t;
  if(s.net<0) out.push(`この価格で売ると、約${fmt(-s.net)}万円のローンが残る計算です（オーバーローン）。差額を預貯金で埋めるか、残りを新しいローンにまとめる「住み替えローン」という方法があります。`);
  else out.push(`ローンを返して、手元に約${fmt(s.net)}万円残る計算です。価格を${fmt(s.p-be)}万円下げても、ローンは返し切れる計算になります。`);
  if(!t.ok) out.push(`買い替え特例は、入力した条件では計算の対象外です（${t.why}）。表の計算例は特例を使わない場合の数字です。`);
  if(s.gain<=0) out.push('入力した条件では売却益が出ないため、税金はかからない計算です。');
  else if(s.tax>0) out.push(`「${TK[t.mode]}」で計算すると、税金は約${fmt(s.tax)}万円です。売却益の税金は、売った翌年の確定申告で納めます。`);
  else if(t.mode==='kaikae') out.push(`買い替え特例で計算すると、今回の税金は0円で、約${fmt(t.deferred)}万円の利益が次の家を売るときまで繰り延べられる計算です。`);
  else out.push('3,000万円特別控除で計算すると、税金は0円です。特例を使うには、売った翌年の確定申告が必要です。');
  if(mv){
    if(mv.ratio>35) out.push(`返済負担率は${mv.ratio.toFixed(0)}%です。一般に、金融機関の審査では35%前後が上限の目安とされています。次の家の予算や、預貯金から出す額を変えて試してみてください。`);
    else if(mv.ratio>25) out.push(`返済負担率は${mv.ratio.toFixed(0)}%です。一般に25%以下だと無理のない返済といわれます。教育費や老後の資金とあわせて、ライフプラン診断でも確かめられます。`);
    out.push('住み替えは「売り先行」だと資金計画が確定しやすく、「買い先行」だと次の家をじっくり選べます。どちらにするかで、仮住まいやつなぎ融資の費用が変わります。');
  }
  return out;
}
function sDock(){
  const d=document.getElementById('dockin');if(!d)return;const s=sellCalc(SV);
  d.innerHTML=`<div class="v"><span>手元に残るお金<b class="${s.net<0?'neg':''}">${fmt(s.net)} 万円</b></span><span>判定<b style="font-size:13px;margin-top:3px"><span class="chip ${s.net>=0?'good':'bad'}">${s.net>=0?'ローン完済OK':'ローンが残る'}</span></b></span></div><button class="btn primary" data-act="tosresult">結果を見る</button>`;
}
let sT=0;
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset.sk)return;const f=SALL.find(x=>x.id===t.dataset.sk);SV[t.dataset.sk]=f&&f.type==='sel'?t.value:(t.value===''?'':parseFloat(t.value));SV.example=false;exShown(false);sVis();saveSV();sDock();clearTimeout(sT);sT=setTimeout(sRender,250)});
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="tosresult"]');if(b)document.getElementById('sresult').scrollIntoView({behavior:'smooth'})});

