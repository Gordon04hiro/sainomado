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
async function open(file,hash=''){
  const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/fonts\.googleapis|googletagmanager|googlesyndication/.test(e.message))errs.push(e.message)});
  const dom=await JSDOM.fromFile(path.join(DIST,file),{runScripts:'dangerously',resources:loader,url:'file://'+path.join(DIST,file)+hash,pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.print=()=>{w.__printed=true}}});
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
   click(w,'[data-act="addoth"]');await wait(300);
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

  {const w=await open('index.html'),d=w.document;check('トップに「目的から選ぶ」入口が4つある',d.querySelectorAll('.purpose [data-jump]').length===4&&d.querySelectorAll('.pgroup').length===4);
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
   check('記事からテーマのまとめへのリンクがある',/class="hublink"/.test(h));}

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
