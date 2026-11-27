// サイのまど サイトを作る（npm run build）
// content/ と src/ から dist/ に公開用ファイルを書き出します。
const fs=require('fs'),path=require('path');
const yaml=require('js-yaml');
const {marked}=require('marked');
const {JSDOM}=require('jsdom');
const R=p=>path.join(__dirname,'..',p);
const read=p=>fs.readFileSync(R(p),'utf8');
// YAMLの日付は文字列にそろえる
const norm=o=>{if(o instanceof Date)return o.toISOString().slice(0,10);if(Array.isArray(o))return o.map(norm);if(o&&typeof o==='object'){const r={};for(const k in o)r[k]=norm(o[k]);return r}return o};
const Y=p=>norm(yaml.load(read(p)));
const fail=m=>{console.error('\n✖ '+m+'\n');process.exit(1)};

// ---- 設定とデータ
const SITE=Y('content/site.yml');
const RULES=Y('content/rules.yml');
const SOURCES=Y('content/sources.yml');
const NEWS=Y('content/news.yml');
const PAGES=Y('content/pages.yml');
const HUBS_RAW=fs.existsSync(R('content/hubs.yml'))?(Y('content/hubs.yml')||{}):{};
const AFF=fs.existsSync(R('content/affiliates.yml'))?(Y('content/affiliates.yml')||{}):{};
const SITE_URL=String(SITE.url||'').replace(/\/+$/,'');
if(!/^https?:\/\//.test(SITE_URL)) fail('site.yml の url が正しくありません');
const jd=d=>{const [y,m,dd]=String(d).split('-').map(Number);return `${y}年${m}月${dd}日`};
// 印紙税の上限 null は「上限なし」
RULES.stamp=(RULES.stamp||[]).map(([a,b])=>[a==null?'Infinity':a,b]);
if(!RULES.koujo||!RULES.koujo.types) fail('rules.yml に koujo（住宅ローン控除）がありません');
for(const k of ['checked','next','stampUntil','kaikaeUntil','akiyaUntil','toukiTransition']) if(!/^\d{4}-\d\d-\d\d$/.test(RULES[k]||'')) fail(`rules.yml の ${k} の日付が正しくありません（例：2027-03-31）`);

// ---- 記事（content/articles/*.md）
const TOOLNAME={kasu:'貸す・売る 比べる診断',iryou:'病気・けがの備え診断',hoshou:'必要保障額の目安',souba:'売却相場の目安',zoyo:'住宅資金の贈与税の目安',chukai:'仲介手数料の計算',furusato:'ふるさと納税の上限の目安',chuko:'中古住宅チェックシート',koujo:'住宅ローン控除の目安',souzokubun:'法定相続分の計算',rent2buy:'家賃と同じ返済で買える家',prepay:'繰上げ返済シミュレーター',souzokuzei:'相続税がかかるかチェック',lifeplan:'ライフプラン診断',sell:'売却・住み替えシミュレーター',loan:'住宅ローン・購入予算診断',souzoku:'相続の準備チェックシート',souzoku2:'相続の手続きチェックシート',akiya:'相続した家・空き家の診断',vs:'賃貸vs持ち家 比べる診断'};
const TOOLMAP={kasu:'#kasu',iryou:'#iryou',hoshou:'#hoshou',souba:'#souba',zoyo:'#zoyo',chukai:'#chukai',furusato:'#furusato',chuko:'#chuko',koujo:'#koujo',souzokubun:'#souzokubun',rent2buy:'#rent2buy',prepay:'#prepay',souzokuzei:'#souzokuzei',lifeplan:'#lifeplan',sell:'#sell',loan:'#loan',souzoku:'#souzoku',souzoku2:'#souzoku2',akiya:'#akiya',vs:'#vs'};
const ARTS=fs.readdirSync(R('content/articles')).filter(f=>f.endsWith('.md')&&!f.startsWith('_')).map(f=>{
  const src=read('content/articles/'+f);const m=src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if(!m) fail(`記事 ${f} の先頭の「---」で囲んだ部分が見つかりません`);
  const fm=norm(yaml.load(m[1]));const slug=f.replace(/\.md$/,'');
  if(!/^[a-z0-9-]+$/.test(slug)) fail(`記事のファイル名 ${f} は半角の英小文字・数字・ハイフンだけにしてください`);
  for(const k of ['タイトル','カテゴリ','公開日','リード']) if(!fm[k]) fail(`記事 ${f} に「${k}」がありません`);
  let body=m[2].replace(/\{\{期限:(\w+)\}\}/g,(_,k)=>{if(!RULES[k])fail(`記事 ${f} の {{期限:${k}}} が rules.yml にありません`);return jd(RULES[k])});
  let pr=false;
  body=body.replace(/\{\{広告:([^}]+)\}\}/g,(_,k)=>{k=k.trim();const ad=AFF[k];if(!ad)fail(`記事 ${f} の {{広告:${k}}} が affiliates.yml にありません`);
    const code=String(ad['コード']||'').trim();if(!code)return '';pr=true;
    return `\n\n<aside class="pr-box" data-aff="${k}"><span class="pr-label">PR</span><b>${ad['見出し']||''}</b>${ad['説明']?`<p>${ad['説明']}</p>`:''}<div class="pr-code">${code}</div></aside>\n\n`});
  // 囲み（:::ポイント 〜 :::）と数字のカード（:::数字）
  const BOX={'ポイント':'point','注意':'warn','まとめ':'sum','例':'ex','数字':'num','現場メモ':'memo'};
  body=body.replace(/^:::(\S+)[ \t]*(.*)\n([\s\S]*?)\n:::[ \t]*$/gm,(_,t,ttl,inner)=>{
    const c=BOX[t];if(!c)fail(`記事 ${f} の「:::${t}」は使えません（使えるのは ${Object.keys(BOX).join('・')}）`);
    let html;
    if(c==='num') html=`<div class="numcards">${inner.split('\n').filter(l=>l.trim()).map(l=>{const [v,d]=l.replace(/^[-*]\s*/,'').split('|');return `<div class="numcard"><b>${marked.parseInline((v||'').trim())}</b><span>${marked.parseInline((d||'').trim())}</span></div>`}).join('')}</div>`;
    else html=`<div class="box box-${c}"><p class="box-t">${ttl.trim()||({point:'この記事のポイント',warn:'気をつけたいこと',sum:'まとめ',ex:'計算例',memo:'現場メモ（不動産の実務から）'})[c]}</p>${marked.parse(inner)}</div>`;
    return '\n\n'+html.replace(/\n+/g,' ')+'\n\n'});
  const tool=fm['関連ツール']?TOOLMAP[fm['関連ツール']]:'';
  if(fm['関連ツール']&&!tool) fail(`記事 ${f} の関連ツール「${fm['関連ツール']}」が見つかりません`);
  // 本文の途中にツールへの案内（{{ツール}} と書いた場所。なければ3つ目の見出しの前に自動で入れる）
  if(tool){const tn=TOOLNAME[fm['関連ツール']];
    const ck=/チェックシート/.test(tn);
    const cta=`\n\n<aside class="toolcta"><b>${ck?'自分の場合を確かめる':'自分の数字で計算する'}</b><span>${tn}で${ck?'順番に確かめられます':fm['関連ツール']==='souba'?'町名ごとに調べられます':'計算できます'}（無料・登録不要・入力は送信されません）</span><a class="btn small primary" href="${tool}">${ck?'チェックしてみる':fm['関連ツール']==='souba'?'相場を調べる':'計算してみる'}</a></aside>\n\n`;
    if(/\{\{ツール\}\}/.test(body)) body=body.replace(/\{\{ツール\}\}/g,cta);
    else{let k=0;body=body.replace(/^## /gm,m=>{k++;return k===3?cta+m:m})}}
  // 参考にした資料
  const refs=(fm['参考']||[]).map(x=>Array.isArray(x)?{t:x[0],u:x[1]}:{t:x['名前'],u:x['URL']}).filter(x=>x.t&&/^https:\/\//.test(x.u||''));
  return {slug,title:fm['タイトル'],cat:fm['カテゴリ'],date:fm['公開日'],updated:fm['更新日']||fm['公開日'],draft:fm['下書き']!==false,sub:fm['まとめ先']||'',pr,tool,lead:fm['リード'],stitle:fm['検索タイトル']||'',refs,il:fm['イラスト']||'',...(()=>{let k=0;const toc=[];const html=marked.parse(body).replace(/<h2>([\s\S]*?)<\/h2>/g,(_,t)=>{k++;toc.push(t.replace(/<[^>]+>/g,''));return `<h2 id="s${k}"><span class="hn">${k}</span><span>${t}</span></h2>`}).replace(/<table>([\s\S]*?)<\/table>/g,(m,inner)=>{const cols=((inner.match(/<tr>[\s\S]*?<\/tr>/)||[''])[0].match(/<t[hd][ >]/g)||[]).length;return `<div class="tscroll${cols>=5?' wide':''}"><table>${inner}</table></div>`});return {body:html,toc,mins:Math.max(1,Math.round(body.replace(/<[^>]+>|[\s#*>|:-]/g,'').length/500))}})()};
}).sort((a,b)=>b.date.localeCompare(a.date));
// ---- 一次情報リンク集（content/links.yml）
const LINKS=(fs.existsSync(R('content/links.yml'))?(Y('content/links.yml')||[]):[]).map((l,i)=>{
  if(!l['名前']||!/^https:\/\//.test(l['URL']||'')) fail(`links.yml の${i+1}番目の「名前」か「URL」（https:// で始まる）を確認してください`);
  return{c:l['分野']||'その他',t:l['名前'],u:l['URL'],d:l['説明']||''}});
// ---- 用語集（content/glossary.yml）
const GLOSSARY=(fs.existsSync(R('content/glossary.yml'))?(Y('content/glossary.yml')||[]):[]).map((g,i)=>{
  if(!g['語']||!g['説明']) fail(`glossary.yml の${i+1}番目に「語」か「説明」がありません`);
  const rel=g['関連']||'';if(rel&&!TOOLMAP[rel]&&!ARTS.find(a=>a.slug===rel)) fail(`glossary.yml の「${g['語']}」の関連「${rel}」が、記事にもツールにも見つかりません`);
  return{w:g['語'],r:g['読み']||'',c:g['分野']||'その他',d:g['説明'],rel}});
// ---- テーマごとのまとめページ（content/hubs.yml）
const TOOLKEYS=Object.keys(TOOLMAP);
const HUBS=Object.entries(HUBS_RAW).map(([slug,h])=>{
  if(!/^[a-z0-9-]+$/.test(slug)) fail(`hubs.yml の ${slug} は半角の英小文字・数字・ハイフンだけにしてください`);
  const steps=(h['手順']||[]).map(st=>{
    const tools=[].concat(st['ツール']||[]);tools.forEach(t=>{if(!TOOLKEYS.includes(t))fail(`hubs.yml の ${slug} のツール「${t}」が見つかりません`)});
    const arts=[].concat(st['記事']||[]);arts.forEach(a=>{if(!ARTS.find(x=>x.slug===a))fail(`hubs.yml の ${slug} の記事「${a}」が見つかりません`)});
    return{h:st['見出し'],d:st['説明']||'',tools,arts}});
  const upd=steps.flatMap(s=>s.arts).map(a=>ARTS.find(x=>x.slug===a)).filter(a=>!a.draft).map(a=>a.updated).sort().pop()||RULES.checked;
  return{slug,title:h['タイトル'],stitle:h['検索タイトル']||h['タイトル'],cat:h['カテゴリ']||'',il:h['イラスト']||'',lead:h['リード']||'',body:[].concat(h['本文']||[]),steps,updated:upd}});


// ---- ブラウザで動くプログラムをまとめる
const content=`/* このファイルは自動で作られます。直接書き換えないでください */
const SITE_CFG=${JSON.stringify({prof:SITE['運営者']||{},contactForm:SITE.contactForm||'',adsense:SITE.adsense||'',adslots:SITE.adslots||{},houseAd:SITE['自社広告']||null})};
const AFF_ADS=${JSON.stringify(Object.fromEntries(Object.entries(AFF).filter(([k,v])=>String((v||{})['コード']||'').trim()).map(([k,v])=>[k,{h:v['見出し']||'',d:v['説明']||'',code:String(v['コード']).trim()}])))};
const CFG=${JSON.stringify(RULES).replace(/"Infinity"/g,'Infinity')};
const DATA_ITEMS=${JSON.stringify(SOURCES.map(x=>({cat:x['カテゴリ'],name:x['項目'],val:x['値'],src:x['出典'],url:x['リンク']||'',until:x['期限']||'',tool:x['使うツール']||''})))};
const NEWS=${JSON.stringify(NEWS.map(x=>({d:x['日付'],t:x['内容']})))};
const ARTICLES=${JSON.stringify(ARTS.map(({body,...a})=>a))};
const HUBS=${JSON.stringify(HUBS)};
const GLOSSARY=${JSON.stringify(GLOSSARY)};
const LINKS=${JSON.stringify(LINKS)}; // 本文は各記事のページにだけ入れる（全ページのプログラムを軽くするため）
`;
const files=fs.readdirSync(R('src/js')).filter(f=>f.endsWith('.js')).sort();
const pre=files.filter(f=>f<'10'), main=files.filter(f=>f>='10');
const bundle=content+pre.map(f=>`/* ---- ${f} ---- */\n`+read('src/js/'+f)).join('\n')+'\n(function(){\n'+main.map(f=>`/* ---- ${f} ---- */\n`+read('src/js/'+f)).join('\n')+'\n})();\n';
try{new Function(bundle)}catch(e){fail('プログラムに書き間違いがあります：'+e.message)}

// ---- 書き出し
const out=R('dist');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(path.join(out,'assets'),{recursive:true});fs.mkdirSync(path.join(out,'articles'),{recursive:true});fs.mkdirSync(path.join(out,'guide'),{recursive:true});
// 公開用は圧縮して軽くする（中身は同じ）
const esb=require('esbuild');
// ファイル名に中身のハッシュを入れる（Google などが古い app.js をキャッシュしたまま新しいページを表示して「記事が見つかりません」になるのを防ぐ）
const appCode=esb.transformSync(bundle,{minify:true,target:'es2019',charset:'utf8',legalComments:'none'}).code, cssCode=esb.transformSync(read('src/css/site.css'),{loader:'css',minify:true,charset:'utf8'}).code;
const hash8=s=>require('crypto').createHash('sha256').update(s).digest('hex').slice(0,8);
const APPJS='app.'+hash8(appCode)+'.js', SITECSS='site.'+hash8(cssCode)+'.css';
fs.writeFileSync(path.join(out,'assets',APPJS),appCode);fs.writeFileSync(path.join(out,'assets',SITECSS),cssCode);
fs.writeFileSync(path.join(out,'assets','app.js'),appCode);fs.writeFileSync(path.join(out,'assets','site.css'),cssCode); // 古いページからの参照用
fs.cpSync(R('static'),path.join(out,'assets'),{recursive:true});
if(fs.existsSync(R('content/souba')))fs.cpSync(R('content/souba'),path.join(out,'assets','souba'),{recursive:true});
if(fs.existsSync(R('content/chika')))fs.cpSync(R('content/chika'),path.join(out,'assets','chika'),{recursive:true});
if(fs.existsSync(R('content/yachin')))fs.cpSync(R('content/yachin'),path.join(out,'assets','yachin'),{recursive:true});
const ogImg=pg=>pg.art&&fs.existsSync(R('static/ogp/'+pg.art.slug+'.png'))?SITE_URL+'/assets/ogp/'+pg.art.slug+'.png':SITE_URL+'/assets/ogp.png'; // 記事ごとの共有画像（なければ共通の画像）
fs.copyFileSync(R('static/favicon.ico'),path.join(out,'favicon.ico'));
// SNSのプロフィール用の短いリンク（sainomado.jp/ig など）。開くと計測用の印つきのトップへ転送する。検索結果には出さない
const SHORT={ig:'instagram',x:'x',line:'line',fb:'facebook'};
for(const [k,src] of Object.entries(SHORT)){
  const to=`/?utm_source=${src}&utm_medium=social&utm_campaign=profile`;
  fs.mkdirSync(path.join(out,k),{recursive:true});
  fs.writeFileSync(path.join(out,k,'index.html'),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${to.replace(/&/g,'&amp;')}"><title>サイのまど</title><script>location.replace(${JSON.stringify(to)})</script></head><body><a href="${to.replace(/&/g,'&amp;')}">サイのまどへ移動します</a></body></html>\n`);
} // Googleの検索結果・サーチコンソールのアイコン用
const shell=read('src/shell.html'), headLinks=read('src/head-links.html');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const canon=f=>SITE_URL+'/'+f.replace(/index\.html$/,'');
const list=[...Object.entries(PAGES).map(([p,v])=>({p,f:v.file,t:v.title,d:v.description,ni:!!v.noindex})),...HUBS.map(h=>({p:'hub',slug:h.slug,f:'guide/'+h.slug+'.html',t:h.stitle+'｜サイのまど',d:h.lead,hub:h})),{p:'notfound',f:'404.html',t:'ページが見つかりません｜サイのまど',d:'お探しのページは見つかりませんでした。',nf:true},...ARTS.map(a=>({p:'article',slug:a.slug,f:'articles/'+a.slug+'.html',t:(a.stitle||a.title)+'｜サイのまど',d:a.lead,art:a}))];
const ga=SITE.analytics?`<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(SITE.analytics)}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${esc(SITE.analytics)}',{page_location:location.origin+location.pathname});</script>`:'';
const ads=SITE.adsense?`<meta name="google-adsense-account" content="${esc(SITE.adsense)}">\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(SITE.adsense)}" crossorigin="anonymous"></script>`:'';
async function prerender(pg,base){
  const boot=`<script>window.PAGE=${JSON.stringify(pg.p)};window.BASE=${JSON.stringify(base)};${pg.slug?'window.SLUG='+JSON.stringify(pg.slug)+';':''}${pg.art?'window.ARTB={'+JSON.stringify(pg.slug)+':'+JSON.stringify(pg.art.body).replace(/<\//g,'<\\/')+'};':''}</script>`;
  const errs=[];
  const vc=new (require('jsdom').VirtualConsole)();vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(`<!doctype html><html lang="ja"><head></head><body>${shell}${boot}<script>${bundle}</script></body></html>`,{runScripts:'dangerously',url:SITE_URL+'/'+pg.f,pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder}});
  await new Promise(r=>setTimeout(r,250));
  if(errs.length) fail(`${pg.f} の表示中にエラー：${errs[0]}`);
  const d=dom.window.document;d.querySelectorAll('script').forEach(s=>s.remove());
  d.querySelectorAll('[data-pushed]').forEach(x=>x.removeAttribute('data-pushed'));
  const body=d.body.innerHTML;dom.window.close();return {body,boot};
}
(async()=>{
  const urls=[];
  for(const pg of list){
    const depth=pg.f.split('/').length-1, base=pg.nf?'/':(depth?'../'.repeat(depth):''); // 404ページはどの場所でも出るので、絶対パス
    const {body,boot}=await prerender(pg,base);
    // 検索エンジン向けの情報（記事・ツール・パンくず）
    const P=SITE['運営者']||{};const author={'@type':'Person',name:P['名前']||'サイのまど運営者',jobTitle:[].concat(P['資格']||[])[0]||undefined,hasCredential:[].concat(P['資格']||[]).map(q=>({'@type':'EducationalOccupationalCredential',name:q})),url:SITE_URL+'/about.html#profile'};
    const crumb=(items)=>({'@type':'BreadcrumbList',itemListElement:items.map(([n,u],k)=>({'@type':'ListItem',position:k+1,name:n,item:u}))});
    const TOOLR=['kasu','iryou','hoshou','souba','zoyo','chukai','furusato','chuko','koujo','souzokubun','lifeplan','sell','loan','vs','akiya','souzoku','souzoku2','rent2buy','prepay','souzokuzei'];
    const ldList=pg.art?[{'@context':'https://schema.org','@type':'Article',headline:pg.art.title,description:pg.art.lead,datePublished:pg.art.date,dateModified:pg.art.updated,image:ogImg(pg),author,publisher:{'@type':'Organization',name:'サイのまど',logo:{'@type':'ImageObject',url:SITE_URL+'/assets/icon-192.png'}}},
        {'@context':'https://schema.org',...crumb([['サイのまど',SITE_URL+'/'],['記事',SITE_URL+'/articles/'],[pg.art.title,canon(pg.f)]])}]
      :pg.hub?[{'@context':'https://schema.org',...crumb([['サイのまど',SITE_URL+'/'],[pg.hub.title,canon(pg.f)]])}]
      :pg.p==='glossary'?[{'@context':'https://schema.org','@type':'DefinedTermSet',name:'住まいとお金の用語集',url:canon(pg.f),hasDefinedTerm:GLOSSARY.map((g,i)=>({'@type':'DefinedTerm',name:g.w,description:g.d,url:canon(pg.f)+'#t'+(i+1)}))}]
      :pg.p==='home'?[{'@context':'https://schema.org','@type':'WebSite',name:SITE.shortName||SITE.name,alternateName:[].concat(SITE.altNames||[],SITE.shortName?[SITE.name]:[]),url:SITE_URL+'/',inLanguage:'ja'},{'@context':'https://schema.org','@type':'Organization',name:SITE.shortName||SITE.name,alternateName:SITE.altNames||[],url:SITE_URL+'/',logo:SITE_URL+'/assets/icon-192.png',...([].concat(SITE.sameAs||[]).filter(Boolean).length?{sameAs:[].concat(SITE.sameAs).filter(Boolean)}:{})}]
      :TOOLR.includes(pg.p)?[{'@context':'https://schema.org','@type':'WebApplication',name:pg.t.split('｜')[0],description:pg.d,url:canon(pg.f),applicationCategory:'FinanceApplication',operatingSystem:'Any',inLanguage:'ja',isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'JPY'},author},
        {'@context':'https://schema.org',...crumb([['サイのまど',SITE_URL+'/'],[pg.t.split('｜')[0],canon(pg.f)]])}]:[];
    const ld=ldList.length?ldList:null;
    const html=`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(pg.t)}</title>
<meta name="description" content="${esc(pg.d)}">
${pg.nf?'':`<link rel="canonical" href="${canon(pg.f)}">`}${(pg.art&&(pg.art.draft||pg.art.sub))||pg.nf||pg.ni?'\n<meta name="robots" content="noindex,follow">':''}
<meta property="og:type" content="${pg.art?'article':'website'}">
<meta property="og:site_name" content="${esc(SITE.shortName||SITE.name)}">
<meta property="og:title" content="${esc(pg.t)}">
<meta property="og:description" content="${esc(pg.d)}">
<meta property="og:url" content="${canon(pg.f)}">
<meta property="og:image" content="${ogImg(pg)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${base}favicon.ico" sizes="48x48">
<link rel="icon" href="${base}assets/icon-96.png" type="image/png" sizes="96x96">
<link rel="icon" href="${base}assets/icon-192.png" type="image/png" sizes="192x192">
<link rel="icon" href="${base}assets/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${base}assets/apple-touch-icon.png">
${headLinks}<link rel="stylesheet" href="${base}assets/${SITECSS}">
${ld?ld.map(x=>`<script type="application/ld+json">${JSON.stringify(x)}</script>\n`).join(''):''}${ga}${ads}
</head>
<body>
${body}
${boot}
<script src="${base}assets/${APPJS}"></script>
</body>
</html>
`;
    fs.writeFileSync(path.join(out,pg.f),html);
    const latest=ARTS.filter(x=>!x.draft).map(x=>x.updated).sort().pop()||RULES.checked;
    if(!(pg.art&&(pg.art.draft||pg.art.sub))&&!pg.nf&&!pg.ni) urls.push({loc:canon(pg.f),lastmod:pg.art?pg.art.updated:pg.hub?pg.hub.updated:['home','articles','news'].includes(pg.p)?[latest,RULES.checked].sort().pop():RULES.checked});
  }
  const TODAY=new Date(Date.now()+9*3600e3).toISOString().slice(0,10); // 日本時間の今日。未来の日付はサイトマップに出さない
  fs.writeFileSync(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${u.loc}</loc><lastmod>${u.lastmod>TODAY?TODAY:u.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(out,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  // AdSense：パブリッシャーID（ca-pub-…）が入っていれば ads.txt を作る（審査・広告配信に必要）
  if(SITE.adsense){const pub=String(SITE.adsense).replace(/^ca-/,'');if(!/^pub-\d{10,20}$/.test(pub))fail('site.yml の adsense は ca-pub-（数字）の形で入れてください');fs.writeFileSync(path.join(out,'ads.txt'),`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`)}
  fs.writeFileSync(path.join(out,'CNAME'),SITE_URL.replace(/^https?:\/\//,'')+'\n');
  fs.writeFileSync(path.join(out,'.nojekyll'),'');
  console.log(`✔ ${list.length}ページを作りました（記事 ${ARTS.length}本、うち下書き ${ARTS.filter(a=>a.draft).length}本）`);
})();
