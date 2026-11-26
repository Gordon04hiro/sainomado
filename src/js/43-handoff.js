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
    out.push({k:'lp',g:'家計',t:'ライフプラン診断　パターン'+k+((LP.names&&LP.names[k])?'：'+LP.names[k]:''),v:'95歳時点の金融資産 '+(s.last.bal<0?'▲':'')+fmt(Math.abs(s.last.bal))+'万円',c:s.neg?'bad':'good',s:s.neg?s.neg.a+'歳で手元のお金が不足':'95歳まで不足なし',h:'lifeplan'})})}
  // 売却シミュレーター
  const sv=mtLoad(SKEY);if(sv&&!sv.example){try{const x=sellCalc(sv);out.push({k:'sell',g:'売る',t:'売却・住み替えシミュレーター',v:'売却価格 '+fmt(n(sv.price))+'万円 → 手元に残るお金 '+(x.net<0?'▲':'')+fmt(Math.abs(x.net))+'万円',c:x.net>=0?'good':'bad',s:x.net>=0?'ローン完済OK':'ローンが残る',h:'sell'})}catch(e){}}
  // 売却相場の目安
  const sb=mtLoad(SBKEY);if(sb&&!sb.example){const A=SBD[sb.pref];if(A){const R=sbCalc(A,sb);if(R){const nm=(sb.city&&A.C[sb.city]?A.C[sb.city].name:A.name+'全体')+(sb.town?' '+sb.town:'');
    out.push({k:'souba',g:'売る',t:'売却相場の目安（'+nm+'・'+SBK[sb.k].t+'）',v:'中央値 約'+fmt(Math.round(R.price[1]/10)*10)+'万円（約'+fmt(Math.round(R.price[0]/10)*10)+'〜'+fmt(Math.round(R.price[2]/10)*10)+'万円）',s:fmt(n(sb.area))+'㎡'+(sb.k!=='l'?'・築'+fmt(n(sb.age))+'年':''),h:'souba'})}}else out.push({k:'souba',g:'売る',t:'売却相場の目安',v:'読み込み中…',h:'souba',load:sb.pref})}
  // 汎用ツール（下の固定バーに出している値）
  const G=[['loan','買う'],['rent2buy','買う'],['vs','買う'],['koujo','買う'],['zoyo','買う'],['prepay','買う'],['chukai','売る'],['akiya','相続'],['souzokuzei','相続'],['souzokubun','相続'],['furusato','家計']];
  G.forEach(([k,g])=>{const def=GDEF[k];if(!def||!def.dock)return;const v=mtLoad('sainomado-'+k+'-v1');if(!v||v.example)return;
    try{const V=Object.assign(def.base(),v);if(def.fix)def.fix(V);const R=def.calc(V);const d=def.dock(V,R);out.push({k,g,t:TITLES[k]||def.title,v:d[0]+'：'+String(d[1]).replace(/<[^>]+>/g,''),h:k})}catch(e){}});
  // チェックシート（進み具合）
  const prog=(key,items,map)=>{const st=mtLoad(key);if(!st)return null;const d=items.filter(i=>st[i[0]]).length;return d?{d,all:items.length,st}:null};
  const c1=prog(CKEY,CHECKS.flatMap(g=>g.items));if(c1)out.push({k:'souzoku',g:'相続',t:TITLES.souzoku||'相続の準備チェックシート',v:'完了 '+c1.d+' / '+c1.all+' 項目',h:'souzoku'});
  const c2s=mtLoad(C2KEY);if(c2s&&(c2s.date||PRE.concat(TL).some(i=>c2s[i[0]]))){const all=PRE.concat(TL),d=all.filter(i=>c2s[i[0]]).length;out.push({k:'souzoku2',g:'相続',t:TITLES.souzoku2||'相続の手続きチェックシート',v:'完了 '+d+' / '+all.length+' 項目'+(c2s.date?'（基準日 '+c2s.date+'）':''),h:'souzoku2'})}
  const c3=prog(CHUKOKEY,CHUKO.flatMap(g=>g.items));if(c3)out.push({k:'chuko',g:'買う',t:TITLES.chuko||'中古住宅チェックシート',v:'確認済み '+c3.d+' / '+c3.all+' 項目',h:'chuko'});
  return out;
}
/* PDFに入れるかどうか（画面のチェック）。外したものを覚えておく */
function mtOff(){return (mtLoad(MTKEY)||{}).off||{}}
function mtSaveSt(o){const cur=mtLoad(MTKEY)||{};try{localStorage.setItem(MTKEY,JSON.stringify(Object.assign(cur,o)))}catch(e){}}
function vMatome(v){
  const it=mtItems(),memo=(mtLoad(MTKEY)||{}).memo||'',G=['家計','買う','売る','相続'],off=mtOff();
  const dt=new Date(),ds=`${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日`;
  v.innerHTML=`<div class="wrap matome"><div class="crumb noprint"><a href="#home">サイのまど</a> › わが家のまとめ</div>
   <div class="thead"><h1>わが家のまとめ</h1><p>サイのまどのツールで計算した結果を、1枚にまとめました。家族で話し合うときや、不動産会社・銀行・FPなどに相談するときに、印刷やPDFにして使えます。</p>
    <div class="safe noprint">✓ この端末に保存されている入力から、その場で計算し直しています。どこにも送信されません</div></div>
   <div class="acts noprint"><button class="btn primary" data-act="mtprint">印刷・PDFにする</button><a class="btn" href="#tools">ほかのツールも使う</a></div>
   ${it.length?`<div class="mtselbar noprint"><span id="mtcount"></span><button type="button" class="btn small" data-act="mtall" data-v="1">すべて入れる</button><button type="button" class="btn small" data-act="mtall" data-v="0">すべて外す</button><span class="unit">左のチェックを外すと、そのツールはPDFに入りません。PDFには、ツールごとの「主な条件」と「結果」がくわしく入ります。</span></div>`:''}
   <p class="mtdate">作成日：${ds}（サイのまど）</p>
   ${it.length?G.map(g=>{const a=it.filter(x=>x.g===g);if(!a.length)return '';return `<section class="mtsec"><h2>${{家計:'家計の見通し',買う:'家を買う・借りる',売る:'家を売る・住み替える',相続:'相続・実家'}[g]}</h2>${a.map(x=>`<div class="mtrow"><label class="mtck noprint" title="PDFに入れる"><input type="checkbox" data-mtsel="${x.k}"${off[x.k]?'':' checked'} aria-label="${esc(x.t)}をPDFに入れる"></label><div class="mtb"><p class="mtt">${esc(x.t)}</p><p class="mtv">${esc(x.v)}</p>${x.s?`<p class="mts">${x.c?`<span class="chip ${x.c}">${esc(x.s)}</span>`:esc(x.s)}</p>`:''}</div><a class="noprint" href="#${x.h}">開く →</a></div>`).join('')}</section>`}).join(''):
    `<section class="mtsec"><p>まだ結果がありません。ライフプラン診断や売却相場の目安などのツールで、自分の数字を入れてみてください。入力はこの端末に保存され、ここに集まります。</p><a class="btn primary" href="#lifeplan" data-lpguide="1">ライフプラン診断をはじめる</a></section>`}
   <section class="mtsec"><h2>相談したいこと・メモ</h2><textarea id="mt_memo" rows="5" placeholder="例：住み替えの時期、親の家をどうするか、ローンの組み方など。ここに書いた内容もこの端末にだけ保存されます">${esc(memo)}</textarea></section>
   <p class="unit mtnote">数字はすべて、入力した条件にもとづく目安です。税金や制度の扱いは、個別の事情で変わることがあります。くわしくは税理士・金融機関・不動産会社などの専門家に確かめてください。</p></div>`;
  mtCount();
  const ld=it.find(x=>x.load);if(ld&&typeof sbLoad==='function')sbLoad(ld.load).then(()=>{if(route()==='matome')vMatome(v)}).catch(()=>{});
}
document.addEventListener('input',e=>{if(e.target.id!=='mt_memo')return;mtSaveSt({memo:e.target.value})});
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.mtsel)return;const off=mtOff();if(t.checked)delete off[t.dataset.mtsel];else off[t.dataset.mtsel]=true;mtSaveSt({off});document.querySelectorAll('[data-mtsel="'+t.dataset.mtsel+'"]').forEach(x=>x.checked=t.checked);mtCount()});
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="mtall"]');if(!b)return;const on=b.dataset.v==='1',off={};if(!on)document.querySelectorAll('[data-mtsel]').forEach(x=>off[x.dataset.mtsel]=true);mtSaveSt({off});document.querySelectorAll('[data-mtsel]').forEach(x=>x.checked=on);mtCount()});
function mtCount(){const c=document.getElementById('mtcount');if(!c)return;const ks=[...new Set([...document.querySelectorAll('[data-mtsel]')].map(x=>x.dataset.mtsel))],off=mtOff();c.textContent=ks.filter(k=>!off[k]).length+' / '+ks.length+' 件をPDFに入れます'}
document.addEventListener('click',e=>{if(!e.target.closest('[data-act="mtprint"]'))return;track('export_pdf',{tool:'matome'});
  const el=document.getElementById('printArea');if(el)el.innerHTML=mtReportHTML();window.print()});

/* ---------- わが家のまとめ：くわしいPDF（印刷用のレポート） ----------
   画面は1行ずつのまとめ、PDFは「主な条件」と「結果」をツールごとに表で出す。ライフプランは前提・パターン比較・グラフ・5年ごとの収支も */
const mtFv=(f,V)=>{const v=V[f.id];if(f.u==='年'&&+v>1900)return String(v)+' 年';if(f.type==='sel'){const o=(f.o||[]).find(x=>x[0]===v);return o?o[1]:String(v)}if(v===''||v==null)return '—';const x=+v;return (isFinite(x)?(Math.abs(x)>=1000?fmt(x):String(x)):esc(String(v)))+(f.u?' '+f.u:'')};
function mtInputs(groups,V){return groups.flatMap(g=>g.f).filter(f=>f.id&&f.l&&(!f.show||f.show(V))&&f.type!=='note').map(f=>[f.l,mtFv(f,V)])}
const mman=v=>(v<0?'▲':'')+fmt(Math.abs(Math.round(v)))+' 万円';
const MTOUT={
  loan:(V,R)=>{const C=loanRec(V,R);return[['無理なく返せる物件価格の目安',mman(R.priceOk)],['審査で借りられる上限の目安',mman(R.priceMax)],...(C.L.has&&C.L.max!=null?[['家計全体で見た上限（ライフプラン）',mman(C.L.max)]]:[]),...(C.L.has?[['おすすめの予算',mman(C.price)+'（'+C.why+'）']]:[]),['返済期間',R.term+' 年']]},
  rent2buy:(V,R)=>[['家賃と同じ負担で買える家の目安',mman(R.price)],['借入額',mman(R.borrow)],['毎月の返済',(Math.round(R.m*10)/10).toLocaleString('ja-JP')+' 万円'],['返済期間',R.term+' 年']],
  vs:(V,R)=>[['住居費の合計（賃貸）',mman(R.cr)],['住居費の合計（購入）',mman(R.cb)],['比べる年齢での家の価値',mman(R.value)],['購入の実質の負担（住居費−家の価値）',mman(R.net)]],
  prepay:(V,R)=>[['繰上げ返済する額',mman(R.A)],['期間短縮型：減る利息',mman(R.short.saved)],['期間短縮型：短くなる期間',Math.floor(R.short.months/12)+'年'+(R.short.months%12)+'か月'],['返済額軽減型：減る利息',mman(R.light.saved)],['返済額軽減型：毎月の返済',(Math.round(R.light.M3*100)/100).toLocaleString('ja-JP')+' 万円']],
  koujo:(V,R)=>[[R.years+'年間で戻る額の目安',mman(R.tot)],['1年目に戻る額',(R.rows[0]?(Math.round(R.rows[0].got*10)/10).toLocaleString('ja-JP'):'—')+' 万円'],['控除しきれない額の合計',mman(R.totMax-R.tot)]],
  furusato:(V,R)=>[['ふるさと納税の上限の目安','約'+(Math.floor(R.limit*10)*1000).toLocaleString('ja-JP')+' 円'],['住民税の所得割',mman(R.shotokuwari)],['所得税の税率',R.rate+' %']],
  zoyo:(V,R)=>[['特例を使わない場合（暦年課税）',mman(R.A)],...(R.canHouse?[['住宅取得等資金の非課税を使う場合',mman(R.B)],['非課税＋相続時精算課税を使う場合',mman(R.C)]]:[])],
  souzokuzei:(V,R)=>[['課税価格の合計（特例・非課税を引いた後）',mman(R.total)],['基礎控除',mman(R.basic)],['判定',R.over?'基礎控除を超える（相続税がかかる可能性）':'基礎控除の範囲内']],
  souzokubun:(V,R)=>R.none?[['相続人','なし']]:R.heirs.map(h=>[h.l+(h.n>1?'（'+h.n+'人）':''),(Array.isArray(h.f)?h.f[0]+'/'+h.f[1]:String(h.f))+(h.n>1?'（1人あたり）':'')]),
  akiya:(V,R)=>R.items.map(x=>[x.l+'（'+R.N+'年分）',mman(x.v)]),
  chukai:(V,R)=>[['仲介手数料の上限（税込み）',yenFmt(R.total)+' 円']]
};
function mtToolSec(k){const def=GDEF[k];const v=mtLoad('sainomado-'+k+'-v1');if(!def||!v||v.example)return '';
  try{const V=Object.assign(def.base(),v);if(def.fix)def.fix(V);const R=def.calc(V);
    const out=MTOUT[k]?MTOUT[k](V,R):def.dock?[def.dock(V,R).slice(0,2).map(x=>String(x).replace(/<[^>]+>/g,''))]:[];
    return `<section class="pr-sec"><h2>${esc(TITLES[k]||def.title)}</h2><div class="pr-2"><div><h3>主な条件</h3>${mtTbl(mtInputs(def.groups,V))}</div><div><h3>結果</h3>${mtTbl(out)}</div></div></section>`}catch(e){return ''}}
const mtTbl=rows=>`<table class="cf mt"><tbody>${rows.map(([a,b])=>`<tr><th>${esc(a)}</th><td>${b}</td></tr>`).join('')}</tbody></table>`;
function mtLifeSec(){if(!LP||LP.example||!LP.plans)return '';
  const ks=Object.keys(LP.plans).sort(),R={};ks.forEach(k=>{const S=LP.plans[k],r=sim(clone(S));R[k]={S,r,s:summarize(r,S)}});
  const S=R.A?R.A.S:R[ks[0]].S,kids=(S.kids||[]).map(c=>(Y0-Math.round(n(c.by)))+'歳').join('・');
  const house=S.house==='buy'?`${Math.round(n(S.buyAge))}歳で${fmt(n(S.price))}万円の家を購入（頭金${fmt(n(S.down))}万円・金利${S.rate}%・${S.term}年）`:S.house==='own'?`持ち家（住宅ローン 月${S.loanPay}万円・${Math.round(n(S.loanEnd))}歳まで）`:`賃貸（家賃 月${S.rent}万円）`;
  const pre=[['本人',Math.round(n(S.age))+'歳・手取り年収 '+fmt(n(S.inc))+'万円・'+Math.round(n(S.workEnd||S.ret))+'歳まで働く'],...(S.spouse==='yes'?[['配偶者',Math.round(n(S.sage))+'歳・手取り年収 '+fmt(n(S.sinc))+'万円']]:[]),['子ども',kids||'なし'],['住まい（パターンA）',house],['生活費（住居費・教育費を除く）','月 '+S.live+' 万円']];
  const A=R.A||R[ks[0]],pick=A.r.filter((x,i)=>i===0||x.a%5===0||i===A.r.length-1);
  return `<section class="pr-sec"><h2>家計の見通し（ライフプラン診断）</h2>${mtTbl(pre)}
   <h3 style="margin-top:8px">パターンの比較</h3><table class="cf"><tbody><tr class="hd"><th>パターン</th><td>判定</td><td>95歳時点の金融資産</td><td>仕事を辞める時</td><td>いちばん少ない時</td><td>95歳時点の純資産</td></tr>
    ${ks.map(k=>{const s=R[k].s;return `<tr><th>${k}：${esc(LP.names[k]||'')}</th><td>${s.st.t}</td><td>${mman(s.last.bal)}</td><td>${mman(s.retire.bal)}</td><td>${s.min.a}歳 ${mman(s.min.bal)}</td><td>${mman(s.last.bs.nw)}</td></tr>`}).join('')}</tbody></table>
   ${chartSVG(ks.map(k=>({rows:R[k].r,color:PCOL[k],dash:PDASH[k]})),null,'mtpr')}
   <p class="pr-lg">${ks.map(k=>`${k}：${esc(LP.names[k]||'')}`).join('　')}　（金融資産の推移・万円）</p>
   <h3 style="margin-top:8px">5年ごとの収支（パターンA）</h3><table class="cf"><tbody><tr class="hd"><th>年齢</th><td>収入</td><td>支出</td><td>年間の収支</td><td>金融資産</td></tr>
    ${pick.map(x=>`<tr><th>${x.a}歳（${x.y}年）</th><td>${fmt(x.iTot)}</td><td>${fmt(x.eTot)}</td><td>${x.net<0?'▲':''}${fmt(Math.abs(x.net))}</td><td>${x.bal<0?'▲':''}${fmt(Math.abs(x.bal))}</td></tr>`).join('')}</tbody></table>
   <p class="pr-lg">単位：万円。毎年の一覧はライフプラン診断の「キャッシュフロー表」からExcel・PDFで保存できます。</p></section>`}
function mtSellSec(){const sv=mtLoad(SKEY);if(!sv||sv.example)return '';try{const V=Object.assign(sellBase(),sv),x=sellCalc(V);
  return `<section class="pr-sec"><h2>売却・住み替えシミュレーター</h2><div class="pr-2"><div><h3>主な条件</h3>${mtTbl(mtInputs(SF,V))}</div><div><h3>結果</h3>${mtTbl([['売却価格',mman(x.p)],['仲介手数料',mman(x.fee)],['印紙税',mman(x.stamp)],['税金（譲渡所得税・住民税）',mman(x.tax)],['ローンの返済',mman(n(V.loan))],['手元に残るお金',mman(x.net)]])}</div></div></section>`}catch(e){return ''}}
function mtSoubaSec(){const sb=mtLoad(SBKEY);if(!sb||sb.example)return '';const A=SBD[sb.pref];if(!A)return '';const R=sbCalc(A,sb);if(!R)return '';
  const nm=(sb.city&&A.C[sb.city]?A.C[sb.city].name:A.name+'全体')+(sb.town?' '+sb.town:''),tr=A.TR&&(sb.city&&A.TR.C[sb.city]&&A.TR.C[sb.city][sb.k]||A.TR.P[sb.k]);
  const f=tr?tr.filter(r=>r[0]<+String(A.TR.last).slice(0,4)||/第4四半期/.test(A.TR.last)):[],tr10=f.length>=11?[f[f.length-11],f[f.length-1]]:null;
  return `<section class="pr-sec"><h2>売却相場の目安</h2><div class="pr-2"><div><h3>主な条件</h3>${mtTbl([['場所',esc(A.name+' '+nm.replace(A.name+'全体',''))],['種類',SBK[sb.k].t],[SBK[sb.k].area,fmt(n(sb.area))+' ㎡'],...(sb.k!=='l'?[['築年数',fmt(n(sb.age))+' 年']]:[])])}</div>
   <div><h3>結果</h3>${mtTbl([['中央値','約 '+fmt(Math.round(R.price[1]/10)*10)+' 万円'],['取引の半分が入る幅','約 '+fmt(Math.round(R.price[0]/10)*10)+'〜'+fmt(Math.round(R.price[2]/10)*10)+' 万円'],['1㎡あたり（中央値）',(Math.round(R.unit[1]/1000)/10).toLocaleString('ja-JP')+' 万円'],['もとにした取引',fmt(R.n)+' 件（'+esc(A.from)+'〜'+esc(A.to)+'）'],...(tr10?[[tr10[0][0]+'年→'+tr10[1][0]+'年の1㎡単価の変化',(tr10[1][1]/tr10[0][1]>=1?'+':'')+Math.round((tr10[1][1]/tr10[0][1]-1)*100)+'%']]:[])])}</div></div>
   <p class="pr-lg">出典：国土交通省 不動産情報ライブラリの不動産取引価格情報・成約価格情報をもとにサイのまどが集計・加工。統計的な目安で、査定ではありません。</p></section>`}
function mtReportHTML(){
  const dt=new Date(),memo=(document.getElementById('mt_memo')||{}).value||'';
  const off=mtOff(),on=k=>!off[k];
  const secs=[on('lp')?mtLifeSec():'',on('souba')?mtSoubaSec():'',on('sell')?mtSellSec():'',...['loan','rent2buy','vs','koujo','zoyo','prepay','chukai','akiya','souzokuzei','souzokubun','furusato'].filter(on).map(mtToolSec),on('chuko')?mtCheckSec('chuko'):'',on('souzoku')?mtCheckSec('souzoku'):'',on('souzoku2')?mtCheckSec('souzoku2'):''].filter(Boolean);
  const it=mtItems().filter(x=>on(x.k));
  return `<header class="pr-h"><div><b>サイのまど</b> 住まいとお金の無料シミュレーション</div><div>${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日 作成</div></header>
   <h1>わが家のまとめ</h1>
   <h2>結果の一覧</h2>${mtTbl(it.map(x=>[x.t,esc(x.v)+(x.s?'　'+esc(x.s):'')]))}
   ${secs.map((s,i)=>i===0?s:s.replace('<section class="pr-sec">','<section class="pr-sec">')).join('')}
   <section class="pr-sec"><h2>相談したいこと・メモ</h2><div class="mtmemo">${esc(memo)||'（なし）'}</div></section>
   <p class="pr-note">数字はすべて、入力した条件にもとづく目安です。税金や制度の扱いは個別の事情で変わることがあります。くわしくは税理士・金融機関・不動産会社などの専門家に確かめてください。サイのまど（https://sainomado.jp/）</p>`;
}

/* チェックシートのPDF：まだ終わっていない項目（相続の手続きは、基準日があれば期限つき） */
function mtCheckSec(k){
  if(k==='souzoku2'){const st=mtLoad(C2KEY)||{},all=PRE.concat(TL),d=all.filter(i=>st[i[0]]).length;if(!d&&!st.date)return '';
    const base=st.date?new Date(st.date+'T00:00:00'):null;
    const rows=TL.filter(i=>!st[i[0]]).map(i=>[i[1],base?(()=>{const x=addTo(base,i[2]);return x.getFullYear()+'年'+(x.getMonth()+1)+'月'+x.getDate()+'日まで'})():TLG[i[4]]]);
    return `<section class="pr-sec"><h2>${esc(TITLES.souzoku2||'相続の手続きチェックシート')}</h2><p class="pr-lg">完了 ${d} / ${all.length} 項目${st.date?'（基準日 '+esc(st.date)+'）':''}。まだの手続き：</p>${mtTbl(rows.map(([a,b])=>[a,esc(b)]))}</section>`}
  const [key,G,t]=k==='chuko'?[CHUKOKEY,CHUKO,TITLES.chuko||'中古住宅チェックシート']:[CKEY,CHECKS,TITLES.souzoku||'相続の準備チェックシート'];
  const st=mtLoad(key)||{},all=G.flatMap(g=>g.items),d=all.filter(i=>st[i[0]]).length;if(!d)return '';
  return `<section class="pr-sec"><h2>${esc(t)}</h2><p class="pr-lg">${k==='chuko'?'確認済み':'完了'} ${d} / ${all.length} 項目。まだの項目：</p>${mtTbl(G.flatMap(g=>g.items.filter(i=>!st[i[0]]).map(i=>[g.g,esc(i[1])])))}</section>`;
}
