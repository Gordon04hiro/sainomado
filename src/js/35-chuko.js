/* ---------- 中古住宅チェックシート（内見・購入前の確認） ---------- */
const CHUKOKEY='sainomado-chuko-v1';
const CHUKO=[
 {g:'法律・権利',items:[
  ['road','道路に2m以上接しているか確かめた','建て替えるには、原則として幅4m以上の道路に2m以上接している必要があります（接道義務）。満たしていないと再建築できず、ローンや売却にも影響します。'],
  ['zone','市街化調整区域かどうか確かめた','市街化調整区域では、建て替えや増築に許可が必要だったり、住宅ローンが出にくかったりします。'],
  ['legal','違反建築・既存不適格がないか確かめた','建ぺい率・容積率をこえた増築などがあると、ローンや将来の建て替えに影響します。建築確認済証・検査済証があるかも確認しましょう。'],
  ['private','前の道路が私道か公道か確かめた','私道の場合、通行や水道管などの工事に、ほかの持ち主の承諾が必要になることがあります。']]},
 {g:'建物',items:[
  ['quake','建築確認の時期（1981年6月以降か）を確かめた','1981年5月31日以前に建築確認を受けた建物は旧耐震基準です。耐震補強の費用や、住宅ローン控除・補助金の条件も確認しましょう。'],
  ['leak','雨漏り・シロアリ・傾きの跡がないか見た','天井や押入れのしみ、床のきしみや傾き、基礎のひび割れを見ておきましょう。見えない部分は専門家の調査が確実です。'],
  ['inspect','建物状況調査（インスペクション）を検討した','専門家が建物の傷みを調べる調査です。購入前に状態がわかり、引き渡し後のトラブルを防ぎやすくなります。'],
  ['insure','既存住宅売買瑕疵保険を検討した','引き渡し後に見つかった欠陥の補修費用を保険でカバーできます。加入には検査が必要です。'],
  ['reform','リフォーム・修繕の履歴を確かめた','屋根・外壁・水回りをいつ直したかで、今後の修繕費の見込みが変わります。']]},
 {g:'土地・周辺',items:[
  ['hazard','ハザードマップで浸水・土砂災害を確かめた','市町村のハザードマップで、浸水や土砂災害の想定を確認しましょう。'],
  ['wall','擁壁・高低差・造成地かどうか確かめた','古い擁壁はつくり直すと高額です。盛土の造成地は地盤も確認しましょう。'],
  ['border','境界がはっきりしているか確かめた','境界標があるか、隣地との境界でもめごとがないかを確認しましょう。'],
  ['around','平日と休日、昼と夜に周辺を歩いた','騒音・交通量・街灯・隣地の空き家や樹木など、住んでから気づくことを減らせます。']]},
 {g:'設備・インフラ',items:[
  ['sewer','下水道か浄化槽か確かめた','浄化槽なら、種類（合併・単独）と点検・清掃・検査の記録を確認します。買ったら管理者変更の届出が必要です。'],
  ['water','水道が公営か私設か確かめた','地域で管理する私設水道の場合、維持費や組合への負担、将来の公営化の費用がかかることがあります。'],
  ['gas','ガス（都市ガス・プロパン）と給湯器の年数を確かめた','給湯器やエアコンなどの設備は、10〜15年ほどで交換が必要になることが多いです。']]},
 {g:'お金と書類',items:[
  ['cost','購入後の修繕・リフォーム費用を見積もった','物件価格のほかに、諸費用（中古は6〜10%程度）と、すぐに必要な修繕費を予算に入れましょう。'],
  ['notice','告知事項（過去の事故・不具合など）を確かめた','販売図面の備考欄や、売主の告知書を確認しましょう。気になる点は契約前に質問します。'],
  ['contract','契約不適合責任の期間・内容を確かめた','個人の売主の場合、責任の期間を短くしたり、免除したりする特約がつくことがあります。重要事項説明書と契約書で確認しましょう。']]}
];
let CHK={};try{const s=localStorage.getItem(CHUKOKEY);if(s)CHK=JSON.parse(s)||{}}catch(e){}
function vChuko(v){
  const all=CHUKO.flatMap(g=>g.items);
  v.innerHTML=`<div class="wrap"><div class="crumb"><a href="#home">サイのまど</a> › 中古住宅チェックシート</div>
  <div class="thead"><h1>中古住宅チェックシート</h1><p>中古住宅を内見するとき・買う前に確かめたい${all.length}のポイントです。確かめたものにチェックを付けると、まだ確かめていないことが一覧になります。スマホを持って内見に行くときにも使えます。</p>
   <div class="safe">✓ チェックはこの端末の中だけに保存され、どこにも送信されません</div>
   <p style="margin:10px 0 0"><button class="btn small ghost" data-act="chukoreset">チェックをすべて外す（次の物件へ）</button></p></div>
  <div id="chscore"></div>
  <div class="checks">${CHUKO.map(g=>`<section class="cgrp"><h2>${g.g}</h2>${g.items.map(it=>`<label class="citem"><input type="checkbox" id="ch_${it[0]}" data-chk="${it[0]}"${CHK[it[0]]?' checked':''}><span><b>${esc(it[1])}</b><span class="unit" style="display:block;font-size:12.5px;margin-top:2px">${esc(it[2])}</span></span></label>`).join('')}</section>`).join('')}</div>
  <section class="result" id="chresult"></section></div>`;
  chRender();
}
function chRender(){
  const all=CHUKO.flatMap(g=>g.items),done=all.filter(i=>CHK[i[0]]).length,pct=Math.round(done/all.length*100);
  const st=pct>=80?['good','よく確かめられています']:pct>=50?['warn','半分ほど確かめました']:['bad','これから確かめましょう'];
  const sc=document.getElementById('chscore');if(!sc)return;
  sc.innerHTML=`<section class="panel" style="margin-bottom:14px"><div class="ph"><span class="nm">確認の進み具合</span><span class="chip ${st[0]}">${st[1]}</span></div><div class="kv">${kvRow('確かめた項目',done+'<small> / '+all.length+'</small>')}</div><div class="meter" aria-hidden="true"><i style="width:${pct}%"></i></div></section>`;
  const todo=CHUKO.map(g=>({g:g.g,items:g.items.filter(i=>!CHK[i[0]])})).filter(g=>g.items.length);
  document.getElementById('chresult').innerHTML=`<h2>まだ確かめていないこと</h2>${ctaHTML()}
   ${todo.length?todo.map(g=>`<section class="advice"><h3>${esc(g.g)}</h3><ul>${g.items.map(i=>`<li><b>${esc(chukoTodo(i[1]))}</b></li>`).join('')}</ul></section>`).join(''):'<section class="advice"><p style="margin:0">すべての項目を確かめました。気になる点は、契約の前に不動産会社や専門家に確認しましょう。</p></section>'}
   <div class="taxnote">このチェックシートは、一般的な確認の目安です。物件ごとの判断は、重要事項説明書や専門家の調査の内容をもとに行ってください。</div>
   <div class="sect" style="padding-bottom:0"><h3 style="font-size:16px;margin-bottom:10px">あわせて使いたいツール</h3><div class="tools">${['loan','koujo'].map(id=>toolCard(TOOLS.find(t=>t.href==='#'+id))).join('')}</div></div>`;
}
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset.chk)return;CHK[t.dataset.chk]=t.checked;try{localStorage.setItem(CHUKOKEY,JSON.stringify(CHK))}catch(err){}chRender()});
document.addEventListener('click',e=>{if(!e.target.closest('[data-act="chukoreset"]'))return;CHK={};try{localStorage.removeItem(CHUKOKEY)}catch(err){}document.querySelectorAll('[data-chk]').forEach(x=>x.checked=false);chRender()});

/* ---------- 信頼できる一次情報リンク集（content/links.yml） ---------- */
function vLinks(v){
  const cats=[...new Set(LINKS.map(l=>l.c))];
  v.innerHTML=`<div class="wrap doc"><div class="crumb"><a href="#home">サイのまど</a> › 一次情報リンク集</div><h1>信頼できる一次情報リンク集</h1>
   <p class="lead">国や自治体など、制度や数字の「もと」になっている公式の情報へのリンクです。記事やツールで目安をつかんだら、最後はここで確かめてください。</p>
   ${cats.map(c=>`<section><h2>${esc(c)}</h2><ul class="links">${LINKS.filter(l=>l.c===c).map(l=>`<li><a href="${esc(l.u)}" target="_blank" rel="noopener">${esc(l.t)}</a>${l.d?`<span>${esc(l.d)}</span>`:''}</li>`).join('')}</ul></section>`).join('')}
   <p class="unit" style="margin-top:18px">リンク先は各機関のサイトです。内容やアドレスが変わることがあります。</p></div>`;
}

/* 「まだ確かめていないこと」の言い方：「〜を確かめた」→「〜の確認」など */
function chukoTodo(t){return t.replace(/を確かめた$/,'の確認').replace(/を検討した$/,'の検討').replace(/を見積もった$/,'の見積もり').replace(/を歩いた$/,'を歩く').replace(/(確かめた|見た)$/,'')}
