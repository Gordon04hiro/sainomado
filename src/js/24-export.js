/* ---------- 出力（Excel・PDF） ---------- */
const PREVIEW=/claude|anthropic/i.test(location.hostname);
const ymd8=()=>{const d=new Date();return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')};
const rnd=v=>Math.round(v);
function loadXLSX(){
  return new Promise((res,rej)=>{
    if(window.XLSX) return res(window.XLSX);
    const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload=()=>res(window.XLSX);s.onerror=()=>rej(new Error('load'));document.head.appendChild(s);
  });
}
function premiseRows(k){
  const S=LP.plans[k];normPlan(S);const A=S.assets;
  const H={rent:'賃貸',own:'持ち家',buy:'これから購入'}[S.house];
  return [['パターン',k+'：'+(LP.names[k]||'')],['開始年',n(S.startY)||Y0],['ご本人の年齢',n(S.age)],['配偶者',S.spouse==='yes'?n(S.sage)+'歳':'なし'],
   ['お子さま',(S.kids||[]).map((c,i)=>'第'+(i+1)+'子 '+c.by+'年生まれ').join('、')||'なし'],
   ['ご本人の手取り年収（万円）',n(S.inc)],['配偶者の手取り年収（万円）',S.spouse==='yes'?n(S.sinc):0],['定年／仕事を辞める年齢',n(S.ret)+'歳／'+n(S.workEnd)+'歳'],['退職金（万円）',n(S.sev)],
   ['年金（月・万円）','本人 '+n(S.pen)+(S.spouse==='yes'?' ／ 配偶者 '+n(S.spen):'')],['住まい',H],['生活費（月・万円）',n(S.live)],['保険料（月・万円）',Math.round(insNow(S)*10)/10],
   ['預貯金（万円）／利回り',n(A.cash.bal)+' ／ '+n(A.cash.rate)+'%'],['NISA（万円）／積立（月）／利回り',n(A.nisa.bal)+' ／ '+n(A.nisa.mon)+' ／ '+n(A.nisa.rate)+'%'],
   ['課税口座（万円）／利回り',n(A.tax.bal)+' ／ '+n(A.tax.rate)+'%'],['iDeCo（万円）／掛金（月）／受取開始',n(A.ideco.bal)+' ／ '+n(A.ideco.mon)+' ／ '+n(A.ideco.recv)+'歳'],
   ['小規模企業共済（万円）／掛金（月）',n(A.kyosai.bal)+' ／ '+n(A.kyosai.mon)],...(S.spouse==='yes'&&['snisa','sideco','skyosai'].some(k=>n(A[k].bal)||n(A[k].mon))?[['配偶者のNISA／iDeCo／共済（万円）',n(A.snisa.bal)+' ／ '+n(A.sideco.bal)+' ／ '+n(A.skyosai.bal)],['配偶者の積立・掛金（月・万円）',n(A.snisa.mon)+' ／ '+n(A.sideco.mon)+' ／ '+n(A.skyosai.mon)]]:[]),['その他の資産（万円）',A.others.map(o=>(o.name||(OTYPE[o.type]||OTYPE.other).l)+' '+n(o.bal)).join('、')||'なし'],['投資用不動産',S.props.length+'件'],['物価上昇率',n(S.infl)+'%']];
}
function cfSheet(r,S){
  const head=['項目',...r.map(x=>x.y+'年')];
  const L=(l,f)=>[l,...r.map(x=>{const v=f(x);return typeof v==='number'?rnd(v):v})];
  const rows=[head,L('ご本人の年齢',x=>x.a),
   L('イベント',x=>x.ev.join('・')),['【収入】'],L('ご本人の収入',x=>x.iSelf),L('配偶者の収入',x=>x.iSp),L('年金',x=>x.iPen),L('児童手当',x=>x.iAl),L('不動産収入（経費差引後）',x=>x.iProp),L('不動産の売却（手取り）',x=>x.iSale),L('iDeCo・共済・保険の受取',x=>x.iAsset),L('一時的な収入',x=>x.iOne),L('収入 合計',x=>x.iTot),
   ['【支出】'],L('生活費',x=>x.eLive),L('住居費',x=>x.eHouse),L('教育費',x=>x.eEdu),L('保険料',x=>x.eIns),L('車',x=>x.eCar),L('不動産ローン返済',x=>x.eProp),L('積立・掛金',x=>x.eSave),L('一時的な支出',x=>x.eOne),L('支出 合計',x=>x.eTot),
   L('年間収支',x=>x.net),['【資産残高】'],L('預貯金',x=>x.cash),L('NISA',x=>x.nisa),L('課税口座',x=>x.taxa),L('iDeCo',x=>x.ideco),L('小規模企業共済',x=>x.kyo),L('その他の資産',x=>x.oth),L('投資からの取り崩し',x=>x.wd),L('金融資産 合計',x=>x.bal)];
  return rows;
}
function bsSheet(r){
  const head=['項目（年末・万円）',...r.map(x=>x.y+'年')];const L=(l,f)=>[l,...r.map(x=>rnd(f(x.bs)))];
  return [head,['【資産】'],L('預貯金',b=>b.cashP),L('NISA',b=>b.nisa),L('課税口座',b=>b.taxa),L('iDeCo',b=>b.ideco),L('小規模企業共済',b=>b.kyo),L('その他の資産',b=>b.oth||0),L('金融資産 計',b=>b.fin),L('自宅',b=>b.hv),L('投資用不動産',b=>b.pv),L('資産 合計',b=>b.at),
   ['【負債】'],L('住宅ローン',b=>b.hl),L('不動産ローン',b=>b.pl),L('資金の不足',b=>b.short),L('負債 合計',b=>b.dt),['【純資産】'],L('純資産',b=>b.nw),L('自己資本比率（%）',b=>b.at>0?b.nw/b.at*100:0)];
}
function plSheet(r){
  const head=['項目（万円）',...r.map(x=>x.y+'年')];const L=(l,f)=>[l,...r.map(x=>rnd(f(x.pl)))];
  return [head,['【収入】'],L('給与（手取り）',p=>p.salary),L('年金',p=>p.pension),L('児童手当',p=>p.allow),L('不動産収入（経費差引後）',p=>p.prop),L('退職金・一時的な収入',p=>p.one),L('保険などの受取',p=>p.ins),L('運用益',p=>p.ret),L('不動産の売却損益',p=>p.gain),L('収入 合計',p=>p.rev),
   ['【費用】'],L('生活費',p=>p.live),L('家賃',p=>p.rent),L('自宅の固定資産税・修繕',p=>p.hcost),L('住宅ローンの利息',p=>p.hint),L('自宅の価値の目減り',p=>p.hdep),L('住宅購入の諸費用',p=>p.buycost),L('教育費',p=>p.edu),L('保険料',p=>p.insp),L('車',p=>p.car),L('一時的な支出',p=>p.ev),L('不動産ローンの利息',p=>p.pint),L('投資用不動産の価値の目減り',p=>p.pdep),L('取り崩し時の税金',p=>p.wtax),L('費用 合計',p=>p.exp),
   L('当期の収支（＝純資産の増減）',p=>p.net)];
}
function yjSheet(){
  const B=LP.budget;if(!B) return null;const AC=LP.actuals||{};
  const rows=[['年','年齢','収入 予算','収入 実績','支出 予算','支出 実績','金融資産 予算','金融資産 実績','金融資産 差']];
  B.rows.forEach(x=>{const v=AC[x.y];if(!v)return;const f=yjFin(v,x);rows.push([x.y,x.a,rnd(x.inc),v.inc===''?'':v.inc,rnd(x.exp),v.exp===''?'':v.exp,rnd(x.fin),f==null?'':rnd(f),f==null?'':rnd(f-x.fin)])});
  rows.push([]);rows.push(['予算',B.name+'（'+B.at+'保存）']);
  (LP.history||[]).forEach(h=>rows.push(['引き直し',h.at,h.y+'年末の実績','95歳時点 '+rnd(h.before)+' → '+rnd(h.after)]));
  return rows;
}
async function exportExcel(){
  let X;try{X=await loadXLSX()}catch(e){toast('Excelの準備ができませんでした。通信状況を確かめてもう一度お試しください');return}
  const wb=X.utils.book_new();const key=U.plan in LP.plans?U.plan:'A';
  const add=(name,aoa,w)=>{const ws=X.utils.aoa_to_sheet(aoa);ws['!cols']=[{wch:w||28},...Array(80).fill({wch:9})];X.utils.book_append_sheet(wb,ws,name)};
  const pr=[];keys().forEach(k=>{pr.push(...premiseRows(k));pr.push([])});
  pr.push(['注意','手取りベースの簡易試算です。税金・社会保険料・住宅ローン控除は含みません。結果は目安で、将来を保証するものではありません。']);
  add('前提条件',pr,34);
  keys().forEach(k=>{const r=sim(clone(LP.plans[k]));add('CF表_'+k,cfSheet(r,LP.plans[k]))});
  const r=sim(clone(LP.plans[key]));add('BS_'+key,bsSheet(r));add('PL_'+key,plSheet(r));
  const yj=yjSheet();if(yj)add('予算と実績',yj,14);
  try{X.writeFile(wb,'サイのまど_ライフプラン_'+ymd8()+'.xlsx');toast(PREVIEW?'プレビュー画面ではファイルを保存できません。公開したサイトでは保存されます':'Excelファイルを保存しました')}
  catch(e){toast('この画面ではファイルを保存できません')}
}
function printReport(){
  const key=U.plan in LP.plans?U.plan:'A', ks=keys(), R={};
  ks.forEach(k=>{const S=LP.plans[k],r=sim(clone(S));R[k]={S,r,s:summarize(r,S)}});
  const cur=R[key], d=new Date();
  const ret=cur.r.find(x=>x.a===Math.round(n(cur.S.workEnd)))||cur.r[cur.r.length-1];
  const el=document.getElementById('printArea');
  el.innerHTML=`<header class="pr-h"><div><b>サイのまど</b> 住まいとお金の無料シミュレーション</div><div>${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 作成</div></header>
   <h1>ライフプラン診断レポート</h1>${LP.example?'<p class="pr-lg">※ 入力例の家族（35歳・夫婦と子ども2人）で計算した結果です。自分の数字を入れると、わが家の結果になります。</p>':''}
   <h2>結果のまとめ</h2><table class="cf"><tbody><tr class="hd"><th>パターン</th><td>判定</td><td>95歳時点の金融資産</td><td>仕事を辞める時</td><td>いちばん少ない時</td><td>95歳時点の純資産</td></tr>
    ${ks.map(k=>{const s=R[k].s;return `<tr><th>${k}：${esc(LP.names[k]||'')}</th><td>${s.st.t}</td><td>${fmt(s.last.bal)}万円</td><td>${fmt(s.retire.bal)}万円</td><td>${s.min.a}歳 ${fmt(s.min.bal)}万円</td><td>${fmt(s.last.bs.nw)}万円</td></tr>`}).join('')}</tbody></table>
   <h2>金融資産の推移</h2>${chartSVG(ks.map(k=>({rows:R[k].r,color:PCOL[k],dash:PDASH[k]})),null,'pr1')}
   <p class="pr-lg">${ks.map(k=>`${k}：${esc(LP.names[k]||'')}`).join('　')}</p>
   <h2>家計の決算書（パターン${key}）</h2>
   <div class="pr-2"><div><h3>今のバランスシート</h3>${bsTable(cur.r.bs0)}</div><div><h3>${ret.a}歳（仕事を辞める年）のバランスシート</h3>${bsTable(ret.bs)}</div></div>
   <div class="pr-2"><div><h3>今年の損益計算書</h3>${plTable(cur.r[0].pl)}</div><div><h3>見どころ</h3><ul>${advice(cur.S,cur.s,cur.r).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>
   <h2 class="pr-break">キャッシュフロー表（パターン${key}・5年ごと／万円）</h2>${cfTable(cur.r,cur.S,5)}
   <h2>前提条件</h2><table class="cf"><tbody>${premiseRows(key).map(x=>`<tr><th>${esc(x[0])}</th><td style="text-align:left">${esc(x[1])}</td></tr>`).join('')}</tbody></table>
   <p class="pr-note">手取りベースの簡易試算です。税金・社会保険料・住宅ローン控除は含みません。教育費は文部科学省「子供の学習費調査」（令和5年度）・日本政策金融公庫「教育費負担の実態調査」（令和3年度）の平均値を使用しています。結果は入力された条件にもとづく目安で、将来の結果を保証するものではありません。</p>`;
  prPrint();
  if(PREVIEW) toast('プレビュー画面では印刷できません。公開したサイトでは、印刷画面で「PDFに保存」を選べます');
}



/* PDF用の印刷（#printArea だけを出す）。ふつうにブラウザで印刷したときは、ページそのものを印刷する */
function prPrint(){document.body.classList.add('printing');try{window.print()}catch(e){}}
window.addEventListener('afterprint',()=>document.body.classList.remove('printing'));
