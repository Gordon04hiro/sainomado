/* ===== サイのまど サイト本体 ===== */
const SITE={name:'サイのまど',sub:'住まいとお金の無料シミュレーション',contactUrl:SITE_CFG.contactForm||''}; /* contactUrl：GoogleフォームのURLを入れると、お問い合わせボタンが有効になります */
const LKEY='sainomado-lifeplan-v1';
const PK=['A','B','C'];
const PCOL={A:'var(--accent)',B:'var(--planB)',C:'var(--planC)'};
const PDASH={A:'',B:'6 4',C:'2 3'};
const IC={
 gift:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="9" width="17" height="4" rx="1"/><path d="M5 13v7.5h14V13M12 9v11.5"/><path d="M12 9C10.5 5.5 7 5.5 7 7.5S10 9 12 9zM12 9c1.5-3.5 5-3.5 5-1.5S14 9 12 9z"/></svg>',
 check:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8.5 12.5l2.2 2.2 4.8-4.8"/></svg>',
 yen:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8l3 3.5L15 8M12 11.5V16M9.5 12.5h5M9.5 14.5h5"/></svg>',
 pie:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5V12l6 6"/><path d="M12 12H3.5"/></svg>',
 key:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/></svg>',
 down:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16M4 10h11M4 15h7"/><path d="M18 12v8m0 0l-3-3m3 3l3-3"/></svg>',
 scale:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 6a3 3 0 006 0zM19 7l-3 6a3 3 0 006 0z"/></svg>',
 plan:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><path d="M5 16l4-5 4 3 6-8"/><circle cx="19" cy="6" r="1.2" fill="currentColor"/></svg>',
 sell:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l7-6 7 6"/><path d="M5 10v9h10v-9"/><path d="M17 14h4m0 0l-2-2m2 2l-2 2"/></svg>',
 loan:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h8"/></svg>',
 inherit:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l3 3v15H6z"/><path d="M9 11l2 2 4-4M9 17h6"/></svg>',
 akiya:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/><path d="M15 8l3 3"/></svg>',
 vs:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M4 8l3-4 3 4"/><path d="M4 8h6v3a3 3 0 01-6 0z"/><path d="M14 13l3-4 3 4"/><path d="M14 13h6v3a3 3 0 01-6 0z"/></svg>'
};
const LOGO='<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M4 16L17 5l13 11" fill="none" stroke="var(--brand)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 14v14h18V14" fill="none" stroke="var(--brand)" stroke-width="3" stroke-linejoin="round"/><circle cx="17" cy="21" r="5.2" fill="var(--coin)"/><path d="M15 18.6l2 2.4 2-2.4M17 21v3.4M15.2 22.2h3.6" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>';

let LP=null;
try{const s=localStorage.getItem(LKEY);if(s)LP=JSON.parse(s)}catch(e){}
if(!LP||!LP.plans||!LP.plans.A) LP={plans:{A:basePlan()},names:{A:'今のまま'},example:true};
let lpT=0;const saveLP=()=>{if(window.__shared)return;clearTimeout(lpT);lpT=setTimeout(()=>{try{localStorage.setItem(LKEY,JSON.stringify(LP))}catch(e){}},300)};
const U={plan:'A',cf:'A',step:5,hi:0};
const keys=()=>PK.filter(k=>LP.plans[k]);
function toast(t){const el=document.getElementById('toast');el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2600)}

/* ---------- routing ---------- */
const ROUTES=['home','lifeplan','sell','loan','rent2buy','prepay','souzoku','souzoku2','souzokuzei','akiya','vs','koujo','souzokubun','furusato','chukai','zoyo','chuko','links','glossary','articles','news','data','about','privacy','fptool'];
function route(){if(window.PAGE)return window.PAGE;const h=(location.hash||'').replace('#','');return ROUTES.includes(h)?h:(h.startsWith('a-')?'article':h.startsWith('g-')?'hub':'home')}
const TITLES={fptool:'自分で使える無料のFPツール',furusato:'ふるさと納税の上限の目安',chukai:'仲介手数料の計算',zoyo:'住宅資金の贈与税の目安',chuko:'中古住宅チェックシート',links:'一次情報リンク集',koujo:'住宅ローン控除の目安',souzokubun:'法定相続分の計算',glossary:'用語集',rent2buy:'家賃と同じ返済で買える家',prepay:'繰上げ返済シミュレーター',souzokuzei:'相続税がかかるかチェック',lifeplan:'ライフプラン診断',sell:'売却・住み替えシミュレーター',loan:'住宅ローン・購入予算診断',souzoku:'相続の準備チェックシート（遺す方へ）',souzoku2:'相続の手続きチェックシート（受け継ぐ方へ）',akiya:'相続した家・空き家の診断',vs:'賃貸vs持ち家 比べる診断',articles:'記事',news:'お知らせ',data:'使っているデータ',about:'サイトについて',privacy:'プライバシーポリシー'};
function go(){
  const r=route();
  document.querySelectorAll('.gnav a').forEach(a=>{if(a.dataset.r===r)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  const v=document.getElementById('view');
  ({home:vHome,lifeplan:vLife,sell:vSell,souzoku:vSouzoku,souzoku2:vSouzoku2,articles:vArticles,news:vNews,data:vData,article:v=>vArticle(v,window.SLUG||location.hash.slice(3)),hub:v=>vHub(v,window.SLUG||location.hash.slice(3)),notfound:v404,glossary:vGlossary,chuko:vChuko,links:vLinks,about:vAbout,fptool:vFpTool,privacy:vPrivacy})[r]?({home:vHome,lifeplan:vLife,sell:vSell,souzoku:vSouzoku,souzoku2:vSouzoku2,articles:vArticles,news:vNews,data:vData,article:v=>vArticle(v,window.SLUG||location.hash.slice(3)),hub:v=>vHub(v,window.SLUG||location.hash.slice(3)),notfound:v404,glossary:vGlossary,chuko:vChuko,links:vLinks,about:vAbout,fptool:vFpTool,privacy:vPrivacy})[r](v):vGen(GDEF[r],v);
  document.getElementById('dock').hidden=!['lifeplan','sell','loan','akiya','vs','rent2buy','prepay','souzokuzei','koujo','souzokubun','furusato','chukai','zoyo'].includes(r);
  if(window.__shared)v.insertAdjacentHTML('afterbegin',sharedBanner());
  if(location.hash==='#tools'){const el=document.getElementById('tools');if(el)setTimeout(()=>el.scrollIntoView(),0)}
  toolInfoTail(r);legalTail(r);adTail(r);setTimeout(fillAds,0);
  if(!['article','hub','notfound'].includes(r))document.title=r==='home'?'サイのまど｜住まいとお金の無料シミュレーション':TITLES[r]+'｜サイのまど';
}
if(!window.PAGE)window.addEventListener('hashchange',()=>{const h=location.hash;if(h.startsWith('#s='))return;go();if(h!=='#tools')scrollTo(0,0)});

/* ---------- home ---------- */
function toolCard(t){return t.href?`<a class="tool" href="${t.href}"><span class="ic">${IC[t.ic]}</span><h3>${t.t}</h3><p>${t.d}</p><span class="go">使ってみる →</span></a>`:`<div class="tool off"><span class="ic">${IC[t.ic]}</span><h3>${t.t} <span class="chip soon">準備中</span></h3><p>${t.d}</p></div>`}
const TOOLS=[
 {ic:'plan',href:'#lifeplan',t:'ライフプラン診断',d:'家族・収入・住まいから、95歳までのキャッシュフロー表（毎年の収支と貯蓄の推移）を作ります。',hide:true},
 {ic:'sell',href:'#sell',t:'売却・住み替えシミュレーター',d:'今の家がいくらで売れたら、住み替えられるか。手取り額とローン残高から逆算します。'},
 {ic:'loan',href:'#loan',t:'住宅ローン・購入予算診断',d:'年収と家族構成から、無理なく返せる借入額と物件価格の目安を出します。'},
 {ic:'inherit',href:'#souzoku',t:'相続の準備チェックシート（遺す方へ）',d:'財産・家・家族との話し合い。遺す立場で準備がどこまでできているか、12問で確認できます。'},
 {ic:'inherit',href:'#souzoku2',t:'相続の手続きチェックシート（受け継ぐ方へ）',d:'親が元気なうちに確かめること と、相続が起きたあとの手続きの期限日を一覧にします。'},
 {ic:'akiya',href:'#akiya',t:'相続した家・空き家の診断',d:'住む・貸す・売る・解体する。費用と手間を並べて比べます。'},
 {ic:'vs',href:'#vs',t:'賃貸vs持ち家 比べる診断',d:'賃貸と購入、戸建てとマンション、新築と中古。生涯の住居費を比べます。'},
 {ic:'key',href:'#rent2buy',t:'家賃と同じ返済で買える家',d:'今の家賃と同じ月々の負担で、いくらの家が買えるかがすぐわかります。'},
 {ic:'down',href:'#prepay',t:'繰上げ返済シミュレーター',d:'期間短縮型と返済額軽減型で、減る利息と毎月の返済を比べます。'},
 {ic:'scale',href:'#souzokuzei',t:'相続税がかかるかチェック',d:'財産の合計が基礎控除を超えそうかを確かめます。税額は計算しません。'},
 {ic:'gift',href:'#furusato',t:'ふるさと納税の上限の目安',d:'年収と家族構成から、自己負担2,000円で済む寄附額の上限の目安を出します。'},
 {ic:'yen',href:'#chukai',t:'仲介手数料の計算',d:'物件の価格から、不動産会社に払う仲介手数料の上限額（消費税込み）を計算します。'},
 {ic:'gift',href:'#zoyo',t:'住宅資金の贈与税の目安',d:'親や祖父母から家の購入資金を援助してもらうときの贈与税を、非課税の特例を使う場合と比べます。'},
 {ic:'yen',href:'#koujo',t:'住宅ローン控除の目安',d:'借入額と家の種類から、住宅ローン控除で毎年いくら戻りそうかを計算します。'},
 {ic:'check',href:'#chuko',t:'中古住宅チェックシート',d:'内見・購入前に確かめたい19のポイント。再建築・耐震・浄化槽・私道など、安さの理由を見落とさない。'},
 {ic:'pie',href:'#souzokubun',t:'法定相続分の計算',d:'家族構成から、相続の割合（法定相続分）と遺留分、金額の目安がわかります。'}
];
/* トップページ：目的から選ぶ入口 */
const PURPOSE=[
 {id:'p-buy',t:'家を買いたい',d:'予算・住宅ローン・賃貸との比較',hub:'buy',tools:['loan','rent2buy','vs','koujo','zoyo','chukai','chuko','prepay']},
 {id:'p-sell',t:'売りたい・住み替えたい',d:'手元に残るお金と、住み替えの資金計画',hub:'sell',tools:['sell','chukai','akiya','loan']},
 {id:'p-inherit',t:'相続・実家のこと',d:'準備・手続きの期限・相続税・空き家',hub:'souzoku',tools:['souzoku','souzoku2','souzokuzei','souzokubun','zoyo','akiya']},
 {id:'p-life',t:'家計・老後のお金',d:'教育費や老後まで、95歳までの収支',hub:'money',tools:['lifeplan','furusato','prepay','koujo']}
];
function purposeHTML(){
  const card=id=>{const t=TOOLS.find(x=>x.href==='#'+id);return t?toolCard(t):''};
  return `<nav class="purpose" aria-label="目的から選ぶ">${PURPOSE.map(p=>`<button type="button" data-jump="${p.id}"><b>${p.t}</b><small>${p.d}</small></button>`).join('')}</nav>
  ${PURPOSE.map(p=>`<div class="pgroup" id="${p.id}"><div class="pghead"><h3>${p.t}</h3>${HUBS.find(h=>h.slug===p.hub)?`<a href="#g-${p.hub}">順番にまとめたガイド →</a>`:''}</div><div class="tools">${p.tools.map(card).join('')}</div></div>`).join('')}`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-jump]');if(!b)return;const el=document.getElementById(b.dataset.jump);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})});
function vHome(v){
  const S=LP.plans.A,r=sim(S),s=summarize(r,S);
  v.innerHTML=`<div class="heroband"><section class="wrap hero">
   <div><div class="k">住まいとお金の無料シミュレーション</div>
    <h1>大きな決断の前に、<br><em>お金の未来</em>を見てみよう。</h1>
    <p>子育て、住まい、老後。人生の大きな決断で、わが家の家計が95歳までどう変わるのかを、数字で確かめられる無料ツールをそろえています。</p>
    <div class="acts"><a class="btn primary big" href="#lifeplan">ライフプラン診断をはじめる</a><a class="btn big ghost" href="#tools">ツール一覧</a></div>
    <div class="promise"><span>登録不要</span><span>入力内容は送信されません</span><span>スマホで5分</span></div></div>
   <div class="hero-art"><div class="heroicon"><img src="${window.BASE||''}assets/icon.svg" width="220" height="220" alt="サイのまどのロゴ（家の中のサイの貯金箱）"></div>
   <div class="peek" aria-label="ライフプラン診断の画面例"><div class="t"><span>入力例：35歳・夫婦と子ども2人・家を購入</span><span class="chip ${s.st.c}">${s.st.t}</span></div>
    <div class="t" style="margin-top:6px"><span>95歳時点の金融資産</span></div><div class="v">${fmt(s.last.bal)}<span class="unit"> 万円</span></div>
    ${chartSVG([{rows:r,color:'var(--accent)'}],null,'peekc')}</div></div>
  </section></div>
  <section class="wrap trust" aria-label="サイのまどの約束">
   <div><span class="ti">${IC.plan}</span><span><b>登録不要・無料</b>名前もメールも要りません</span></div>
   <div><span class="ti"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg></span><span><b>入力は送信されません</b>計算はお使いの端末の中だけ</span></div>
   <div><span class="ti"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-5h6v5"/></svg></span><span><b>宅地建物取引士が作成</b>売買・相続の現場の目線で</span></div>
   <div><span class="ti"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h4"/></svg></span><span><b>データの出典を公開</b><a href="#data">使っているデータ</a>で確認できます</span></div>
  </section>
  <section class="wrap sect" id="tools"><h2>ツール</h2><p class="lead">どれも無料・登録不要。計算はお使いの端末の中だけで行います。まず家計全体を見るなら、ライフプラン診断から。</p>
   <div class="tools">
    <a class="tool feat" href="#lifeplan"><span class="ic">${IC.plan}</span><span><h3>ライフプラン診断</h3><p>家族・収入・住まいを入れると、毎年の収支と貯蓄の推移がわかります。住宅購入あり・なしなど、3パターンまで比べられます。</p></span><span class="go">はじめる →</span></a>
   </div>
   <h2 style="margin-top:28px">目的から選ぶ</h2><p class="lead">いまの状況に近いものを選んでください。</p>
   ${purposeHTML()}</section>
  ${adUnit('一覧の中')?`<section class="wrap sect">${adUnit('一覧の中')}</section>`:''}
  <section class="wrap sect"><h2>安心してお使いいただくために</h2><p class="lead">サイのまどは、一般的な情報と計算の目安をお届けするサイトです。専門家の仕事にあたることは行っていません。</p>
   <div class="stance">
    <div><b>税金</b><span>表示する税金は一般的な計算式による計算例です。個別の税額計算・申告・税務相談は行いません（税理士法）。</span></div>
    <div><b>法律・相続の手続き</b><span>個別の法律相談や交渉・代理、登記や遺言書などの書類作成は行いません（弁護士法・司法書士法・行政書士法）。</span></div>
    <div><b>お金の運用</b><span>特定の金融商品の勧誘や投資の助言は行いません。利回りは入力された前提による仮定です（金融商品取引法）。</span></div>
    <div><b>不動産の取引</b><span>このサイトで売買・賃貸の仲介や価格の査定は行いません。金額は入力条件による目安です。</span></div>
    <div><b>保険</b><span>保険の募集・勧誘は行いません。</span></div>
    <div><b>情報の新しさ</b><span>制度・数値は${jd(CFG.checked)}時点の内容で、毎年見直しています。期限が過ぎた制度は、ツールの画面でお知らせします。</span></div>
   </div>
   <p class="unit" style="margin-top:10px">ご自身の状況にもとづく判断は、税理士・弁護士・司法書士などの専門家にご相談ください。くわしくは<a href="#privacy">プライバシーポリシー・免責事項</a>をご覧ください。</p></section>
  <section class="wrap sect"><h2>サイのまどの考え方</h2><p class="lead">住まいの決断は、金額も大きく、やり直しがききません。</p>
   <div class="why"><div><b>家だけでなく、家計全体で見る</b>ローンが払えるかだけでなく、教育費や老後まで続けて見ないと、本当に大丈夫かはわかりません。</div>
   <div><b>個人情報を預からない</b>計算はブラウザの中だけ。名前やメールアドレスの登録もありません。</div>
   <div><b>不動産の実務家が作成</b>住まいの売買や相続の相談を受けている宅地建物取引士が、現場の目線で作っています。</div></div></section>
  <section class="wrap sect"><h2>テーマから探す</h2><p class="lead">やることを順番に、ツールと記事でたどれます。</p>
   <div class="tools hubs">${HUBS.map(hubCard).join('')}</div></section>
  <section class="wrap sect"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><h2>新着記事</h2><a href="#articles" class="unit">記事の一覧へ →</a></div><p class="lead">家を買う・売る・相続する前に知っておきたい基本をまとめています。</p>
   <div class="tools">${pubArticles().slice(0,3).map(artCard).join('')}</div></section>
  <section class="wrap sect"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><h2>お知らせ</h2><a href="#news" class="unit">すべて見る →</a></div>
   <ul class="news">${NEWS.slice(0,3).map(x=>`<li><span class="num">${x.d.replace(/-/g,'.')}</span><span>${esc(x.t)}</span></li>`).join('')}</ul>
   <p class="unit">ツールの計算に使っている制度・数値は<a href="#data">使っているデータ</a>で公開しています（${jd(CFG.checked)}確認）。</p></section>`;
}

