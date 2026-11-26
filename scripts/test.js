// サイのまど 自動チェック（npm test）
// 公開前に、計算・表示・リンク・共有が壊れていないかを確かめます。1つでも失敗したら公開しません。
const fs=require('fs'),path=require('path');
const {JSDOM,VirtualConsole,ResourceLoader}=require('jsdom');
// 外部のスクリプト（広告・アクセス解析・フォント）は読み込まない。サイトの中のファイルだけでチェックする
class LocalOnly extends ResourceLoader{fetch(url,opts){return url.startsWith('file:')?super.fetch(url,opts):null}}
const loader=new LocalOnly();
const DIST=path.join(__dirname,'..','dist');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let ok=0,ng=0;
const check=(name,cond,info='')=>{if(cond){ok++;console.log('  ✔ '+name)}else{ng++;console.log('  ✖ '+name+(info?'（'+info+'）':''))}};
async function open(file,hash='',init=null){
  const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/fonts\.googleapis|googletagmanager|googlesyndication/.test(e.message))errs.push(e.message)});
  const dom=await JSDOM.fromFile(path.join(DIST,file),{runScripts:'dangerously',resources:loader,url:'file://'+path.join(DIST,file)+hash,pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.print=()=>{w.__printed=true};if(init)init(w)}});
  await wait(600);const w=dom.window;w.__errs=errs;return w;
}
const T=(d,s)=>[...d.querySelectorAll(s)].map(x=>x.textContent.replace(/\s+/g,' ').trim());
const set=(w,id,v)=>{const i=w.document.getElementById(id);i.value=v;i.dispatchEvent(new w.Event('input',{bubbles:true}));i.dispatchEvent(new w.Event('change',{bubbles:true}))};
const click=(w,s)=>w.document.querySelector(s).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));

(async()=>{
  const pages=[];(function walk(d,p=''){for(const f of fs.readdirSync(d)){const q=path.join(d,f);if(fs.statSync(q).isDirectory())walk(q,p+f+'/');else if(f.endsWith('.html'))pages.push(p+f)}})(DIST);

  console.log('\n■ すべてのページが表示できる');
  for(const f of pages){
    if(['ig/index.html','x/index.html','line/index.html','fb/index.html'].includes(f))continue; // 転送だけのページ（別のテストで確認）
    if(f==='404.html'){const h=fs.readFileSync(path.join(DIST,f),'utf8');check(f+'（見つからないページ）',/ページが見つかりません/.test(h)&&/noindex/.test(h)&&/href="\/guide\//.test(h));continue}
    const w=await open(f);const d=w.document;
    check(f,!w.__errs.length&&d.querySelector('#view h1, #view .hero h1'),w.__errs[0]||'見出しがありません');
    const html=fs.readFileSync(path.join(DIST,f),'utf8');
    const bad=(html.match(/href="#(?!tools|contact)[a-z]/g)||[]);
    if(bad.length) check(f+' のリンク',false,'「#」のままのリンク：'+bad[0]);
    const links=[...html.matchAll(/href="([^"#:]+\.html)(#[^"]*)?"/g)].map(m=>m[1]);
    const missing=links.filter(l=>!fs.existsSync(path.join(DIST,path.dirname(f),l)));
    if(missing.length) check(f+' のリンク先',false,'見つからないページ：'+missing[0]);
    w.close();
  }

  console.log('\n■ 売却・住み替えの計算');
  {const w=await open('sell.html');const d=w.document;
   check('入力例の手取りが1,235万円',T(d,'.panel .kv b')[0].startsWith('1,235'),T(d,'.panel .kv b')[0]);
   set(w,'s_buyPrice','2000');set(w,'s_bldPrice','1000');set(w,'s_price','6000');set(w,'s_buyYear',String(new Date().getFullYear()-26));set(w,'s_newPrice','5000');await wait(400);
   const tbl=T(d,'.cfwrap')[1]||'';
   check('3,000万円控除の税金が211万円',/軽減税率）211/.test(tbl),tbl.slice(0,80));
   check('買い替え特例の税金152万円・繰り延べ3,740万円',/特例1523,740/.test(tbl),tbl.slice(0,120));
   set(w,'s_price','700');set(w,'s_feeMode','low');await wait(400);
   check('800万円以下の特例で仲介手数料33万円',T(d,'table.cf tr').some(x=>/^仲介手数料.*▲33$/.test(x)));
   w.close();}

  console.log('\n■ ライフプランの計算');
  {const w=await open('lifeplan.html');const d=w.document;
   check('入力例が「不足なし」',T(d,'.panel .chip')[0]==='不足なし',T(d,'.panel .chip')[0]);
   check('入力例のままなら「入力例の家族の結果です」と表示',!!d.querySelector('#result .exnote'));
   {const ws=await open('sell.html');check('売却の結果に「ライフプラン診断で比べる」ボタン',!!ws.document.querySelector('[data-act="sell2lp"]'));ws.close();const wl=await open('loan.html');check('住宅ローンの結果に「ライフプラン診断で比べる」ボタン',!!wl.document.querySelector('[data-act="loan2lp"]'));wl.close();const wa=await open('akiya.html');check('空き家の結果に「ライフプラン診断で比べる」ボタン',!!wa.document.querySelector('[data-act="akiya2lp"]'));wa.close();}
   const r=w.eval('(()=>{const S=basePlan();S.house="own";S.hval=2800;S.loanPay=8;S.loanEnd=65;S.assets.tax={bal:500,basis:300,rate:3};S.props=[{name:"A",val:1500,vdep:-1,rent:7,vac:10,cost:15,loan:4,loanEnd:60,rate:2,sell:70,price:1200}];return sim(S)})()');
   const mx=Math.max(...r.map(x=>Math.abs(x.pl.chk)));
   check('PLの収支＝純資産の増減（誤差0）',mx<0.001,'最大の誤差 '+mx);
   click(w,'[data-t="goal"]');set(w,'g_target','9000');await wait(700);
   check('目標から逆算が計算できる',/万円\/月/.test(T(d,'.lever')[0]||''),T(d,'.lever')[0]);
   click(w,'[data-t="scen"]');await wait(100);
   check('シナリオと確率が出る',/%/.test(T(d,'.kpi')[0]||''));
   click(w,'[data-act="pdf"]');check('PDF用のレポートが作られる',w.__printed&&d.querySelectorAll('#printArea table').length>3);
   check('入力例では「すべて入力済み」',/すべて入力済み/.test(T(d,'#prog')[0]||''),T(d,'#prog')[0]);
   set(w,'f_live','');await wait(400);
   check('空欄にすると「あと1項目」と出る',/あと1項目/.test(T(d,'#prog')[0]||'')&&/生活費/.test(T(d,'#prog')[0]||''),T(d,'#prog')[0]);
   click(w,'[data-act="nextempty"]');check('「次の未入力へ」で空欄に移動',d.activeElement&&d.activeElement.id==='f_live');
   set(w,'f_live','20');await wait(400);
   check('かんたん入力の資産は「預貯金・投資・毎月の積立」の3項目',!!d.getElementById('ez_inv')&&!!d.getElementById('ez_mon'));
   {const b0=T(d,'.panel .kv b')[0];set(w,'ez_inv','400');await wait(400);
    check('投資の残高を変えると結果が変わる',T(d,'.panel .kv b')[0]!==b0);
    set(w,'ez_inv','200');await wait(400);}
   const before=T(d,'.panel .kv b')[0];
   click(w,'[data-act="pre"][data-for="f_infl"][data-v="3"]');await wait(500);
   check('言葉のボタンで物価上昇率が3%になる',d.getElementById('f_infl').value==='3'&&d.querySelector('[data-act="pre"][data-for="f_infl"][data-v="3"]').getAttribute('aria-pressed')==='true');
   check('ボタンを押すと結果が計算し直される',T(d,'.panel .kv b')[0]!==before,before);
   const o=w.eval(`(()=>{const S=basePlan();S.assets.others=[{type:'crypto',name:'BTC',bal:300,basis:100,mon:1,until:50,rate:0,vol:60,tax:30},{type:'gold',bal:200,basis:'',mon:0,until:60,rate:2,vol:15,tax:20}];
     S.live=40;const r=sim(clone(S));const z=r.map((_,i)=>i%2?-1.5:1.2);const m=sim(clone(S),{z});
     return{chk:Math.max(...r.map(x=>Math.abs(x.pl.chk))),mchk:Math.max(...m.map(x=>Math.abs(x.pl.chk))),oth0:r[0].oth,used:r.some(x=>x.wd>0&&x.oth<r[0].oth),nisaAfter:r.findIndex(x=>x.oth<0.5)<=r.findIndex(x=>x.nisa<0.5)||r.every(x=>x.nisa<0.5),fin:r[0].bs.fin>=r[0].oth}})()`);
   check('その他の資産（暗号資産・金）もPLの収支＝純資産の増減',o.chk<0.001&&o.mchk<0.001,o.chk+' / '+o.mchk);
   check('その他の資産が足りない年に取り崩される（NISAより先）',o.used&&o.nisaAfter);
   check('その他の資産が金融資産に入る',o.oth0>500&&o.fin);
   click(w,'[data-act="mode2"][data-m="detail"]');await wait(300);
   check('使っていない小規模企業共済は入力欄を出さない',!d.getElementById('a_kyosai_bal')&&!!d.querySelector('[data-act="use"][data-k="kyosai"]'));
   check('使っているNISAは入力欄が出る',!!d.getElementById('a_nisa_bal'));
   click(w,'[data-act="use"][data-k="kyosai"]');await wait(300);
   check('小規模企業共済を選ぶと入力欄が出る',!!d.getElementById('a_kyosai_bal'));
   click(w,'[data-act="use"][data-k="kyosai"]');await wait(300);
   check('もう一度押すと消える',!d.getElementById('a_kyosai_bal'));
   {const b0=T(d,'.panel .kv b')[0];click(w,'[data-act="caruse"][data-v="0"]');await wait(300);
    check('車「持たない」で入力欄が消えて結果が変わる',d.querySelector('[data-f="car"]').hidden&&T(d,'.panel .kv b')[0]!==b0);
    click(w,'[data-act="caruse"][data-v="1"]');await wait(300);
    check('車「持っている」で元の金額に戻る',!d.querySelector('[data-f="car"]').hidden&&d.getElementById('f_car').value==='250');}
   click(w,'[data-act="use"][data-k="others"]');await wait(300);
   const ty=d.getElementById('o0_type');check('「その他の資産」を追加できる',!!ty);
   if(ty){ty.value='crypto';ty.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(300);
     check('暗号資産を選ぶと利回り0%・値動き60%になる',d.getElementById('o0_rate').value==='0'&&d.getElementById('o0_vol').value==='60')}
   {const pr=d.getElementById('f_inc')?.closest('.pairrow');check('手取り年収は「ご本人｜配偶者」で並ぶ',!!pr&&pr.contains(d.getElementById('f_sinc'))&&/ご本人/.test(pr.textContent)&&/配偶者/.test(pr.textContent));
    check('配偶者の年金も同じ行に並ぶ',d.getElementById('f_pen')?.closest('.pairrow')?.contains(d.getElementById('f_spen')));}
   check('ねんきん定期便の見方が出る',/50歳未満/.test(d.querySelector('.teiki')?.textContent||''));
   click(w,'[data-act="pcfill"][data-w="self"]');await wait(200);
   check('年収から年金の目安を出せる',+d.getElementById('pc_inc').value>0&&/約\d/.test(T(d,'#pcout b')[0]||''),d.getElementById('pc_inc')?.value);
   set(w,'pc_work','emp');set(w,'pc_nen','40');set(w,'pc_yrs','40');set(w,'pc_inc','600');await wait(100);
   const pc=T(d,'#pcout b')[0]||'';
   check('年金の目安（会社員40年・年収600万円）が月約16.2万円',/約16\.2/.test(pc),pc);
   click(w,'[data-act="pcset"]');await wait(300);
   check('年金の目安を入力欄に入れられる',d.getElementById('f_pen').value==='16.2',d.getElementById('f_pen').value);
   {const q=w.eval(`(()=>{const t1=retireTax(2000,38),t2=retireTax(2500,38);
     const S=basePlan();S.sret=60;S.ssev=300;S.sreinc=100;S.sworkEnd=65;const r=sim(clone(S));const at=x=>r.find(z=>z.sa===x)||{};
     const O=basePlan();delete O.sret;const ro=sim(clone(O));const ao=x=>ro.find(z=>z.sa===x)||{};
     const K=basePlan();K.assets.kyosai={bal:1000,mon:5,until:60,recv:60,rate:0,yrs:20};const rk=sim(clone(K));const k60=rk.find(z=>z.a===60);
     return{t1:t1.tax,t2:Math.round(t2.tax*10)/10,sp62:at(62).iSp,sp66:at(66).iSp,ssev:(at(60).ev||[]).includes('配偶者の退職金'),old59:ao(59).iSp>0,old60:ao(60).iSp,
       kyo:Math.abs(k60.iAsset-retireTax(2500,20).net)<0.01}})()`);
    check('退職金の税金：2,000万円・勤続38年は0円、2,500万円は約34.5万円',q.t1===0&&q.t2===34.5,q.t1+' / '+q.t2);
    check('配偶者の定年後の収入（再雇用・パート）が入る',q.sp62===100&&q.sp66===0,q.sp62+' / '+q.sp66);
    check('配偶者の退職金が定年の年に入る',q.ssev);
    check('古いデータ（配偶者の定年なし）は今までどおり',q.old59&&q.old60===0);
    check('小規模企業共済は退職所得の税金を引いて受け取る',q.kyo);}
   {const q=w.eval(`(()=>{const S=basePlan();S.insl=[{name:'夫',who:'self',mon:1.5,end:60},{name:'妻',who:'sp',mon:1,end:65}];const r=sim(clone(S));
     const at=x=>r.find(z=>z.a===x)||{};return{a40:at(40).eIns,a60:at(60).eIns,a66:at(66).eIns,a68:at(68).eIns}})()`);
    check('保険を1件ずつ：夫婦で払い終わる年齢が違う',q.a40===30&&q.a60===12&&q.a66===12&&q.a68===0,JSON.stringify(q));}
   {const q=w.eval(`(()=>{const S=basePlan();normPlan(S);const A=S.assets;A.snisa={bal:100,mon:1,until:50,rate:0};A.sideco={bal:200,mon:1,until:60,recv:63,mode:'lump',yrs:10,rate:0};A.skyosai={bal:300,mon:0,until:60,recv:60,rate:0,yrs:30};
     const r=sim(clone(S));const at=x=>r.find(z=>z.sa===x)||{};const B=sim(clone(Object.assign(clone(S),{spouse:'no'})));
     const z=r.map((_,i)=>i%2?-1:1);const m=sim(clone(S),{z});
     return{n0:r[0].nisaS,n50:at(50).nisaS,n51:at(51).nisaS,save40:at(40).eSave-at(51).eSave,ide:(at(63).ev||[]).includes('配偶者のiDeCo 受取'),ide64:at(64).idecoS,kyo:(at(60).ev||[]).includes('配偶者の共済金 受取'),
       chk:Math.max(...r.map(x=>Math.abs(x.pl.chk))),mchk:Math.max(...m.map(x=>Math.abs(x.pl.chk))),noSp:B[0].nisaS,ez:easySums(S).inv}})()`);
    check('配偶者のNISA：配偶者の年齢で積立が止まる',q.n50>q.n0&&Math.abs(q.n51-q.n50)<0.01&&q.save40>=12,JSON.stringify(q));
    check('配偶者のiDeCo・共済：配偶者の年齢で受け取る',q.ide&&q.ide64===0&&q.kyo);
    check('配偶者の口座があってもPLの収支＝純資産の増減',q.chk<0.001&&q.mchk<0.001,q.chk+' / '+q.mchk);
    check('配偶者が「いない」なら配偶者の口座は使わない',q.noSp===0);
    check('かんたん入力の投資の合計に配偶者の分も入る',q.ez>=600,q.ez);}
   set(w,'sv_gross','2500');set(w,'sv_yrs','38');await wait(100);
   check('退職金の手取りを計算できる',/約2,465/.test(T(d,'#svout b')[0]||''),T(d,'#svout b')[0]);
   click(w,'[data-act="svset"]');await wait(300);
   check('退職金の手取りを入力欄に入れられる',d.getElementById('f_sev').value==='2465',d.getElementById('f_sev').value);
   click(w,'[data-act="mode2"][data-m="guide"]');await wait(300);
   check('「質問に答えて入力」で質問が1問ずつ出る',!!d.getElementById('wz')&&/質問 1 \//.test(d.querySelector('.wzhead span')?.textContent||''));
   set(w,'w_age','40');click(w,'#wz [data-act="wznext"]');await wait(100);
   click(w,'#wz [data-act="wzset"][data-k="spouse"][data-v="no"]');await wait(100);
   {const t2=d.getElementById('wz').textContent;click(w,'#wz [data-act="wzprev"]');await wait(100);
    check('質問の答えが診断の入力に入る（戻っても残る）',t2.includes('配偶者')&&d.getElementById('w_age')?.value==='40',d.getElementById('w_age')?.value);}
   check('質問の途中は結果を出さない',d.getElementById('result').hidden===true);
   w.close();}

  {const w=await open('index.html'),d=w.document;check('トップに「目的から選ぶ」タブが4つある',d.querySelectorAll('.purpose [data-ptab]').length===4&&d.querySelectorAll('.pgroup').length===4);
   check('最初は1つ目のグループだけ表示',!d.getElementById('p-buy').hidden&&d.getElementById('p-sell').hidden&&d.getElementById('p-life').hidden);
   click(w,'[data-ptab="p-inherit"]');check('タブを押すとそのグループだけ表示',!d.getElementById('p-inherit').hidden&&d.getElementById('p-buy').hidden&&d.querySelector('[data-ptab="p-inherit"]').getAttribute('aria-selected')==='true');
   check('同じアイコンのツールがない（賃貸vs持ち家と中古住宅チェック）',d.querySelector('#p-buy a[href$="chuko.html"] .ic')?.innerHTML!==d.querySelector('#p-buy a[href$="vs.html"] .ic')?.innerHTML);w.close();}
  {const w=await open('lifeplan.html'),d=w.document;
   check('ライフプラン：運用しなかった場合の点線と「運用で増える分」が出る',!!d.querySelector('.nibox')&&/運用で増える分の目安/.test(d.querySelector('.nibox').textContent)&&d.querySelectorAll('#ch1 polyline').length>=2);
   check('運用しなかった場合の95歳時点のほうが少ない',(()=>{const b=[...d.querySelectorAll('.nibox .kv b')].map(x=>parseFloat(x.textContent.replace(/[^0-9.-]/g,'')));return b[0]>0&&b[1]<6174})());w.close();}
  {const w=await open('sell.html'),d=w.document;const a=d.querySelector('.house-ad a');
   check('売却のページに不動産のバナー（「広告」表示・utm付き・新しいタブ）',!!a&&/広告/.test(d.querySelector('.house-ad').textContent)&&/utm_campaign=kj_re&utm_content=tool_sell/.test(a.href)&&/kj-re-wide/.test(d.querySelector('.house-ad img').getAttribute('src'))&&a.target==='_blank'&&!/noreferrer/.test(a.rel));w.close();}
  {const w=await open('souzokuzei.html');check('相続税のページには相続のバナー',/kj-souzoku-wide/.test(w.document.querySelector('.house-ad img')?.getAttribute('src')||''));w.close();}
  {const w=await open('lifeplan.html');check('ライフプラン診断にはライフプランのバナー',/kj-lp-wide/.test(w.document.querySelector('.house-ad img')?.getAttribute('src')||''));w.close();}
  {const w=await open('links.html');check('関係ないページには自社の広告は出ない',!w.document.querySelector('.house-ad'));w.close();}
  {const w=await open('loan.html'),d=w.document;
   check('住宅ローン：最初は変動金利の目安（1.5%）',d.getElementById('g_loan_rtype').value==='hendo'&&d.getElementById('g_loan_rate').value==='1.5',d.getElementById('g_loan_rate').value);
   set(w,'g_loan_rtype','flat');await wait(400);
   check('全期間固定を選ぶと金利の目安（3.8%）が入り、説明が出る',d.getElementById('g_loan_rate').value==='3.8'&&/全期間固定/.test(d.getElementById('gresult').textContent),d.getElementById('g_loan_rate').value);
   set(w,'g_loan_rate','2.1');await wait(100);
   check('金利を直すと「自分で入れる」になる',d.getElementById('g_loan_rtype').value==='custom');w.close();}
  {const w=await open('lifeplan.html'),d=w.document;check('年金の案内に公的年金シミュレーター（厚生労働省）のリンク',!!d.querySelector('a[href="https://nenkin-shisan.mhlw.go.jp/main.html"]'));w.close();}
  console.log('\n■ 入力の使いやすさ');
  {const w=await open('loan.html'),d=w.document;
   set(w,'g_loan_income','6000000');await wait(50);
   check('万円の欄に円のつもりの数字を入れると注意が出る',/単位は「万円」/.test(d.querySelector('.unitwarn')?.textContent||''));
   set(w,'g_loan_income','650');await wait(350);
   check('直すと注意が消える',!d.querySelector('.unitwarn'));
   check('入力を変えると「入力例に戻す」が出る',d.querySelector('.resetrow')?.hidden===false);
   click(w,'[data-act="gtreset"]');await wait(100);
   check('「入力例に戻す」で例の数字に戻る',d.getElementById('g_loan_income').value==='600',d.getElementById('g_loan_income').value);
   click(w,'#toast [data-act="gtundo"]');await wait(100);
   check('「元に戻す」で直前の入力に戻る',d.getElementById('g_loan_income').value==='650',d.getElementById('g_loan_income').value);
   w.close();}

  console.log('\n■ 入口ツールの計算');
  {const w=await open('rent2buy.html');check('家賃9万円で買える家が2,417万円',(T(w.document,'.panel .kv b')[0]||'').startsWith('2,417'),T(w.document,'.panel .kv b')[0]);w.close();}
  {const w=await open('prepay.html');const b=T(w.document,'.panel .kv b');const s=parseFloat(b[0].replace(/,/g,'')),l=parseFloat(b[3].replace(/,/g,''));
   check('繰上げ返済：期間短縮のほうが利息が多く減る',s>l&&l>0,b.join(' / '));w.close();}
  {const w=await open('souzokuzei.html');const d=w.document;check('相続税チェック：入力例は基礎控除の範囲内',T(d,'.panel .chip')[0]==='基礎控除の範囲内の見込み');
   set(w,'g_souzokuzei_cash','4000');await wait(400);check('預貯金を増やすと「超える可能性」になる',T(d,'.panel .chip')[0]==='基礎控除を超える可能性');
   set(w,'g_souzokuzei_kids','3');await wait(400);check('子どもの人数から法定相続人を数える（配偶者＋子3人＝4人）',/600万円×4人/.test(d.getElementById('gresult').textContent));
   set(w,'g_souzokuzei_kids','0');await wait(100);check('子どもがいないときは親の人数を聞く',!d.querySelector('[data-gf="souzokuzei_parents"]').hidden);w.close();}
  {const w=await open('koujo.html');const d=w.document;check('住宅ローン控除：年収から目安で計算（源泉徴収票の欄は隠れる）',!d.querySelector('[data-gf="koujo_gross"]').hidden&&d.querySelector('[data-gf="koujo_itax"]').hidden);
   check('年収600万円なら所得税は約14.5万円の目安（2026年の基礎控除104万円で計算）',/所得税は年約14\.5万円/.test(d.getElementById('gresult').textContent));w.close();}

  {const w=await open('chukai.html');const d=w.document;check('仲介手数料：3,000万円なら上限1,056,000円（3%＋6万円＋消費税）',/^1,056,000/.test(T(d,'.panel .kv b')[0]||''),T(d,'.panel .kv b')[0]);set(w,'g_chukai_price','600');await wait(400);check('600万円なら原則264,000円・特例33万円も表示',/^264,000/.test(T(d,'.panel .kv b')[0]||'')&&/330,000/.test(d.getElementById('gresult').textContent),T(d,'.panel .kv b')[0]);w.close();}
  {const w=await open('zoyo.html');const d=w.document;const b=T(d,'.panel .kv b');check('贈与税：親から1,000万円（省エネ等住宅）なら、特例なし177万円・非課税の特例で0円',/^177/.test(b[0]||'')&&/^0/.test(b[2]||''),b.join('/'));set(w,'g_zoyo_amount','1500');await wait(400);const b2=T(d,'.panel .kv b');check('1,500万円なら非課税の特例で48.5万円・相続時精算課税で0円',/^48.5/.test(b2[2]||'')&&/^0/.test(b2[4]||''),b2.join('/'));w.close();}
  {const w=await open('furusato.html');const d=w.document;
   check('ふるさと納税：年収600万円・独身なら上限の目安は約77,000円（総務省の表と同じ）',/約77,000/.test(T(d,'.panel .kv b')[0]||''),T(d,'.panel .kv b')[0]);
   set(w,'g_furusato_sp','yes');set(w,'g_furusato_dep','1');await wait(400);
   check('配偶者控除と高校生1人で約57,000円（2026年の基礎控除の引上げで所得税率が5%になり、総務省の表の約60,000円より少し下がる）',/約57,000/.test(T(d,'.panel .kv b')[0]||''),T(d,'.panel .kv b')[0]);
   set(w,'g_furusato_loanKoujo','first');await wait(400);check('住宅ローン控除1年目はワンストップ特例が使えないと出る',/ワンストップ特例は使えません/.test(d.getElementById('gresult').textContent));w.close();}
  console.log('\n■ 住宅ローン控除・法定相続分');
  {const w=await open('koujo.html');const d=w.document;
   check('住宅ローン控除：13年分の表が出る',d.querySelectorAll('#gresult table.cf tr').length===15,String(d.querySelectorAll('#gresult table.cf tr').length));
   check('住宅ローン控除：1年目は約24万円',/^24/.test(T(d,'.panel .kv b')[1]||''),T(d,'.panel .kv b')[1]);
   set(w,'g_koujo_type','new_eco');set(w,'g_koujo_year','2028');await wait(400);
   check('省エネ基準の新築は2028年入居だと対象外と出る',/2027年までに住み始める/.test(T(d,'.advice')[0]||''));
   w.close();}
  {const w=await open('souzokubun.html');const d=w.document;const rows=()=>T(d,'#gresult table.cf tr');
   check('法定相続分：配偶者1/2・子1/4・遺留分1/4と1/8',/^配偶者1\/22,500万円1\/4/.test(rows()[1]||'')&&/1\/41,250万円1\/8/.test(rows()[2]||''),rows().join(' / '));
   set(w,'g_souzokubun_kids','0');set(w,'g_souzokubun_sibs','2');await wait(400);
   check('配偶者と兄弟姉妹：3/4と1/8、配偶者の遺留分1/2・兄弟姉妹なし',/^配偶者3\/43,750万円1\/2/.test(rows()[1]||'')&&/1\/8625万円なし$/.test(rows()[2]||''),rows().join(' / '));
   w.close();}

  {const w=await open('chuko.html');const d=w.document;const n0=d.querySelectorAll('#chresult li').length;
   const c=d.querySelector('[data-chk="road"]');c.checked=true;c.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(100);
   check('中古住宅チェック：チェックすると「まだ確かめていないこと」が1つ減る',d.querySelectorAll('#chresult li').length===n0-1,n0+'→'+d.querySelectorAll('#chresult li').length);
   w.close();}
  {const h=fs.readFileSync(path.join(DIST,'links.html'),'utf8');check('一次情報リンク集にリンクが並ぶ',(h.match(/class="links"/g)||[]).length>=4);}

  console.log('\n■ 結果の共有');
  for(const f of ['lifeplan.html','sell.html','loan.html','rent2buy.html','prepay.html','souzokuzei.html','koujo.html','souzokubun.html']){
    const w=await open(f);click(w,'[data-act="share"]');await wait(200);
    const u=w.document.getElementById('shareurl');
    if(!u){check(f+' の共有リンク',false,'リンクが作られません');continue}
    const w2=await open(f,u.value.slice(u.value.indexOf('#')));await wait(200);
    check(f+' の共有リンクを開ける',!!w2.document.querySelector('.shared')&&!w2.__errs.length,w2.__errs[0]);
    w.close();w2.close();
  }

  console.log('\n■ 相続の期限');
  {const w=await open('souzoku2.html');const d=w.document;const i=d.getElementById('c2_date');i.value='2026-10-01';i.dispatchEvent(new w.Event('change',{bubbles:true}));
   const tl=T(d,'#c2tl .citem');
   check('相続放棄は3か月後',tl.some(x=>x.startsWith('相続するか')&&x.includes('2027年1月1日まで')));
   check('相続税の申告は10か月後',tl.some(x=>x.startsWith('相続税の申告')&&x.includes('2027年8月1日まで')));
   w.close();}

  console.log('\n■ ツールの説明');
  for(const f of ['lifeplan','sell','loan','vs','akiya','souzoku','souzoku2','rent2buy','prepay','souzokuzei','koujo','souzokubun','chuko']){
    const h=fs.readFileSync(path.join(DIST,f+'.html'),'utf8');
    check(f+'.html に計算の考え方とよくある質問',/計算の考え方/.test(h)&&/よくある質問/.test(h));
  }
  {const h=fs.readFileSync(path.join(DIST,'sell.html'),'utf8');check('広告コードが空のあいだは、結果の下の案内も出ない',!/cta-aff/.test(h));}
  {const h=fs.readFileSync(path.join(DIST,'index.html'),'utf8');check('トップに検索用のサイト名（サイのまど・さいのまど）が入っている',/"@type":"WebSite","name":"サイのまど","alternateName":\["さいのまど"/.test(h)&&/"@type":"Organization"/.test(h)&&/サイのまど（さいのまど）/.test(h));}
  {const bad=fs.readdirSync(DIST).filter(f=>f.endsWith(".html")).filter(f=>/href="[^"#:]*index\.html"/.test(fs.readFileSync(path.join(DIST,f),"utf8")));check("サイト内リンクに index.html を使っていない（Googleの「代替ページ」を減らす）",bad.length===0,bad.join(","));}
  {const ig=fs.readFileSync(path.join(DIST,"ig","index.html"),"utf8"),x=fs.readFileSync(path.join(DIST,"x","index.html"),"utf8");check("SNS用の短いリンク（/ig・/x）が計測用の印つきのトップへ転送し、検索には出ない",/utm_source=instagram/.test(ig)&&/utm_source=x&/.test(x)&&/noindex/.test(ig+x));}

  console.log('\n■ 共有したときの画像');
  {const bad=pages.map(f=>{const m=fs.readFileSync(path.join(DIST,f),'utf8').match(/og:image" content="https?:\/\/[^/]+\/([^"]+)"/);return m&&!fs.existsSync(path.join(DIST,m[1]))?f:null}).filter(Boolean);
   check('共有画像のファイルがすべてある',!bad.length,bad[0]);}

  console.log('\n■ 検索対策');
  {const sm=fs.readFileSync(path.join(DIST,'sitemap.xml'),'utf8');
   check('ガイド4ページがサイトマップにある',(sm.match(/\/guide\//g)||[]).length===4);
   check('404ページはサイトマップに載らない',!/404/.test(sm));
   const h=fs.readFileSync(path.join(DIST,'articles/sell-cost.html'),'utf8');
   check('記事の途中にツールへの案内がある',/class="toolcta"/.test(h));
   check('記事からテーマのまとめへのリンクがある',/class="hublink"/.test(h));
   check('記事の最後に「この記事を書いた人」がある',/class="authorbox"/.test(h)&&/この記事を書いた人/.test(h));}
  {const stub=w=>{const m={};Object.defineProperty(w,'sessionStorage',{configurable:true,value:{getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>{delete m[k]}}})};
   const w=await open('index.html');stub(w);w.document.querySelector('.hero [data-lpguide]').addEventListener('click',e=>e.preventDefault());click(w,'.hero [data-lpguide]');check('トップの「はじめる」で印が付く',w.sessionStorage.getItem('sainomado-lp-guide')==='1');
   const w2=await open('lifeplan.html');stub(w2);w2.sessionStorage.setItem('sainomado-lp-guide','1');click(w2,'[data-act="mode2"][data-m="easy"]');await wait(300);
   check('入力例のままなら「質問に答えて入力」の1問目から始まる',!!w2.document.getElementById('wz')&&/質問 1 \//.test(w2.document.getElementById('wz').textContent));}
  console.log('\n■ 相場データの集計');
  {const SB=require('./souba.js');
   check('築年の読み取り（西暦・和暦）',SB.builtYear('1995年')===1995&&SB.builtYear('平成7年')===1995&&SB.builtYear('昭和元年')===1926&&isNaN(SB.builtYear('戦前')));
   check('関係者間の取引や面積不明は除く',!SB.clean({Type:'中古マンション等',TradePrice:'20000000',Area:'60',BuildingYear:'2000年',Period:'2025年第1四半期',Remarks:'関係者間取引'})&&!SB.clean({Type:'宅地(土地)',TradePrice:'20000000',Area:'2000㎡以上',Period:'2025年第1四半期'}));
   let seed=1;const rnd=()=>(seed=seed*16807%2147483647)/2147483647;const raw=[];
   for(let i=0;i<600;i++){const age=Math.floor(rnd()*45),y=2021+Math.floor(rnd()*5),city=i%3?'22131':'22132',area=50+Math.floor(rnd()*40),u=(city==='22131'?400000:250000)*(1-age*0.015)*(1+0.03*(y-2021))*(0.85+rnd()*0.3);
     raw.push({Type:'中古マンション等',MunicipalityCode:city,Municipality:city==='22131'?'浜松市中央区':'浜松市東区',TradePrice:String(Math.round(u*area)),Area:String(area),BuildingYear:(y-age)+'年',Period:y+'年第'+(1+Math.floor(rnd()*4))+'四半期',Remarks:''})}
   const A=SB.aggregate('22',raw.map(SB.clean).filter(Boolean));
   check('都道府県・市区町村ごとの単価の幅ができる',A&&A.name==='静岡県'&&A.C['22131'].m.q[1]>A.C['22132'].m.q[1]&&A.C['22131'].m.q[0]<A.C['22131'].m.q[2]);
   {const raw2=raw.map((r,i)=>Object.assign({},r,{DistrictName:i%2?'元城町':'鴨江'}));const A2=SB.aggregate('22',raw2.map(SB.clean).filter(Boolean));check('町名ごとの集計ができる',A2.D['22131']&&A2.D['22131']['元城町'].m.n>=5);}
   check('築年数が古いほど補正が小さい',A.curve.m[0]>A.curve.m[6]&&A.curve.m.every((v,i,a)=>!i||v<=a[i-1]));
   const est=A.C['22131'].m.q[1]*A.curve.m[SB.band(10)]*70/1e4;check('浜松市中央区・築10年・70㎡のめやすが妥当な範囲',est>1500&&est<3000,Math.round(est)+'万円');}
  {const w=await open('index.html');const html=w.document.querySelector('.exgrid').textContent;
   check('トップの結果の例は、保存した入力ではなく入力例で計算する',/3,000万円の家/.test(html)&&/4,500万円の家/.test(html));}
  console.log('\n■ 住宅ローン診断 × ライフプラン');
  {const w0=await open('lifeplan.html');const bp=JSON.parse(w0.eval('JSON.stringify(basePlan())'));w0.close();
   const mem=(lp)=>w=>{const m={'sainomado-lifeplan-v1':JSON.stringify(lp)};const st={getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>{delete m[k]}};Object.defineProperty(w,'localStorage',{configurable:true,value:st});Object.defineProperty(w,'sessionStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}})};
   let w=await open('loan.html');check('ライフプラン未入力なら、入力を案内する',/ライフプラン診断に家族・収入・生活費を入れると/.test(w.document.getElementById('gresult').textContent)&&!w.document.querySelector('.recbox'));w.close();
   const rich=Object.assign({},bp,{inc:900,sinc:400});w=await open('loan.html','',mem({plans:{A:rich},names:{A:'今のまま'},example:false}));
   const t=w.document.querySelector('.recbox');check('ライフプランの入力があると「おすすめの予算」が出る',!!t&&/約[\d,]+万円まで/.test(t.textContent),t&&t.textContent);
   const poor=Object.assign({},bp,{inc:300,sinc:0,spouse:'yes'});const w2=await open('loan.html','',mem({plans:{A:poor},names:{A:'今のまま'},example:false}));
   const t2=w2.document.querySelector('.recbox');check('家計に余裕がないと、家計全体で見た上限がおすすめになる',!!t2&&/家計全体で見た上限/.test(t2.textContent),t2&&t2.textContent);}
  console.log('\n■ ツールのつながり');
  {const w0=await open('lifeplan.html');const bp=JSON.parse(w0.eval('JSON.stringify(basePlan())'));
   check('ライフプランの結果に「次に確かめること」（家を買う計画なら住宅ローン診断）',!!w0.document.querySelector('.nextbox a[href$="loan.html"],.nextbox a[href="#loan"]'),T(w0.document,'.nextbox h3').join('/'));w0.close();
   const mem=(lp)=>w=>{const m={'sainomado-lifeplan-v1':JSON.stringify(lp)};Object.defineProperty(w,'localStorage',{configurable:true,value:{getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>{delete m[k]}}});Object.defineProperty(w,'sessionStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}})};
   const P=Object.assign({},bp,{inc:600});const lp={plans:{A:P},names:{A:'今のまま'},example:false};
   let w=await open('loan.html','',mem(lp));const d=w.document;
   check('住宅ローン診断にライフプランの年収・年齢を引き継ぐ',!d.querySelector('.lpnote2').hidden&&d.getElementById('g_loan_income').value==='770'&&d.getElementById('g_loan_age').value==='35',d.getElementById('g_loan_income').value);w.close();
   w=await open('furusato.html','',mem(lp));check('ふるさと納税に額面の年収（手取りから逆算）を引き継ぐ',w.document.getElementById('g_furusato_gross').value==='770');w.close();
   w=await open('prepay.html');check('繰上げ返済の結果に「ライフプラン診断で比べる」',!!w.document.querySelector('[data-act="gt2lp"][data-id="prepay"]'));w.close();
   w=await open('zoyo.html');check('贈与税の結果に「ライフプラン診断で比べる」',!!w.document.querySelector('[data-act="gt2lp"][data-id="zoyo"]'));w.close();
   w=await open('loan.html');check('ライフプラン未入力なら引き継ぎの表示は出ない',w.document.querySelector('.lpnote2').hidden);w.close();}
  console.log('\n■ 似た記事のまとめ（AdSense対策）');
  {const fs=require('fs');const sm=fs.readFileSync('dist/sitemap.xml','utf8');const t5=fs.readFileSync('dist/articles/tedori-500.html','utf8');
   check('年収別の個別ページは noindex・サイトマップに載らない',/noindex,follow/.test(t5)&&!/tedori-500/.test(sm)&&!/loan-hensai-3000/.test(sm)&&/tedori-hayami/.test(sm));
   check('個別ページから早見表へのリンク',/class="subnote"/.test(t5)&&/tedori-hayami/.test(t5));
   const ai=fs.readFileSync('dist/articles/index.html','utf8');check('記事一覧に年収別の個別ページを並べない',!/tedori-500/.test(ai)&&/tedori-hayami/.test(ai));
   check('ガイドに本文がある',/class="hubbody"/.test(fs.readFileSync('dist/guide/buy.html','utf8')));
   check('お知らせ・リンク集は noindex',/noindex/.test(fs.readFileSync('dist/news.html','utf8'))&&!/news\.html/.test(sm));}
  console.log('\n■ メニュー・導線');
  {const w=await open('sell.html');const d=w.document;
   check('ヘッダーに「目的から探す」とライフプラン診断のボタン',!!d.querySelector('.gmenu')&&!!d.querySelector('.gnav .gcta'));
   check('メニューに4つの目的とガイド',d.querySelectorAll('#mega .mcol').length===4&&d.querySelectorAll('#mega .mguide').length===4);
   click(w,'.gmenu');check('押すとメニューが開く',!d.getElementById('mega').hidden&&d.querySelector('.gmenu').getAttribute('aria-expanded')==='true');
   check('フッターを目的ごとに整理',d.querySelectorAll('footer .fcols .mcol').length===5);
   check('ツールのページに「あわせて使いたいツール」',d.querySelectorAll('.tnext a').length>=2);
   const h=require('fs').readFileSync('dist/articles/sell-cost.html','utf8');check('記事のパンくずにガイド',/<div class="crumb">[^]*?guide\/sell\.html/.test(h));}
  console.log('\n■ 売却相場の目安');
  {const fs=require('fs');const stubFetch=w=>{w.fetch=u=>{const f='dist/'+String(u).replace(/^\.?\//,'');return Promise.resolve(fs.existsSync(f)?{ok:true,json:()=>Promise.resolve(JSON.parse(fs.readFileSync(f,'utf8')))}:{ok:false,status:404})}};
   check('都道府県のデータがある',fs.readdirSync('dist/assets/souba').filter(f=>f.endsWith('.json')).length===47);
   const w=await open('souba.html','',stubFetch);await wait(400);const d=w.document;
   check('東京都・中古マンションで目安が出る',/約[\d,]+万円/.test(d.getElementById('sbresult').textContent),d.getElementById('sbresult').textContent.slice(0,80));
   check('国交省のクレジット表示',/不動産情報ライブラリのAPI機能を使用していますが/.test(d.getElementById('sbresult').textContent));
   click(w,'[data-act="sbedit"][data-w="pref"]');const pq=d.getElementById('sb_prefq');pq.value='しずおか';pq.dispatchEvent(new w.Event('input',{bubbles:true}));
   check('都道府県をよみがなで探せる',d.querySelectorAll('#sb_psug [data-act="sbpref"]').length===1&&!!d.querySelector('#sb_psug [data-c="22"]'));
   click(w,'#sb_psug [data-c="22"]');await wait(400);
   const cq=d.getElementById('sb_cityq');check('静岡県に切り替えると市区町村の候補が出る',!!cq&&d.querySelectorAll('#sb_csug [data-act="sbcity"]').length>=5);
   cq.value='浜松市中央';cq.dispatchEvent(new w.Event('input',{bubbles:true}));const cb=d.querySelector('#sb_csug [data-act="sbcity"]');check('市区町村を入力して探せる',!!cb&&/浜松市中央区/.test(cb.textContent));
   click(w,'#sb_csug [data-act="sbcity"]');await wait(300);
   const txt=d.getElementById('sbresult').textContent;check('浜松市中央区の結果',/浜松市中央区の中古マンション/.test(txt)&&!/全体の取引で計算/.test(txt));
   const m1=+txt.match(/約([\d,]+)万円/)[1].replace(/,/g,'');const ag=d.getElementById('sb_age');ag.value='35';ag.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(50);
   const m2=+d.getElementById('sbresult').textContent.match(/約([\d,]+)万円/)[1].replace(/,/g,'');check('築年数が古いと目安が下がる',m2<m1,m1+'→'+m2);
   click(w,'[data-act="sbk"][data-k="l"]');await wait(50);check('土地に切り替えると築年数の欄が消える',!d.getElementById('sb_age')&&/土地の相場/.test(d.getElementById('sbresult').textContent));
   check('売却シミュレーターへの案内',!!d.querySelector('[data-act="sb2sell"]'));
   check('売却相場から空き家診断・仲介手数料へ',!!d.querySelector('[data-act="sbhand"][data-to="akiya"]')&&!!d.querySelector('[data-act="sbhand"][data-to="chukai"]'));
   click(w,'[data-act="sbk"][data-k="m"]');await wait(300);const tw=d.getElementById('sb_townq');check('浜松市中央区で町名を探せる（最初は取引の多い町名）',!!tw&&d.querySelectorAll('#sb_tsug [data-act="sbtown"]').length>=5);
   tw.value='かみじま';tw.dispatchEvent(new w.Event('input',{bubbles:true}));tw.value='上島';tw.dispatchEvent(new w.Event('input',{bubbles:true}));
   check('入力すると候補が絞り込まれる',[...d.querySelectorAll('#sb_tsug [data-act="sbtown"]')].every(b=>/上島/.test(b.textContent)));
   click(w,'#sb_tsug [data-act="sbtown"][data-t="上島"]');await wait(100);
   check('年ごとの推移のグラフ',!!d.querySelector('.sbtrend polyline'));
   for(let i=0;i<20&&!d.querySelector('.sbchika');i++)await wait(100);
   check('地価公示・地価調査の地点と路線価の案内',!!d.querySelector('.sbchika .ckrow')&&/路線価図/.test(d.querySelector('.sbchika').textContent)&&/国土数値情報/.test(d.querySelector('.sbchika').textContent));
   check('町名を選ぶとその町名で計算し、市区町村全体と比べる',!!d.querySelector('.sbsel')&&/浜松市中央区 上島の中古マンション/.test(d.getElementById('sbresult').textContent)&&/全体の中央値（約[\d,]+万円）より/.test(d.getElementById('sbresult').textContent));}
  console.log('\n■ 数字の入力欄');
  {const w=await open('souba.html');const d=w.document;const a=d.getElementById('sb_age');
   check('数字の入力欄はマイナスにならない（min=0）',[...d.querySelectorAll('#view input[type=number]')].every(i=>i.min!==''));
   a.value='-5';a.dispatchEvent(new w.Event('change',{bubbles:true}));check('マイナスを入れても欄を離れると0に戻る',a.value==='0');
   const w2=await open('lifeplan.html');click(w2,'[data-act="mode2"][data-m="detail"]');await wait(300);const h=w2.document.getElementById('f_hdep');check('住宅の価値の下落率はマイナスを入れられる',!h||h.min==='');}
  console.log('\n■ トップの最初の画面・不足のときの次の一手');
  {const w=await open('index.html');const d=w.document;
   check('最初の画面に、ひとつだけ変えた2パターン（家・車・保険・生活費・教育費）',d.querySelectorAll('.hero .pktabs button').length===5&&d.querySelectorAll('.hero .pkrow').length===2&&/歳で不足/.test(d.querySelector('.hero .peek').textContent)&&/95歳まで不足なし/.test(d.querySelector('.hero .peek').textContent));
   click(w,'.hero [data-act="exsc"][data-k="car"]');check('タブで車の例に切り替わる',/500万円の車を5年ごと/.test(d.querySelector('.hero .peek').textContent));
   check('「診断でわかること」に6つの例',d.querySelectorAll('.exgrid .excard').length===6);
   check('最初の画面に売却相場の入口',!!d.querySelector('.hero a.heroalt[href*="souba"]'));
   const w0=await open('lifeplan.html');const bp=JSON.parse(w0.eval('JSON.stringify(basePlan())'));w0.close();
   const P=Object.assign({},bp,{price:4500});const m={'sainomado-lifeplan-v1':JSON.stringify({plans:{A:P},names:{A:'今のまま'},example:false})};
   const w2=await open('lifeplan.html','',ww=>{Object.defineProperty(ww,'localStorage',{configurable:true,value:{getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>{delete m[k]}}})});
   const fb=w2.document.querySelector('.fixbox');check('家を買う計画で不足が出ると、家の価格をいくら下げればよいかを出す',!!fb&&/物件価格を約[\d,]+万円下げて[\d,]+万円にする/.test(fb.textContent)&&/生活費を月[\d.]+万円/.test(fb.textContent),fb&&fb.textContent);
   click(w2,'.fixbox [data-act="lever"]');await wait(300);check('ボタンで比べるパターンを作る',!w2.document.querySelector('.fixbox')||/パターンB/.test(w2.document.getElementById('view').textContent));}
  {const fs=require('fs');const h=fs.readFileSync('dist/index.html','utf8'),l=fs.readFileSync('dist/lifeplan.html','utf8');
   check('トップとライフプランのページに「7つの見方」（画面の写真つき）',(h.match(/class="lvcard"/g)||[]).length===7&&(l.match(/class="lvcard"/g)||[]).length===7&&['overview','bs','goal','scen','month','yj','cf'].every(k=>fs.existsSync('dist/assets/shots/lp-'+k+'.jpg')));}
  console.log('\n■ ツールからツールへ・わが家のまとめ');
  {const mk=m=>w=>{Object.defineProperty(w,'localStorage',{configurable:true,value:{getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>{delete m[k]}}})};
   const m={};let w=await open('loan.html','',mk(m));
   check('住宅ローン診断の結果に「続けて確かめる」（控除・繰上げ返済）',w.document.querySelectorAll('[data-act="handoff"][data-from="loan"]').length===3);
   try{click(w,'[data-act="handoff"][data-from="loan"][data-i="0"]')}catch(e){}
   const k=JSON.parse(m['sainomado-koujo-v1']||'null');check('押すと住宅ローン控除に借入額・金利が入る',k&&k.loan>0&&k.fromTool==='住宅ローン・購入予算診断'&&!k.example,JSON.stringify(k).slice(0,120));w.close();
   w=await open('koujo.html','',mk(m));check('受け取ったツールに「○○の結果を入れています」',!w.document.querySelector('.lpnote2').hidden&&/住宅ローン・購入予算診断の結果を入れています/.test(w.document.querySelector('.lpnote2').textContent)&&w.document.getElementById('g_koujo_loan').value===String(k.loan));
   check('控除の結果から、ふるさと納税へ',!!w.document.querySelector('[data-act="handoff"][data-from="koujo"]'));w.close();
   w=await open('zoyo.html');check('贈与税の結果から、住宅ローン診断へ',!!w.document.querySelector('[data-act="handoff"][data-from="zoyo"]'));w.close();
   const w0=await open('lifeplan.html');const bp=JSON.parse(w0.eval('JSON.stringify(basePlan())'));w0.close();
   const own=Object.assign({},bp,{house:'own',loanPay:9,loanEnd:65,orate:1});m['sainomado-lifeplan-v1']=JSON.stringify({plans:{A:own},names:{A:'今のまま'},example:false});
   w=await open('lifeplan.html','',mk(m));check('持ち家なら「次に確かめること」に売却相場と売却シミュレーター',!!w.document.querySelector('.nextbox a[href*="souba"]')&&!!w.document.querySelector('.nextbox [data-act="lp2sell"]'));w.close();
   w=await open('matome.html','',mk(m));const t=w.document.getElementById('view').textContent;
   check('わが家のまとめに、ライフプランと住宅ローン控除の結果',/ライフプラン診断　パターンA/.test(t)&&/住宅ローン控除/.test(t)&&!!w.document.querySelector('[data-act="mtprint"]')&&!!w.document.getElementById('mt_memo'));
   {w.print=()=>{};click(w,'[data-act="mtprint"]');const pa=w.document.getElementById('printArea').textContent;
    check('PDFはツールごとに「主な条件」と「結果」、ライフプランは前提・比較・5年ごとの収支',/家計の見通し（ライフプラン診断）/.test(pa)&&/5年ごとの収支/.test(pa)&&/主な条件/.test(pa)&&/住宅ローン控除の目安/.test(pa)&&/借入額/.test(pa));
    const cb=w.document.querySelector('[data-mtsel="koujo"]');check('まとめの各行にPDFに入れるかのチェック（最初は全部オン）',!!cb&&cb.checked&&!!w.document.querySelector('[data-act="mtall"]'));
    cb.checked=false;cb.dispatchEvent(new w.Event('change',{bubbles:true}));check('外した選択は保存される',JSON.parse(m['sainomado-matome-v1']).off.koujo===true);
    click(w,'[data-act="mtprint"]');const pb=w.document.getElementById('printArea').textContent;check('外したツールはPDFに入らない',!/住宅ローン控除の目安/.test(pb)&&/5年ごとの収支/.test(pb));
    click(w,'[data-act="mtall"][data-v="1"]');check('「すべて入れる」で戻る',!JSON.parse(m['sainomado-matome-v1']).off.koujo&&cb.checked);}
   m['sainomado-chuko-v1']=JSON.stringify({road:true});m['sainomado-souzoku2-v1']=JSON.stringify({date:'2026-10-01'});
   w=await open('matome.html','',mk(m));{w.print=()=>{};const v=w.document.getElementById('view').textContent;check('チェックシートの進み具合もまとめに出る',/確認済み 1 \//.test(v)&&/基準日 2026-10-01/.test(v));
    click(w,'[data-act="mtprint"]');const pc=w.document.getElementById('printArea').textContent;check('PDFにチェックシートのまだの項目と期限',/中古住宅チェックシート/.test(pc)&&/まだの手続き/.test(pc)&&/2027年/.test(pc));w.close()}
   {const m2={};let w2=await open('loan.html','',mk(m2));const sv=w2.document.querySelector('.svbar');check('ツールに「名前を付けて保存」',!!sv&&sv.dataset.svtool==='loan');
    const setv=(id,v)=>{const el=w2.document.getElementById(id);el.value=v;el.dispatchEvent(new w2.Event('input',{bubbles:true}))};
    check('保存がないときは1行だけの表示',!!w2.document.querySelector('.svbar.mini')&&!w2.document.getElementById('sv_name'));click(w2,'[data-act="svopenbar"]');
    click(w2,'[data-act="svsave"]');check('何も入れていなければ保存しない',!m2['sainomado-saves-v1']&&/まだ入力がありません/.test(w2.document.querySelector('.svmsg').textContent));
    setv('g_loan_income','600');setv('sv_name','A案');click(w2,'[data-act="svsave"]');setv('g_loan_income','800');setv('sv_name','B案');click(w2,'[data-act="svsave"]');
    const S2=JSON.parse(m2['sainomado-saves-v1']||'{}');check('名前を付けて2件保存できる',S2.loan&&S2.loan.length===2&&S2.loan[0].name==='A案'&&S2.loan[0].d.income==600&&S2.loan[1].d.income==800);
    check('保存したものが一覧に出る',w2.document.querySelectorAll('.svbar .svchip').length===2&&!!w2.document.querySelector('[data-act="svover"]'));
    click(w2,'.svchip [data-act="svload"]');check('呼び出すと入力が書き戻される',JSON.parse(m2['sainomado-loan-v1']).income==600);
    click(w2,'.svchip:nth-child(2) [data-act="svdel"]');check('削除は2回押しで（1回目は確認）',JSON.parse(m2['sainomado-saves-v1']).loan.length===2);click(w2,'.svchip:nth-child(2) [data-act="svdel"]');check('2回目で削除',JSON.parse(m2['sainomado-saves-v1']).loan.length===1);
    w2.close();
    m2['sainomado-saves-v1']=JSON.stringify({loan:S2.loan,sell:[{id:'x1',name:'実家',at:'',d:{price:2000,example:false}}]});m2['sainomado-loan-v1']=JSON.stringify(S2.loan[1].d);
    w2=await open('matome.html','',mk(m2));const tv=w2.document.getElementById('view').textContent;
    check('まとめに保存したものが1件ずつ（今の入力は同じ名前で）',/住宅ローン・購入予算診断：A案/.test(tv)&&/住宅ローン・購入予算診断：B案/.test(tv)&&/売却・住み替えシミュレーター：実家/.test(tv));
    w2.print=()=>{};const ca=w2.document.querySelector('[data-mtsel="loan@'+S2.loan[0].id+'"]');ca.checked=false;ca.dispatchEvent(new w2.Event('change',{bubbles:true}));click(w2,'[data-act="mtprint"]');const pp=w2.document.getElementById('printArea').textContent;
    check('PDFにも1件ずつ入り、外したものは入らない',/住宅ローン・購入予算診断：B案/.test(pp)&&!/：A案/.test(pp)&&/売却・住み替えシミュレーター：実家/.test(pp));w2.close()}
   {const m3={};let w3=await open('hoshou.html','',mk(m3));const tx=()=>w3.document.getElementById('gresult').textContent;
    check('必要保障額：本人・配偶者の両方の結果',/ご本人（夫）が亡くなった場合/.test(tx())&&/配偶者（妻）が亡くなった場合/.test(tx())&&/必要保障額の目安/.test(tx()));
    check('遺族年金：子2人なら基礎年金847,300円＋子の加算243,800円×2と遺族厚生年金（今年184.9万円）',/184\.9万円/.test(tx())&&/遺族基礎年金（子2人分の加算込み）＋遺族厚生年金/.test(tx()));
    check('2028年4月からは子の加算が一律に（194.6万円）',/194\.6万円/.test(tx()));
    check('子どもの独立後は中高齢寡婦加算（40〜64歳）',/遺族厚生年金＋中高齢寡婦加算/.test(tx()));
    check('必要保障額の推移グラフ（2人分）',w3.document.querySelectorAll('#hstr polyline').length===2);
    const setv=(id,v)=>{const el=w3.document.getElementById(id);el.value=v;el.dispatchEvent(new w3.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));el.dispatchEvent(new w3.Event('input',{bubbles:true}))};
    setv('g_hoshou_kid1','');setv('g_hoshou_kid2','');setv('g_hoshou_sage','28');await wait(500);
    check('子のいない30歳未満の妻は、遺族厚生年金が5年だけ',/2026〜2030年（28〜32歳）/.test(tx())&&!/遺族基礎年金/.test(w3.document.querySelector('.hsd table').textContent));
    check('入力は保存され、わが家のまとめに入る',JSON.parse(m3['sainomado-hoshou-v1']).example===false);w3.close();
    w3=await open('matome.html','',mk(m3));check('わが家のまとめに必要保障額',/必要保障額の目安/.test(w3.document.getElementById('view').textContent));w3.close()}
   {const m4={'sainomado-koujo-v1':JSON.stringify({loan:3000,example:false}),'sainomado-furusato-v1':JSON.stringify({gross:600,example:false})};let w4=await open('loan.html','',mk(m4));await wait(1600);
    check('2つ以上のツールを使った人に、わが家のまとめのお知らせ',!!w4.document.getElementById('mtnudge')&&/2つのツールの結果/.test(w4.document.getElementById('mtnudge').textContent));
    check('ヘッダーにわが家のまとめと件数',!w4.document.querySelector('.mtlink').hidden&&w4.document.querySelector('.mtlink .mtn').textContent==='2');
    click(w4,'#mtnudge [data-act="mtnclose"]');check('閉じると覚えておく',!w4.document.getElementById('mtnudge')&&m4['sainomado-mtnudge-v1']==='2');w4.close();
    w4=await open('loan.html','',mk(m4));await wait(1600);check('閉じたあとは、ツールが増えるまで出さない',!w4.document.getElementById('mtnudge'));w4.close();
    w4=await open('loan.html');await wait(1600);check('何も使っていない人には出さない',!w4.document.getElementById('mtnudge')&&w4.document.querySelector('.mtlink').hidden);w4.close()}
   check('わが家のまとめは検索に出さない',/noindex/.test(require('fs').readFileSync('dist/matome.html','utf8')));w.close();
   w=await open('matome.html');check('何も使っていなければ案内を出す',/まだ結果がありません/.test(w.document.getElementById('view').textContent));}
  console.log('\n■ 計測');
  {const w=await open('articles/sell-cost.html');const ev=[];w.gtag=(t,n,p)=>{if(t==='event')ev.push([n,p])};
   const l=w.document.querySelector('.toolcta a');l.addEventListener('click',e=>e.preventDefault());l.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
   const e=ev.find(x=>x[0]==='article_tool_click');check('記事のツール案内を押すと article_tool_click（ツール名・記事名つき）',e&&e[1].tool==='sell'&&e[1].page==='sell-cost'&&e[1].place==='cta',JSON.stringify(ev));
   const w2=await open('lifeplan.html');const ev2=[];w2.gtag=(t,n,p)=>{if(t==='event')ev2.push([n,p])};
   click(w2,'[data-act="mode2"][data-m="detail"]');await wait(300);click(w2,'[data-act="addplan"]');await wait(300);
   check('比べるパターンを追加すると lp_add_pattern',ev2.some(x=>x[0]==='lp_add_pattern'&&x[1].method==='manual'));
   click(w2,'[data-act="pre"][data-for="f_sev"][data-v="0"]');await wait(300);
   check('退職金「なし」で0になる',w2.document.getElementById('f_sev').value==='0'&&w2.document.querySelector('[data-act="pre"][data-for="f_sev"]').getAttribute('aria-pressed')==='true');}

  console.log('\n■ 広告');
  {const bad=pages.filter(f=>/広告枠（/.test(fs.readFileSync(path.join(DIST,f),'utf8')));
   check('「広告枠」の目印が残っていない',!bad.length,bad[0]);
   const w=await open('loan.html');const at=w.document.getElementById('adtail');check('アフィリエイトのコードが空のあいだは、ツールの下には自社の広告だけが出る',!at.querySelector('.pr-box')&&!at.querySelector('.pr-note')&&!!at.querySelector('.house-ad'));w.close();}

  console.log('\n■ サイトマップ');
  {const sm=fs.readFileSync(path.join(DIST,'sitemap.xml'),'utf8');
   const drafts=pages.filter(f=>f.startsWith('articles/')&&f!=='articles/index.html'&&/noindex/.test(fs.readFileSync(path.join(DIST,f),'utf8')));
   check('下書きの記事はサイトマップに載らない',drafts.every(f=>!sm.includes(f)));
   check('トップがサイトマップにある',/<loc>https?:\/\/[^<]+\/<\/loc>/.test(sm));}

  console.log(`\n結果：${ok}件OK、${ng}件NG`);
  process.exit(ng?1:0);
})();
