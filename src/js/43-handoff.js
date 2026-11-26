/* ---------- ツールからツールへ、結果をそのまま渡す ＋ 「わが家のまとめ」 ----------
   gtHand(先のツール, 入れる値, 元のツール名)：先のツールの入力に値を入れて保存し、そのページを開く（先のツールでは「○○の結果を入れています」と表示）
   わが家のまとめ（#matome）：この端末に保存されている各ツールの入力から結果を計算し直して1枚にまとめる。印刷・PDFにできる。どこにも送信しない */
function gtHand(to,vals,from){const def=GDEF[to];if(!def)return;
  let cur=null;try{const s=localStorage.getItem('sainomado-'+to+'-v1');if(s)cur=JSON.parse(s)}catch(e){}
  const base=cur&&!cur.example?cur:Object.assign(def.base(),{example:false});
  if(base.example&&def.fromLP&&typeof lpSrc==='function'){const S=lpSrc();if(S)def.fromLP(base,clone(S))}
  GT[to]=Object.assign(base,vals,{example:false,fromLp:false,fromTool:from});
  try{localStorage.setItem('sainomado-'+to+'-v1',JSON.stringify(GT[to]))}catch(e){}
  location.href=pageURL(to);
}
/* 各ツールの「続けて確かめる」：to＝先のツール、t＝ボタンの文言、d＝説明、v(V,R)＝先のツールに入れる値 */
const TOTOOLS={
  loan:[
   {to:'koujo',t:'住宅ローン控除で戻る額を見る',d:(V,R)=>`おすすめの予算で借りた場合（借入 約${fmt(loanBorrow(V,R))}万円）の、住宅ローン控除の目安を計算します。`,v:(V,R)=>({loan:loanBorrow(V,R),rate:n(V.rate),term:R.term||n(V.term),how:'gross',gross:n(V.income)})},
   {to:'prepay',t:'繰上げ返済の効果を見る',d:(V,R)=>`借入 約${fmt(loanBorrow(V,R))}万円で、繰上げ返済をすると利息がいくら減るかを計算します。`,v:(V,R)=>({bal:loanBorrow(V,R),rate:n(V.rate),years:R.term||n(V.term)})}],
  zoyo:[
   {to:'loan',t:'援助を頭金に入れて、買える予算を見る',d:(V,R)=>`援助額から贈与税の目安を引いた約${fmt(zoyoNet(V,R))}万円を頭金に足して、住宅ローン・購入予算診断を開きます。`,v:(V,R)=>{const L=gtState(GDEF.loan);return{down:n(L.down)+zoyoNet(V,R)}}}],
  koujo:[
   {to:'furusato',t:'ふるさと納税の上限も確かめる',d:()=>'同じ年収で、ふるさと納税の上限の目安を出します。住宅ローン控除との関係は「住宅ローン控除とふるさと納税の併用」の記事で説明しています。',v:V=>V.how==='gross'&&n(V.gross)>0?{gross:n(V.gross)}:{}}],
  prepay:[
   {to:'koujo',t:'住宅ローン控除への影響を見る',d:()=>'控除を受けている間に繰上げ返済すると、年末の残高が減るぶん控除も小さくなります。住宅ローン控除の目安を開きます。',v:V=>({loan:n(V.bal),rate:n(V.rate),term:n(V.years)})}]
};
function loanBorrow(V,R){const p=(typeof loanRec==='function'?loanRec(V,R).price:R.priceOk);return Math.max(0,Math.round(p-n(V.down)))}
function zoyoNet(V,R){const tax=R.canHouse?Math.min(R.A,R.B,R.C):R.A;return Math.max(0,Math.round(n(V.amount)-n(tax)))}
Object.entries(TOTOOLS).forEach(([k,a])=>{if(GDEF[k])GDEF[k].toTools=a});
function toToolsHTML(def,V,R){const a=def.toTools;if(!a||!a.length)return '';
  return `<section class="handoff"><h3>続けて確かめる</h3>${a.map((o,i)=>GDEF[o.to]?`<div class="hrow"><p>${esc(o.d(V,R))}</p><button type="button" class="btn small primary" data-act="handoff" data-from="${def.id}" data-i="${i}">${esc(o.t)} →</button></div>`:'').join('')}
   <p class="unit" style="margin:6px 0 0">結果は<a href="#matome">わが家のまとめ</a>にも集まります。</p></section>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="handoff"]');if(!b)return;const def=GDEF[b.dataset.from];if(!def||!def.toTools)return;
  const o=def.toTools[+b.dataset.i],V=gtState(def),R=def.calc(V);track('handoff',{tool:def.id,name:o.to});gtHand(o.to,o.v(V,R),TITLES[def.id]||def.title)});

/* 売却相場の目安 → 空き家診断・仲介手数料・相続税 */
function sbHandHTML(R,mid){
  const A=SBD[SB.pref],P=SB.city?SBC[SB.pref+'/'+SB.city]:null,cname=SB.city&&A.C[SB.city]?A.C[SB.city].name:'';
  let ev=null;
  if(SB.k!=='m'&&P&&P.length){const res=P.filter(x=>x.use==='住宅'),inT=SB.town?res.filter(x=>x.addr.replace(cname,'').startsWith(SB.town)):[],pool=inT.length?inT:res;
    if(pool.length){const ps=pool.map(x=>x.p).sort((a,b)=>a-b),med=ps[Math.floor((ps.length-1)/2)];ev={unit:med*0.8,val:Math.round(med*0.8*n(SB.area)/1e4/10)*10,town:!!inT.length,n:pool.length}}}
  const rows=[
   [`相続した家・空き家の診断に入れる`,`中央値（約${fmt(mid)}万円）を${SB.k==='l'?'更地の土地の価格':'建物つきで売った場合の価格'}として入れて、売る・貸す・持ち続けるを比べます。`,'sbhand','akiya'],
   [`仲介手数料を計算する`,`中央値（約${fmt(mid)}万円）で売れた場合の、仲介手数料の上限を計算します。`,'sbhand','chukai']];
  if(ev)rows.push([`相続税の目安に入れる`,`相続税の計算に使う土地の評価額は、路線価で決まります。路線価は地価公示のおよそ8割が目安なので、${ev.town?esc(SB.town)+'にある':esc(cname)+'の住宅地の'}地価公示・地価調査の真ん中（${Math.round(ev.unit/0.8).toLocaleString('ja-JP')}円/㎡）×0.8×土地${fmt(n(SB.area))}㎡で、約${fmt(ev.val)}万円が目安です。正確には国税庁の路線価図で確かめてください。`,'sbhand','souzokuzei',ev.val]);
  return `<section class="handoff"><h3>続けて確かめる</h3>${rows.map(([t,d,a,to,x])=>`<div class="hrow"><p>${d}</p><button type="button" class="btn small primary" data-act="${a}" data-to="${to}" data-x="${x!=null?x:mid}">${t} →</button></div>`).join('')}
   <p class="unit" style="margin:6px 0 0">結果は<a href="#matome">わが家のまとめ</a>にも集まります。</p></section>`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="sbhand"]');if(!b)return;const to=b.dataset.to,x=+b.dataset.x;
  const v=to==='akiya'?(SB.k==='l'?{land:x}:{sell:x}):to==='chukai'?{price:x}:(()=>{const Z=gtState(GDEF.souzokuzei);return{land:x,home:Math.max(n(Z.home),x)}})();
  track('handoff',{tool:'souba',name:to});gtHand(to,v,'売却相場の目安')});

/* ライフプラン（持ち家でローン返済中）→ 売却シミュレーター：ローンの残りを、毎月の返済額・金利・完済年齢から逆算して入れる */
function lpToSell(S){const bal=S.house==='own'&&n(S.loanPay)>0&&n(S.loanEnd)>n(S.age)?Math.round(pvLoan(n(S.loanPay),S.orate,Math.round(n(S.loanEnd)-n(S.age)))/10)*10:0;
  let cur=null;try{cur=JSON.parse(localStorage.getItem(SKEY)||'null')}catch(e){}
  const s=Object.assign(cur&&!cur.example?cur:sellBase(),{loan:bal,example:false,fromTool:'ライフプラン診断'});
  try{localStorage.setItem(SKEY,JSON.stringify(s))}catch(e){}location.href=pageURL('sell')}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="lp2sell"]');if(!b)return;e.preventDefault();const S=LP.plans[b.dataset.k]||LP.plans.A;if(S)lpToSell(S)});

/* ---------- わが家のまとめ ---------- */
const MTKEY='sainomado-matome-v1';
function mtLoad(k){try{const s=localStorage.getItem(k);return s?JSON.parse(s):null}catch(e){return null}}
function mtItems(){
  const out=[];
  // ライフプラン
  if(LP&&!LP.example&&LP.plans){Object.keys(LP.plans).sort().forEach(k=>{const S=LP.plans[k],r=sim(S),s=summarize(r,S);
    out.push({g:'家計',t:'ライフプラン診断　パターン'+k+((LP.names&&LP.names[k])?'：'+LP.names[k]:''),v:'95歳時点の金融資産 '+(s.last.bal<0?'▲':'')+fmt(Math.abs(s.last.bal))+'万円',c:s.neg?'bad':'good',s:s.neg?s.neg.a+'歳で手元のお金が不足':'95歳まで不足なし',h:'lifeplan'})})}
  // 売却シミュレーター
  const sv=mtLoad(SKEY);if(sv&&!sv.example){try{const x=sellCalc(sv);out.push({g:'売る',t:'売却・住み替えシミュレーター',v:'売却価格 '+fmt(n(sv.price))+'万円 → 手元に残るお金 '+(x.net<0?'▲':'')+fmt(Math.abs(x.net))+'万円',c:x.net>=0?'good':'bad',s:x.net>=0?'ローン完済OK':'ローンが残る',h:'sell'})}catch(e){}}
  // 売却相場の目安
  const sb=mtLoad(SBKEY);if(sb&&!sb.example){const A=SBD[sb.pref];if(A){const R=sbCalc(A,sb);if(R){const nm=(sb.city&&A.C[sb.city]?A.C[sb.city].name:A.name+'全体')+(sb.town?' '+sb.town:'');
    out.push({g:'売る',t:'売却相場の目安（'+nm+'・'+SBK[sb.k].t+'）',v:'中央値 約'+fmt(Math.round(R.price[1]/10)*10)+'万円（約'+fmt(Math.round(R.price[0]/10)*10)+'〜'+fmt(Math.round(R.price[2]/10)*10)+'万円）',s:fmt(n(sb.area))+'㎡'+(sb.k!=='l'?'・築'+fmt(n(sb.age))+'年':''),h:'souba'})}}else out.push({g:'売る',t:'売却相場の目安',v:'読み込み中…',h:'souba',load:sb.pref})}
  // 汎用ツール（下の固定バーに出している値）
  const G=[['loan','買う'],['rent2buy','買う'],['vs','買う'],['koujo','買う'],['zoyo','買う'],['prepay','買う'],['chukai','売る'],['akiya','相続'],['souzokuzei','相続'],['souzokubun','相続'],['furusato','家計']];
  G.forEach(([k,g])=>{const def=GDEF[k];if(!def||!def.dock)return;const v=mtLoad('sainomado-'+k+'-v1');if(!v||v.example)return;
    try{const V=Object.assign(def.base(),v);if(def.fix)def.fix(V);const R=def.calc(V);const d=def.dock(V,R);out.push({g,t:TITLES[k]||def.title,v:d[0]+'：'+String(d[1]).replace(/<[^>]+>/g,''),h:k})}catch(e){}});
  return out;
}
function vMatome(v){
  const it=mtItems(),memo=(mtLoad(MTKEY)||{}).memo||'',G=['家計','買う','売る','相続'];
  const dt=new Date(),ds=`${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日`;
  v.innerHTML=`<div class="wrap matome"><div class="crumb noprint"><a href="#home">サイのまど</a> › わが家のまとめ</div>
   <div class="thead"><h1>わが家のまとめ</h1><p>サイのまどのツールで計算した結果を、1枚にまとめました。家族で話し合うときや、不動産会社・銀行・FPなどに相談するときに、印刷やPDFにして使えます。</p>
    <div class="safe noprint">✓ この端末に保存されている入力から、その場で計算し直しています。どこにも送信されません</div></div>
   <div class="acts noprint"><button class="btn primary" data-act="mtprint">印刷・PDFにする</button><a class="btn" href="#tools">ほかのツールも使う</a></div>
   <p class="mtdate">作成日：${ds}（サイのまど）</p>
   ${it.length?G.map(g=>{const a=it.filter(x=>x.g===g);if(!a.length)return '';return `<section class="mtsec"><h2>${{家計:'家計の見通し',買う:'家を買う・借りる',売る:'家を売る・住み替える',相続:'相続・実家'}[g]}</h2>${a.map(x=>`<div class="mtrow"><div><p class="mtt">${esc(x.t)}</p><p class="mtv">${esc(x.v)}</p>${x.s?`<p class="mts">${x.c?`<span class="chip ${x.c}">${esc(x.s)}</span>`:esc(x.s)}</p>`:''}</div><a class="noprint" href="#${x.h}">開く →</a></div>`).join('')}</section>`}).join(''):
    `<section class="mtsec"><p>まだ結果がありません。ライフプラン診断や売却相場の目安などのツールで、自分の数字を入れてみてください。入力はこの端末に保存され、ここに集まります。</p><a class="btn primary" href="#lifeplan" data-lpguide="1">ライフプラン診断をはじめる</a></section>`}
   <section class="mtsec"><h2>相談したいこと・メモ</h2><textarea id="mt_memo" rows="5" placeholder="例：住み替えの時期、親の家をどうするか、ローンの組み方など。ここに書いた内容もこの端末にだけ保存されます">${esc(memo)}</textarea></section>
   <p class="unit mtnote">数字はすべて、入力した条件にもとづく目安です。税金や制度の扱いは、個別の事情で変わることがあります。くわしくは税理士・金融機関・不動産会社などの専門家に確かめてください。</p></div>`;
  const ld=it.find(x=>x.load);if(ld&&typeof sbLoad==='function')sbLoad(ld.load).then(()=>{if(route()==='matome')vMatome(v)}).catch(()=>{});
}
document.addEventListener('input',e=>{if(e.target.id!=='mt_memo')return;try{localStorage.setItem(MTKEY,JSON.stringify({memo:e.target.value}))}catch(x){}});
document.addEventListener('click',e=>{if(!e.target.closest('[data-act="mtprint"]'))return;track('export_pdf',{tool:'matome'});
  const el=document.getElementById('printArea'),src=document.querySelector('.matome');if(!el||!src){window.print();return}
  const c=src.cloneNode(true);c.querySelectorAll('.noprint,.crumb,.thead .safe,.acts').forEach(x=>x.remove());
  const ta=c.querySelector('#mt_memo'),memo=(document.getElementById('mt_memo')||{}).value||'';if(ta){const d=document.createElement('div');d.className='mtmemo';d.textContent=memo||'（なし）';ta.replaceWith(d)}
  const dt=new Date();el.innerHTML=`<header class="pr-h"><div><b>サイのまど</b> 住まいとお金の無料シミュレーション</div><div>${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日 作成</div></header>`+c.innerHTML;
  window.print()});
