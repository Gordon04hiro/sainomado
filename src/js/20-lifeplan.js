/* ---------- lifeplan ---------- */
function diffs(S,A){
  if(S===A) return [];
  const out=[];
  ALLF.forEach(f=>{if((!f.show||f.show(S)||f.show(A))&&String(S[f.id])!==String(A[f.id]))out.push(f.l)});
  if(JSON.stringify(S.kids)!==JSON.stringify(A.kids)) out.push('お子さま');
  if(JSON.stringify(S.events)!==JSON.stringify(A.events)) out.push('その他の予定');
  if(JSON.stringify(S.insl||[])!==JSON.stringify(A.insl||[])) out.push('保険');
  if(JSON.stringify(S.assets)!==JSON.stringify(A.assets)) out.push('資産と積立');
  if(JSON.stringify(S.props)!==JSON.stringify(A.props)) out.push('不動産投資');
  return out;
}
function diffHTML(){if(U.plan==='A')return'';const d=diffs(LP.plans[U.plan],LP.plans.A);return 'Aとの違い：'+(d.length?d.map(x=>`<span class="chip muted" style="margin:2px 4px 2px 0">${esc(x)}</span>`).join(''):'まだありません。変えたい項目を書き換えてください')}
const OPEN=['ご家族','お仕事の収入','住まい','毎月の支出','今の資産と積立'];
function easyDefaults(S){normPlan(S);const A=S.assets;const sp=S.spouse==='yes';
  return [`年金（ご本人 月${n(S.pen)}万円${sp?'・配偶者 月'+n(S.spen)+'万円':''}、${n(S.penAge)}歳から）`,`定年${n(S.ret)}歳・退職金${fmt(n(S.sev))}万円・${n(S.workEnd)}歳まで働く`,`車（${fmt(n(S.car))}万円を${n(S.carEvery)}年ごと）`,`物価上昇 年${n(S.infl)}%`,`利回り（預貯金${n(A.cash.rate)}%・NISA${n(A.nisa.rate)}%）`,`保険料 月${Math.round(insNow(S)*10)/10}万円`,`お子さまの幼稚園〜高校（幼稚園は私立、小中高は公立）`].join('、')}
function vLife(v){
  try{const o=sessionStorage.getItem('sainomado-lp-open');if(o&&LP.plans[o]){U.plan=o;U.cf=o;sessionStorage.removeItem('sainomado-lp-open')}}catch(e){}
  if(!LP.plans[U.plan]) U.plan='A';
  const S=LP.plans[U.plan], ks=keys();
  v.innerHTML=`<div class="wrap"><div class="crumb"><a href="#home">サイのまど</a> › ライフプラン診断</div>
  <div class="thead"><h1>ライフプラン診断</h1><p>家族・収入・住まいを入れると、95歳までのキャッシュフロー表（毎年の収支と貯蓄の推移）を作ります。Excel・PDFで保存もできます。わかる範囲の入力で大丈夫です。</p>
   ${lpSaveBox()}</div>
  ${ks.length>1||U.plan!=='A'?planBox(ks):''}
  <div class="modepick" role="group" aria-label="入力のしかた">
   <div class="mp-opts">
    <button class="mp" data-act="mode2" data-m="guide" aria-pressed="${LP.mode==='guide'}"><span class="mp-r"></span><span><b>質問に答えて入力</b><small>はじめての方に・約5分</small></span></button>
    <button class="mp" data-act="mode2" data-m="easy" aria-pressed="${!LP.mode||LP.mode==='easy'}"><span class="mp-r"></span><span><b>かんたん入力</b><small>主な項目だけ・約3分</small></span></button>
    <button class="mp" data-act="mode2" data-m="detail" aria-pressed="${LP.mode==='detail'}"><span class="mp-r"></span><span><b>くわしく入力</b><small>年金・退職金・車なども</small></span></button>
   </div>
   ${!LP.mode||LP.mode==='easy'?`<details class="defaults"><summary>かんたん入力で自動で使う値を見る</summary><p class="unit">${esc(easyDefaults(S))}。<button class="linkbtn" data-act="mode2" data-m="detail">くわしく入力で変える →</button></p></details>`:''}</div>
  ${LP.mode==='guide'?'':'<div class="prog" id="prog" aria-live="polite"></div>'}
  ${LP.mode==='guide'?guideHTML(S):`<div class="formgrid${LP.mode==='detail'?'':' easy'}">${GROUPS.map(g=>`<details class="grp"${OPEN.includes(g.t)?' open':''}${g.adv?' data-adv':''}><summary>${g.t}<span class="gleft" id="gl${GROUPS.indexOf(g)}"></span>${g.s?`<small>${g.s}</small>`:''}</summary><div class="body">${g.f?`<div class="fields">${fieldsHTML(g,S)}</div>`:''}${g.pencalc?penHTML(S):''}${g.sevcalc?sevHTML(S):''}${g.insl?inslHTML(S):''}${g.kids?`<div style="margin-top:14px">${kidsHTML(S)}</div>`:''}${g.events?eventsHTML(S):''}${g.assets?`<div style="margin-top:14px">${assetsHTML(S)}</div>`:''}${g.props?propsHTML(S):''}</div></details>`).join('')}</div>`}
  ${ks.length>1||U.plan!=='A'?'':planBox(ks)}
  <section class="result" id="result"${wzHold()?' hidden':''}></section></div>`;
  syncVis(S); renderResult(); updateDock();
}
function planBox(ks){
  return `<div class="pbar"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><div class="seg" role="group" aria-label="パターン">${ks.map(k=>`<button data-act="plan" data-p="${k}" aria-pressed="${U.plan===k}"><span class="dot ${k.toLowerCase()}"></span>${k}：${esc(LP.names[k]||'')}</button>`).join('')}</div>
   ${ks.length<3?`<button class="btn small" data-act="addplan">＋ 比べるパターンを追加</button>`:''}</div>
   ${ks.length>1||U.plan!=='A'?`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end"><label class="fld" style="flex:1;min-width:180px"><span class="lab">パターン${U.plan}の名前</span><input class="txt" id="pname" data-pname="1" value="${esc(LP.names[U.plan]||'')}"></label>${U.plan!=='A'?'<button class="btn small ghost danger" data-act="delplan">このパターンを削除</button>':''}</div><div class="unit" id="diffbox">${diffHTML()}</div>`:`<span class="unit">例：「家を買う」と「賃貸のまま」、「65歳で退職」と「70歳まで働く」などを並べて比べられます。</span>`}</div>`;
}
function advice(S,s,r){
  const out=[];
  if(s.neg) out.push(`${s.neg.a}歳ごろに貯蓄がマイナスになる見込みです。支出・働き方・住まいの予算のどれかを見直すパターンを追加して比べてみてください。`);
  else if(s.st.c==='warn') out.push(`いちばん少ない時（${s.min.a}歳）の貯蓄が、生活費の2年分を下回ります。急な出費に備える余裕が少なめです。`);
  else out.push('95歳まで貯蓄がマイナスにならない見込みです。');
  const w=r.find(x=>x.wd>0.5);if(w) out.push(`${w.a}歳ごろから、預貯金だけでは足りず、投資を取り崩す計算です。`);
  const lk=r.find(x=>x.cash<-0.5&&x.ideco+x.kyo>1);if(lk) out.push(`${lk.a}歳で手元のお金が足りなくなりますが、その時点でiDeCo・共済に約${fmt(lk.ideco+lk.kyo)}万円あります。受け取れる年齢になるまで使えないお金です。`);
  const edu=r.reduce((m,x)=>x.eEdu>m.eEdu?x:m,r[0]);
  if(edu.eEdu>0) out.push(`教育費がいちばん多いのは${edu.a}歳ごろ（年${fmt(edu.eEdu)}万円）です。その前に貯めておく時期を意識しておくと安心です。`);
  if(S.house==='buy'){const b=r.find(x=>x.a===Math.round(n(S.buyAge)));if(b)out.push(`住宅購入の年（${b.a}歳）は、頭金と諸費用で${fmt(b.eOne)}万円ほど出ていきます。購入後の貯蓄残高は${fmt(b.bal)}万円の見込みです。`)}
  return out;
}
function renderResult(){
  const box=document.getElementById('result'); if(!box) return;
  const ks=keys(), R={}; ks.forEach(k=>{const S=LP.plans[k],r=sim(S);R[k]={S,r,s:summarize(r,S)}});
  if(!R[U.cf]) U.cf='A';
  const r0=R.A.r; if(U.hi>=r0.length) U.hi=0;
  const panel=k=>{const {S,s}=R[k];return `<section class="panel"><div class="ph"><span class="dot ${k.toLowerCase()}"></span><span class="nm">${k}：${esc(LP.names[k]||'')}</span><span class="chip ${s.st.c}">${s.st.t}</span></div>
   <div class="kv"><span>95歳時点の金融資産</span><b class="${s.last.bal<0?'neg':''}">${fmt(s.last.bal)}<small>万円</small></b>
   <span>仕事を辞める時（${Math.round(n(S.workEnd))}歳）</span><b class="${s.retire.bal<0?'neg':''}">${fmt(s.retire.bal)}<small>万円</small></b>
   <span>いちばん少ない時（${s.min.a}歳）</span><b class="${s.min.bal<0?'neg':''}">${fmt(s.min.bal)}<small>万円</small></b>
   <span>95歳時点の純資産</span><b class="${s.last.bs.nw<0?'neg':''}">${fmt(s.last.bs.nw)}<small>万円</small></b>
   ${k!=='A'?`<span>Aとの差（95歳時点）</span><b>${s.last.bal-R.A.s.last.bal>=0?'+':''}${fmt(s.last.bal-R.A.s.last.bal)}<small>万円</small></b>`:''}</div></section>`};
  const cur0=R[U.plan]||R.A, NI=noInvest(cur0.S,cur0.r);
  const series=()=>ks.map(k=>({rows:R[k].r,color:PCOL[k],dash:PDASH[k]})).concat(NI?[{rows:NI.r,color:'var(--muted)',dash:'5 4'}]:[]);
  const cur=R[U.plan]||R.A;
  const key=U.plan in R?U.plan:'A'; cur.key=key;
  const tab=U.rtab||'overview';
  let body='';
  if(tab==='overview') body=`<section class="chartcard"><div class="legend"><b style="color:var(--ink);font-size:14px">金融資産の推移</b>${ks.map(k=>`<span><span class="dot ${k.toLowerCase()}"></span>${k}：${esc(LP.names[k]||'')}</span>`).join('')}${NI?`<span><span class="dash-sw"></span>運用しなかった場合（${U.plan in R?U.plan:'A'}）</span>`:''}</div>
   <div class="readout" id="ro"></div>${chartSVG(series(),U.hi,'ch1')}<div class="unit">グラフをタップ・なぞると、その年の数字が出ます。</div>${NI?noInvestBox(NI,cur0):''}</section>
  <section class="chartcard"><div class="legend" style="margin-bottom:4px"><b style="color:var(--ink);font-size:14px">資産の内訳の推移（パターン${key}）</b></div>${stackSVG(cur.r,'st1')}<div class="unit">手元のお金が足りない年は、課税口座 → NISA の順に取り崩す計算です。iDeCoと共済は、受け取る年齢まで取り崩しに使いません。</div></section>
  <section class="advice"><h3>パターン${key}の見どころ</h3><ul>${advice(cur.S,cur.s,cur.r).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>${ctaHTML()}`;
  else if(tab==='bs') body=`<section class="chartcard" id="bsbox"></section>`;
  else if(tab==='goal') body=goalTab(cur);
  else if(tab==='scen') body=scenTab(cur);
  else if(tab==='yj') body=yjTab(cur);
  else if(tab==='month') body=monthTab(cur);
  else body=`<div class="cfhead"><h3>キャッシュフロー表</h3><div style="display:flex;gap:8px;flex-wrap:wrap">
   ${ks.length>1?`<div class="seg">${ks.map(k=>`<button data-act="cf" data-p="${k}" aria-pressed="${U.cf===k}"><span class="dot ${k.toLowerCase()}"></span>${k}</button>`).join('')}</div>`:''}
   <div class="seg"><button data-act="step" data-s="5" aria-pressed="${U.step===5}">5年ごと</button><button data-act="step" data-s="1" aria-pressed="${U.step===1}">毎年</button></div></div></div>
  <div class="cfwrap">${cfTable(R[U.cf].r,R[U.cf].S,U.step)}</div>`;
  box.innerHTML=`<div class="rhead"><div><h2>診断結果</h2><p class="unit">入力するたびに自動で更新されます（単位：万円）。${ks.length>1?`決算書・逆算・シナリオ・予実は、編集中のパターン${key}について表示します。`:''}</p></div>
   <div class="exportbar">${shareBtn()}<button class="btn small" data-act="pdf">PDFで保存</button><button class="btn small" data-act="xlsx">Excelで保存</button></div></div>
  ${LP.example?`<section class="exnote" role="note"><b>いま表示しているのは「入力例の家族」の結果です</b>
   <p>35歳・配偶者と子ども2人・手取り年収450万円、37歳で3,000万円の家を買う、という例の家族で計算しています。あなたの数字に変えると、結果も変わります。</p>
   <p class="unit">結果が大きく動くのは、①手取りの収入　②毎月の生活費　③住まいの予算　④子どもの進路（教育費）の4つです。まずはこの4つから変えてみてください。</p>
   <div class="acts"><button class="btn small primary" data-act="mode2" data-m="guide">質問に答えて入力する</button><button class="btn small" data-act="clear">空にして自分で入力する</button></div></section>`:''}
  <div class="panels">${ks.map(panel).join('')}</div>
  <div class="rtabs-h"><b>結果をくわしく見る</b><span class="unit">7つの見方で、わが家のお金を確かめられます</span></div>
  <nav class="rtabs" aria-label="結果の表示">${RTABS.map(([k,l,d,p])=>`<button data-act="rtab" data-t="${k}" aria-pressed="${tab===k}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${p}"/></svg><span><b>${l}</b><small>${d}</small></span></button>`).join('')}</nav>
  <div class="rbody">${body}</div>
  <p class="unit">手取りベースの簡易試算です。税金・社会保険料・住宅ローン控除は含みません。教育費は文部科学省「子供の学習費調査」（令和5年度）・日本政策金融公庫「教育費負担の実態調査」（令和3年度）の平均値、児童手当は2024年10月以降の制度で計算しています。住宅購入時は物件価格の7%を諸費用として計上。▲はマイナス。</p>
  <div class="sect" style="padding-bottom:0"><h3 style="font-size:16px;margin-bottom:10px">あわせて使いたいツール</h3><div class="tools">${['sell','loan','vs'].map(id=>toolCard(TOOLS.find(t=>t.href==='#'+id))).join('')}</div></div>`;
  if(tab==='bs'){BSR={r:cur.r,S:cur.S,key}; renderBS();}
  if(tab==='month'){const a=document.getElementById('mstart'),b=document.getElementById('mmon');if(a)a.onchange=()=>{U.mstart=+a.value;renderResult()};if(b)b.onchange=()=>{U.mmon=+b.value;renderResult()}}
  if(tab==='overview'){
  const ro=()=>{const a=r0[U.hi];document.getElementById('ro').innerHTML=`<span><b>${a.a}歳</b>（${a.y}年）</span>${ks.map(k=>{const x=R[k].r[U.hi];return`<span>${k} 残高 <b class="${x&&x.bal<0?'neg':''}">${x?fmt(x.bal):'–'}</b></span>`}).join('')}${NI&&NI.r[U.hi]?`<span>運用なし <b class="${NI.r[U.hi].bal<0?'neg':''}">${fmt(NI.r[U.hi].bal)}</b></span>`:''}${a.ev.length?`<span>${esc(a.ev.join('・'))}</span>`:''}`};
  ro();
  const onIdx=i=>{if(i===U.hi)return;U.hi=i;document.getElementById('ch1').outerHTML=chartSVG(series(),U.hi,'ch1');ro();bindChart('ch1',r0.length,onIdx)};
  bindChart('ch1',r0.length,onIdx);
  }
}
/* ---------- 運用しなかった場合（NISA・iDeCo・課税口座などの利回りを0%にした計算） ----------
   運用でどれくらい増える前提になっているかを見える化する。投資の残高・積立がなければ出さない */
const INVKEYS=['nisa','tax','ideco','snisa','sideco'];
function noInvest(S,r){
  const T=clone(S);normPlan(T);
  const has=INVKEYS.some(k=>T.assets[k]&&(n(T.assets[k].bal)>0||n(T.assets[k].mon)>0)&&n(T.assets[k].rate)>0)||(T.assets.others||[]).some(o=>n(o.rate)>0&&(n(o.bal)>0||n(o.mon)>0));
  if(!has) return null;
  INVKEYS.forEach(k=>{if(T.assets[k])T.assets[k].rate=0});(T.assets.others||[]).forEach(o=>o.rate=0);
  const rr=sim(T),last=rr[rr.length-1],base=r[r.length-1],gain=base.bal-last.bal;
  if(gain<1) return null;
  const short=rr.find(x=>x.bal<0);
  return{r:rr,last,gain,base,short};
}
function noInvestBox(NI,cur){
  const pct=NI.base.bal>0?Math.round(NI.gain/NI.base.bal*100):null;
  return `<div class="nibox"><b>運用で増える分（95歳時点）</b>
   <div class="kv"><span>運用で増える分の目安</span><b>約${fmt(NI.gain)}<small>万円</small></b>
   <span>運用しなかった場合の95歳時点</span><b class="${NI.last.bal<0?'neg':''}">${fmt(NI.last.bal)}<small>万円</small></b>
   ${pct!=null&&pct>0?`<span>95歳時点の金融資産のうち</span><b>約${Math.min(pct,999)}<small>%</small></b>`:''}</div>
   <p class="unit" style="margin:6px 0 0">${NI.short?`NISA・iDeCoなどの運用でまったく増えなかった場合、<b>${NI.short.a}歳</b>でお金が足りなくなる計算です。運用は増えることもあれば減ることもあるので、利回りを低めにしたり、支出や働き方で備えたりしておくと安心です。`:`NISA・iDeCoなどの運用でまったく増えなかった場合でも、95歳までお金が足りなくならない計算です。${pct>=50?'ただし、95歳時点の金融資産の半分以上は運用で増える前提なので、利回りを低めにした場合も確かめておくと安心です。':''}`}点線が、運用しなかった場合の金融資産の推移です（利回りを0%にした計算。預貯金の利息と共済はそのまま）。</p></div>`;
}
/* ---------- 入力の進み具合（あと何項目） ---------- */
function progItems(S){
  const det=LP.mode==='detail',out=[];
  GROUPS.forEach((g,gi)=>{if(g.adv&&!det)return;(g.f||[]).forEach(f=>{if(f.type==='sel'||(!det&&!f.easy)||(f.show&&!f.show(S)))return;out.push({gi,id:'f_'+f.id,l:f.l,ok:S[f.id]!==''&&S[f.id]!=null})});
    if(g.kids)(S.kids||[]).forEach((c,i)=>out.push({gi,id:`k${i}_by`,l:`第${i+1}子の生まれ年`,ok:c.by!==''&&c.by!=null&&!isNaN(c.by)}));
    if(g.assets){const b=S.assets&&S.assets.cash.bal;out.push({gi,id:det?'a_cash_bal':'ez_cash',l:'預貯金の残高',ok:b!==''&&b!=null})}});
  return out;
}
function updateProgress(){
  const S=LP.plans[U.plan],box=document.getElementById('prog');if(!S||!box)return;
  if(LP.mode==='guide'){box.hidden=true;return 0}
  const it=progItems(S),done=it.filter(x=>x.ok).length,left=it.length-done,nx=it.find(x=>!x.ok);
  box.className='prog'+(left?'':' done');
  box.hidden=!left&&LP.example;
  box.innerHTML=left?`<div class="ph"><b>入力の進み具合 ${done}／${it.length}項目</b><span>あと<em>${left}</em>項目${nx?`（次は「${esc(nx.l)}」）`:''}</span><button class="btn small" data-act="nextempty">次の未入力へ</button></div><div class="pbar"><i style="width:${(done/Math.max(1,it.length)*100).toFixed(1)}%"></i></div>`
    :`<div class="ph"><b>✓ ${LP.mode==='detail'?'くわしく入力の':''}項目はすべて入力済みです</b><span>${LP.mode==='detail'?'下の結果を確認してみましょう。':'年金や利回りも自分の数字にすると、より正確になります。'}</span>${LP.mode==='detail'?'':'<button class="btn small primary" data-act="mode2" data-m="detail">くわしく入力に進む</button>'}</div>`;
  GROUPS.forEach((g,gi)=>{const el=document.getElementById('gl'+gi);if(!el)return;const m=it.filter(x=>x.gi===gi);const l=m.filter(x=>!x.ok).length;el.textContent=!m.length?'':(l?'あと'+l:'✓');el.className='gleft'+(m.length&&!l?' ok':'')});
  return left;
}
function nextEmpty(){
  const S=LP.plans[U.plan];const nx=progItems(S).find(x=>!x.ok);if(!nx)return;
  const el=document.getElementById(nx.id);if(!el)return;const d=el.closest('details');if(d)d.open=true;
  el.scrollIntoView({block:'center',behavior:'smooth'});try{el.focus({preventScroll:true})}catch(e){el.focus()}
}
function updateDock(){
  const S=LP.plans[U.plan]; if(!S) return;
  if(wzHold()){const d=document.getElementById('dockin');if(d)d.innerHTML='<div class="v"><span>質問に答え終わると、ここに結果が出ます</span></div>';return}
  const s=summarize(sim(S),S);
  const left=updateProgress();
  document.getElementById('dockin').innerHTML=`<div class="v"><span>${keys().length>1?U.plan+'：':''}95歳時点の貯蓄<b class="${s.last.bal<0?'neg':''}">${fmt(s.last.bal)} 万円</b></span>${left?`<span>入力<b style="font-size:13px;margin-top:3px">あと${left}項目</b></span>`:''}<span>判定<b style="font-size:13px;margin-top:3px"><span class="chip ${s.st.c}">${s.st.t}</span></b></span></div><button class="btn primary" data-act="toresult">結果を見る</button>`;
}
let rT=0;
function changed(){LP.example=false;saveLP();updateDock();clearTimeout(rT);rT=setTimeout(()=>{renderResult();const d=document.getElementById('diffbox');if(d)d.innerHTML=diffHTML()},250)}


/* ---------- 年金の目安（ねんきん定期便がない人向け） ---------- */
function penEst(){
  const c=U.pc=U.pc||{who:'self',work:'emp',nen:40,yrs:38,inc:500};const P=CFG.pension;
  const basic=P.basic*Math.min(40,Math.max(0,n(c.nen)))/40;
  const hirei=c.work==='emp'?Math.min(n(c.inc),P.incCap)*P.rate/1000*Math.min(50,Math.max(0,n(c.yrs)))/12:0;
  const gross=basic+hirei;
  return{basic,hirei,gross,take:Math.round(gross*P.take*10)/10};
}
function penOut(){const v=penEst();return `<div class="pcres"><span>65歳からの年金の目安</span><b>月 約${v.take}<small>万円（手取り）</small></b><span class="unit">額面 約${(Math.round(v.gross*10)/10)}万円（基礎年金 ${(Math.round(v.basic*10)/10)}万円${v.hirei>0?'＋厚生年金 '+(Math.round(v.hirei*10)/10)+'万円':''}）。税金・社会保険料として約${Math.round((1-CFG.pension.take)*100)}%を差し引いています。</span></div>`}
function penHTML(S){
  const c=U.pc=U.pc||{who:'self',work:'emp',nen:40,yrs:38,inc:500};
  const sel=(k,o)=>`<select id="pc_${k}" data-pc="${k}">${o.map(x=>`<option value="${x[0]}"${c[k]===x[0]?' selected':''}>${x[1]}</option>`).join('')}</select>`;
  const num=(k,l,u,h)=>`<label class="fld"${k!=='nen'?' data-pcemp':''}${k!=='nen'&&c.work!=='emp'?' hidden':''}><span class="lab">${l}</span><span class="inp"><input id="pc_${k}" data-pc="${k}" type="number" inputmode="decimal" value="${esc(c[k])}"><span class="u">${u}</span></span>${h?`<span class="hint">${h}</span>`:''}</label>`;
  return `${teikiHTML()}<details class="sub pcalc" style="margin-top:10px"><summary><b>年金の目安を計算する</b> <span class="unit">ねんきん定期便が手元にないとき</span></summary>
   <div class="macts" style="margin-top:10px"><button class="btn small" data-act="pcfill" data-w="self">ご本人の年収から目安を出す</button>${S.spouse==='yes'?'<button class="btn small" data-act="pcfill" data-w="sp">配偶者の年収から目安を出す</button>':''}</div>
   <p class="unit" style="margin:4px 0 0">上で入れた手取り年収と働く年齢から、下の欄を自動で埋めます。違うところは直してください。</p>
   <div class="fields" id="pcf" style="margin-top:10px">
    <label class="fld"><span class="lab">だれの年金</span>${sel('who',[['self','ご本人'],['sp','配偶者']])}</label>
    <label class="fld"><span class="lab">おもな働き方</span>${sel('work',[['emp','会社員・公務員'],['self','自営業・フリーランス'],['dep','専業主婦（夫）・扶養の範囲で働く']])}</label>
    ${num('nen','国民年金に入る年数','年','20〜60歳のうち保険料を納める（免除を除く）年数。満額は40年')}
    ${num('yrs','会社員として働く年数（合計）','年','厚生年金に入っている年数')}
    ${num('inc','その間の平均の年収（額面・賞与込み）','万円','手取りではなく額面で')}
   </div>
   <div id="pcout">${penOut()}</div>
   <div class="macts"><button class="btn small primary" data-act="pcset">この金額を入れる</button></div>
   <p class="unit" style="margin:6px 0 0">令和8年度の制度の金額をもとにした、ざっくりした目安です。正確な見込み額は「ねんきん定期便」「ねんきんネット」や、厚生労働省の<a href="https://nenkin-shisan.mhlw.go.jp/main.html" target="_blank" rel="noopener">公的年金シミュレーター</a>（ねんきん定期便のQRコードで加入記録を読み込めます）で確認できます。</p></details>`;
}

/* 退職金の手取りの目安（額面と勤続年数から） */
function sevOut(){const c=U.sv,r=retireTax(c.gross,c.yrs),m=x=>(Math.round(x*10)/10).toLocaleString('ja-JP');
  return `<div class="pcres"><span>退職金の手取りの目安</span><b>約${fmt(Math.floor(r.net))}<small>万円</small></b><span class="unit">${r.tax<0.05?`勤続${Math.max(1,Math.ceil(n(c.yrs)))}年の退職所得控除（${fmt(r.ded)}万円）の範囲内なので、税金はかからない計算です。`:`退職所得控除 ${fmt(r.ded)}万円を引いた残りの半分（${m(r.base)}万円）に税金がかかる計算です。税金 約${m(r.tax)}万円（所得税・復興特別所得税 ${m(r.it)}万円、住民税 ${m(r.res)}万円）。`}</span></div>`}
function sevHTML(S){
  const c=U.sv=U.sv||{who:'self',gross:2000,yrs:38};
  const num=(k,l,u,h)=>`<label class="fld"><span class="lab">${l}</span><span class="inp"><input id="sv_${k}" data-sv="${k}" type="number" inputmode="decimal" value="${esc(c[k])}"><span class="u">${u}</span></span>${h?`<span class="hint">${h}</span>`:''}</label>`;
  return `<details class="sub svcalc" data-adv style="margin-top:14px"><summary><b>退職金の手取りを計算する</b> <span class="unit">額面しかわからないとき</span></summary>
   <div class="fields" style="margin-top:10px">
    ${S.spouse==='yes'?`<label class="fld"><span class="lab">だれの退職金</span><select id="sv_who" data-sv="who">${[['self','ご本人'],['sp','配偶者']].map(x=>`<option value="${x[0]}"${c.who===x[0]?' selected':''}>${x[1]}</option>`).join('')}</select></label>`:''}
    ${num('gross','退職金の額面','万円','会社の退職金規程や、人事・総務で確認できます')}
    ${num('yrs','勤続年数','年','1年未満の端数は1年に切り上げて数えます')}
   </div>
   <div id="svout">${sevOut()}</div>
   <div class="macts"><button class="btn small primary" data-act="svset">この金額を入れる</button></div>
   <p class="unit" style="margin:6px 0 0">一時金でまとめて受け取る場合の、一般的な計算式による目安です。勤続5年以下の場合や役員の場合、同じ年にほかの退職金・共済金・iDeCoの一時金を受け取る場合は、計算が変わります。会社に「退職所得の受給に関する申告書」を出していれば、税金は退職金から差し引かれて精算されます。実際の税額は、勤務先や税務署にご確認ください。</p></details>`;
}

function teikiHTML(){
  return `<details class="sub teiki" style="margin-top:14px"><summary><b>「ねんきん定期便」の見方</b> <span class="unit">毎年、誕生月に届くハガキ</span></summary>
   <ol class="steps">
    <li><b>50歳以上の方</b>：「老齢年金の種類と見込額（年額）」の<b>合計</b>を見ます。今の働き方を60歳まで続けた場合の見込みです。<br><span class="unit">年額なので12で割り、税金などを引いた手取りは約9割で考えます（例：年額200万円 → 月約15万円）。</span></li>
    <li><b>50歳未満の方</b>：載っているのは「これまでの加入実績に応じた年金額」で、<b>今までに払った分だけ</b>の金額です。これから働く分が足されるので、実際はもっと増えます。<br><span class="unit">そのまま入れると少なすぎるので、ねんきん定期便のQRコードを読み込める厚生労働省の<a href="https://nenkin-shisan.mhlw.go.jp/main.html" target="_blank" rel="noopener">公的年金シミュレーター</a>（これからの働き方を入れて試算できます）や、「ねんきんネット」の将来の見込額の試算で確認してください。手早く目安を出すなら、下の「年金の目安を計算する」も使えます。</span></li>
    <li><b>手元にない場合</b>：マイナポータルからつながる「ねんきんネット」で、いつでも見られます。</li>
    <li><b>受け取り開始</b>は原則65歳です。60〜75歳の間で早めたり遅らせたりでき、遅らせるほど金額が増えます（上の「受け取り開始」に反映してください）。</li>
   </ol></details>`;
}
function penFill(w){
  const S=LP.plans[U.plan];const sp=w==='sp';
  const net=n(sp?S.sinc:S.inc),age=n(sp?S.sage:S.age),end=Math.min(65,n(sp?S.sworkEnd:S.workEnd)||65);
  const c=U.pc=U.pc||{};c.who=sp?'sp':'self';
  if(net>0){c.work='emp';c.inc=Math.round(net/0.78*0.9);c.yrs=Math.max(0,Math.min(43,Math.round(end-22)))}else{c.work=sp?'dep':'self';c.inc=0;c.yrs=0}
  c.nen=40;
  const box=document.querySelector('.pcalc');if(box){const p=box.parentNode,o=box.open,nw=document.createElement('div');nw.innerHTML=penHTML(S);const nb=nw.querySelector('.pcalc');nb.open=true;p.replaceChild(nb,box)}
  toast('年収から目安を出しました。内容を確かめて「この金額を入れる」を押してください');
}
