/* ---------- 相続の準備チェックシート ---------- */
const CKEY='sainomado-souzoku-v1';
const CHECKS=[
 {g:'財産を把握する',items:[
  ['assets','財産の一覧をつくる','預貯金・証券・保険などの一覧がある','どこに何があるか分からないと、家族は通帳や郵便物から探すことになります。金融機関名だけでも一覧にしておきましょう。'],
  ['land','家・土地の名義を確認する','家・土地の場所と名義を把握している','固定資産税の納税通知書や登記簿で、名義が誰になっているか確認しておきましょう。'],
  ['debt','借入や保証人の契約を確認する','ローンや借入、保証人になっている契約を把握している','借金も相続の対象です。相続放棄は原則として相続を知ってから3か月以内に判断が必要です。'],
  ['basic','相続税がかかりそうか確かめる','相続税がかかりそうか、おおよそ分かっている','相続税には基礎控除（3,000万円＋600万円×法定相続人の数）があります。財産の合計がこれを超えそうなら、早めに専門家へ。']]},
 {g:'家・土地のこと',items:[
  ['touki','名義が古いままの土地を確認する','親や祖父母名義のままの土地がない','2024年4月から相続登記は義務になりました。昔の相続で名義が変わっていない土地も対象です。'],
  ['border','土地の境界を確認する','土地の境界がはっきりしている','境界が不明だと、売るときに測量や隣地との立会いが必要になり、時間と費用がかかります。'],
  ['plan','家を引き継ぐ人・売るかを話し合う','家を誰が引き継ぐか、売るか、話題にしたことがある','住む人がいない家は空き家になりがちです。引き継ぐ人がいないなら、売る・貸すも選択肢です。']]},
 {g:'家族で話しておくこと',items:[
  ['will','遺言書を検討する','遺言書がある、または作るか考えたことがある','遺言書があると、遺産分割の話し合いがスムーズになります。自筆証書遺言は法務局で保管できる制度もあります。'],
  ['talk','家族で相続について話す','家族で相続について話したことがある','元気なうちに考えを伝えておくと、もめごとを防ぎやすくなります。'],
  ['care','介護・医療の希望と、判断能力が下がったときの備えを考える','介護や医療の希望を家族に伝えている','判断能力が下がると、家の売却などの契約ができなくなることがあります。任意後見や家族信託という方法もあります。']]},
 {g:'手続きの準備',items:[
  ['docs','大事な書類の保管場所を家族に伝える','通帳・印鑑・権利証などの保管場所を家族が知っている','どこにあるか分からないと、手続きが止まってしまいます。'],
  ['digital','デジタルの財産をまとめる','ネット銀行・スマホ決済などのログイン情報をまとめている','デジタルの財産は、家族が存在に気づかないこともあります。']]}
];
let CK={};try{const s=localStorage.getItem(CKEY);if(s)CK=JSON.parse(s)||{}}catch(e){}
function vSouzoku(v){
  v.innerHTML=`<div class="wrap"><div class="crumb"><a href="#home">サイのまど</a> › 相続の準備チェックシート（遺す方へ）</div>
  <div class="thead"><h1>相続の準備チェックシート<br><small style="font-size:.6em;color:var(--muted)">遺す方へ</small></h1><p>家や財産を遺す立場の方のためのチェックシートです。相続の準備がどこまでできているかを、12の質問で確かめます。当てはまるものにチェックを入れてください。チェックが付かなかった項目が、これからやることのリストになります。</p>
   <div class="safe">✓ 回答はこの端末の中だけに保存され、どこにも送信されません</div>${souzokuTabs('souzoku')}</div>
  <div id="cscore"></div>
  <div class="checks">${CHECKS.map(g=>`<section class="cgrp"><h2>${g.g}</h2>${g.items.map(it=>`<label class="citem"><input type="checkbox" id="ck_${it[0]}" data-ck="${it[0]}"${CK[it[0]]?' checked':''}><span><b>${esc(it[2])}</b></span></label>`).join('')}</section>`).join('')}</div>
  <section class="result" id="cresult"></section></div>`;
  cRender();
}
function cRender(){
  const all=CHECKS.flatMap(g=>g.items), done=all.filter(i=>CK[i[0]]).length, pct=Math.round(done/all.length*100);
  const st=pct>=80?['good','よく準備できています']:pct>=50?['warn','半分ほど準備できています']:['bad','これから準備を始めましょう'];
  document.getElementById('cscore').innerHTML=`<section class="panel" style="margin-bottom:14px"><div class="ph"><span class="nm">準備の進み具合</span><span class="chip ${st[0]}">${st[1]}</span></div><div class="kv">${kvRow('チェックした項目',done+'<small> / '+all.length+'</small>')}</div><div class="meter" aria-hidden="true"><i style="width:${pct}%"></i></div></section>`;
  const todo=all.filter(i=>!CK[i[0]]);
  document.getElementById('cresult').innerHTML=`<h2>これからやること</h2>${ctaHTML()}
  ${todo.length?`<section class="advice"><ul>${todo.map(i=>`<li><b>${esc(i[1])}</b><br><span class="unit" style="font-size:13px">${esc(i[3])}</span></li>`).join('')}</ul></section>`:'<section class="advice"><p style="margin:0">すべての項目にチェックが付きました。内容が変わったときに見直しましょう。</p></section>'}
  <div class="taxnote">このチェックシートは、一般的な準備の目安を確認するためのものです。相続税の計算や、遺産分割・遺言の内容など個別のご相談にはお答えしていません。税金は税理士、登記は司法書士、遺言や争いごとは弁護士などの専門家にご相談ください。</div>
  ${pageShareHTML('tool')}<div class="sect" style="padding-bottom:0"><h3 style="font-size:16px;margin-bottom:10px">あわせて使いたいツール</h3><div class="tools">${['souzoku2','akiya'].map(id=>toolCard(TOOLS.find(t=>t.href==='#'+id))).join('')}</div></div>`;
}
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset.ck)return;CK[t.dataset.ck]=t.checked;try{localStorage.setItem(CKEY,JSON.stringify(CK))}catch(err){}cRender()});

/* ---------- 相続：遺す方／受け継ぐ方 切り替え ---------- */
function souzokuTabs(cur){
  return `<div class="seg" role="group" aria-label="立場" style="margin-top:12px"><button data-act="sz" data-r="souzoku" aria-pressed="${cur==='souzoku'}">遺す方（親など）</button><button data-act="sz" data-r="souzoku2" aria-pressed="${cur==='souzoku2'}">受け継ぐ方（子など）</button></div>`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="sz"]');if(b){if(window.PAGE)location.href=pageURL(b.dataset.r);else location.hash=b.dataset.r}});

/* ---------- 相続の手続きチェックシート（受け継ぐ方へ） ---------- */
const C2KEY='sainomado-souzoku2-v1';
const PRE=[
 ['p_assets','親の財産の大まかな中身（預貯金・家・保険など）を聞けている','どの金融機関に口座があるかだけでも分かると、手続きの手間が大きく減ります。'],
 ['p_home','実家を将来どうするか、親や兄弟姉妹と話したことがある','誰も住まない実家は空き家になりがちです。売る・貸す・誰かが住むを、元気なうちに話しておくと安心です。'],
 ['p_will','遺言書があるか、どこに保管しているかを知っている','公正証書遺言は公証役場、自筆の遺言は法務局で保管されている場合があります。'],
 ['p_docs','通帳・印鑑・権利証・保険証券のありかを知っている','必要な書類が見つからないと、手続きが止まってしまいます。'],
 ['p_care','親の判断能力が下がったときの備えを話したことがある','認知症などで判断能力が下がると、実家の売却などの契約ができなくなることがあります。任意後見や家族信託という方法があります。'],
 ['p_sib','兄弟姉妹で、相続や介護について話したことがある','誰が何を担うかを早めに共有しておくと、もめごとを防ぎやすくなります。']
];
/* 期限：d=日、m=か月、y=年、ye=年後の12月31日（亡くなった日／相続を知った日から） */
const TL=[
 ['t_shibou','死亡届・火葬許可の申請',{d:7},'市区町村役場。葬儀社が代行することが多い手続きです。',1],
 ['t_nenkin','年金の受給停止の手続き',{d:10},'厚生年金は10日以内、国民年金は14日以内。マイナンバーが登録されていれば省略できる場合があります。',1],
 ['t_hoken','健康保険・介護保険の資格喪失、世帯主の変更',{d:14},'市区町村役場。保険証・介護保険証の返却もこのときに行います。',1],
 ['t_bank','銀行に亡くなったことを伝え、口座の扱いを確認する',{d:14,soft:1},`銀行が亡くなったことを知ると、口座は凍結され、入出金や引き落としが止まります。公共料金などの引き落とし口座は、先に変更しておくと安心です。葬儀費用などが必要なときは、遺産分割の前でも、相続人が単独で一定額を引き出せる「預貯金の仮払い制度」があります（1つの金融機関につき${CFG.karibarai}万円まで、預金額×3分の1×法定相続分が上限）。`,1],
 ['t_will','遺言書があるか確認する',{d:30,soft:1},'相続の進め方が大きく変わるので早めに。自筆の遺言書は家庭裁判所の検認が必要な場合があります（法務局で保管されたものは不要）。',2],
 ['t_kouki','電気・ガス・水道の名義変更・解約',{d:30,soft:1},'住み続ける家族がいれば名義変更、空き家になるなら解約か、管理のために残すかを決めます。引き落とし口座の変更も忘れずに。',2],
 ['t_phone','携帯電話・インターネット・サブスクの解約',{d:30,soft:1},'放っておくと料金がかかり続けます。スマホの中の写真や連絡先、ネット銀行などの情報は、解約前に確認しておきましょう。',2],
 ['t_card','クレジットカードの解約',{d:30,soft:1},'カード会社に連絡して解約します。未払いの利用額は相続の対象（借金）になります。',2],
 ['t_id','運転免許証・パスポート・マイナンバーカードなどの返納',{d:30,soft:1},'免許証は警察署、パスポートは旅券窓口、マイナンバーカードは市区町村役場へ。',2],
 ['t_houki','相続するか、相続放棄・限定承認するかを決める',{m:3},'借金のほうが多い場合などに検討します。期限を過ぎると、原則としてすべて相続したことになります。家庭裁判所で期間を延ばす申立てもできます。',3],
 ['t_jun','準確定申告（亡くなった方の所得税）',{m:4},'亡くなった方に確定申告が必要な所得があった場合です。',3],
 ['t_bunkatsu','遺産分割の話し合い・預金や株の解約・名義変更',{m:10,soft:1},'法律上の期限はありませんが、相続税の申告がある場合はそれまでにまとめるのが一般的です。預金の解約には、遺産分割協議書や戸籍謄本などが必要です。',3],
 ['t_souzokuzei','相続税の申告・納税（かかる場合）',{m:10},'財産の合計が基礎控除を超える場合に必要です。税理士に早めに相談しましょう。',3],
 ['t_isai','遺留分の請求（もらえる分が少ない場合）',{y:1},'遺言などで取り分が最低限の割合を下回る場合の請求です。侵害を知った時から1年以内です。',4],
 ['t_kougaku','高額療養費の請求（入院などで医療費が高額だった場合）',{y:2},'亡くなる前の医療費が上限を超えていれば、払い戻しを受けられます。',4],
 ['t_sousai','葬祭費・埋葬料の申請',{y:2},'加入していた健康保険から支給されます。',4],
 ['t_seiho','生命保険金の請求',{y:3},'受取人が保険会社に請求します。請求の権利は3年で時効になります。保険に入っていたか分からない場合は、生命保険協会の照会制度があります。',4],
 ['t_touki','相続登記（家・土地の名義変更）',{y:3},'2024年4月から義務になりました。不動産を相続で取得したことを知った日から3年以内です。',4],
 ['t_akiya','相続した空き家を売る場合の特例の期限',{ye:3,cap:CFG.akiyaUntil},`相続空き家の3,000万円特例を使う場合、相続から3年後の12月31日までに売る必要があります（${jd(CFG.akiyaUntil)}までの売却が対象）。`,4],
 ['t_izoku','遺族年金・未支給年金の請求',{y:5},'受け取れる家族がいる場合です。請求の権利は5年で時効になります。年金事務所に確認しましょう。',4]
];
const TLG={1:'すぐに（2週間ごろまで）',2:'1か月ごろまでに',3:'10か月ごろまでに',4:'1年以上先の期限'};
let C2={};try{const s=localStorage.getItem(C2KEY);if(s)C2=JSON.parse(s)||{}}catch(e){}
function addTo(d,o){const x=new Date(d.getTime());if(o.d)x.setDate(x.getDate()+o.d);if(o.m)x.setMonth(x.getMonth()+o.m);if(o.y)x.setFullYear(x.getFullYear()+o.y);if(o.ye!=null){x.setFullYear(x.getFullYear()+o.ye,11,31)}if(o.cap){const c=new Date(o.cap+'T00:00:00');if(x>c)return c}return x}
const jdate=d=>`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
function vSouzoku2(v){
  v.innerHTML=`<div class="wrap"><div class="crumb"><a href="#home">サイのまど</a> › 相続の手続きチェックシート（受け継ぐ方へ）</div>
  <div class="thead"><h1>相続の手続きチェックシート<br><small style="font-size:.6em;color:var(--muted)">受け継ぐ方へ</small></h1>
   <p>親などから相続する立場の方のためのチェックシートです。親が元気なうちに確かめておくことと、相続が起きたあとの期限つきの手続きを、順番に確認できます。</p>
   <div class="safe">✓ 回答はこの端末の中だけに保存され、どこにも送信されません</div>${souzokuTabs('souzoku2')}</div>
  <section class="cgrp" style="margin-bottom:14px"><h2>親が元気なうちに</h2>${PRE.map(it=>`<label class="citem"><input type="checkbox" id="c2_${it[0]}" data-c2="${it[0]}"${C2[it[0]]?' checked':''}><span><b>${esc(it[1])}</b><span class="why">${esc(it[2])}</span></span></label>`).join('')}</section>
  <section class="cgrp"><h2>相続が起きたら<small class="unit" style="font-weight:400">期限のある手続き・やること</small></h2>
   <div class="fields" style="margin:4px 0 12px"><label class="fld"><span class="lab">亡くなった日（相続を知った日）</span><input class="txt" type="date" id="c2_date" data-c2date="1" value="${esc(C2.date||'')}"></label></div>
   <div id="c2tl"></div></section>
  <section class="result" id="c2result"></section></div>`;
  c2Render();
}
function c2Render(){
  const box=document.getElementById('c2tl');if(!box)return;
  const base=C2.date?new Date(C2.date+'T00:00:00'):null;
  const today=new Date();today.setHours(0,0,0,0);
  let lastG=0;
  box.innerHTML=(base?'':'<p class="unit" style="margin:0 0 6px">日付を入れると、それぞれの期限日と残り日数が表示されます。</p>')+TL.map(it=>{
    const gh=it[4]!==lastG?`<h3 style="font-size:13.5px;color:var(--brand-ink);margin:14px 0 2px">${TLG[it[4]]}</h3>`:'';lastG=it[4];
    let due='';
    if(base){const d=addTo(base,it[2]);const left=Math.round((d-today)/864e5);
      const chip=C2[it[0]]?'<span class="chip good">済み</span>':it[2].soft?'<span class="chip muted">目安</span>':left<0?'<span class="chip bad">期限を過ぎています</span>':left<=14?`<span class="chip warn">あと${left}日</span>`:`<span class="chip muted">あと${left}日</span>`;
      due=`<span class="why"><b style="display:inline;font-weight:700;color:var(--ink)">${jdate(d)}${it[2].soft?'ごろまでに':'まで'}</b>　${chip}</span>`;}
    const lim=it[2].soft?(it[2].d?(it[2].d<=14?'なるべく早く':'1か月ごろまで'):'相続税の申告までに'):it[2].d?it[2].d+'日以内':it[2].m?it[2].m+'か月以内':it[2].y?it[2].y+'年以内':'3年後の12月31日まで';
    return gh+`<label class="citem"><input type="checkbox" id="c2_${it[0]}" data-c2="${it[0]}"${C2[it[0]]?' checked':''}><span><b>${esc(it[1])}<span class="unit">　目安：${lim}</span></b>${due}<span class="why">${esc(it[3])}</span></span></label>`}).join('');
  const pre=PRE.filter(i=>!C2[i[0]]).length;
  document.getElementById('c2result').innerHTML=`${ctaHTML()}
  <div class="taxnote">期限は一般的な目安です。起算日（亡くなった日、相続を知った日など）は手続きによって異なり、事情によって期限が変わることもあります。相続税の計算や遺産分割など、個別のご相談にはお答えしていません。税金は税理士、登記は司法書士、相続放棄や争いごとは弁護士などの専門家にご相談ください。</div>
  ${pageShareHTML('tool')}<div class="sect" style="padding-bottom:0"><h3 style="font-size:16px;margin-bottom:10px">あわせて使いたいツール</h3><div class="tools">${['akiya','sell','souzoku'].map(id=>toolCard(TOOLS.find(t=>t.href==='#'+id))).join('')}</div></div>`;
}
document.addEventListener('change',e=>{const t=e.target;
  if(t.dataset.c2){C2[t.dataset.c2]=t.checked;try{localStorage.setItem(C2KEY,JSON.stringify(C2))}catch(err){}c2Render()}
  if(t.dataset.c2date){C2.date=t.value;try{localStorage.setItem(C2KEY,JSON.stringify(C2))}catch(err){}c2Render()}});

