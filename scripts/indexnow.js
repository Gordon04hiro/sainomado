// IndexNow：公開のたびに、新しく増えたページ・更新したページを Bing などに知らせる
//   node scripts/indexnow.js diff … 今公開中のサイトマップと、これから公開する dist/sitemap.xml を比べて、
//                                   増えた・日付が変わったURLを書き出す（GitHub Actions では次の工程に渡す）
//   node scripts/indexnow.js send … 渡されたURL（環境変数 URLS、JSONの配列）を IndexNow に送る
// キーは content/site.yml の indexnow。キーのファイル（/キー.txt）は build.js が作る
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');

function siteConf(){
  const y=fs.readFileSync(path.join(ROOT,'content','site.yml'),'utf8');
  const get=k=>{const m=y.match(new RegExp('^'+k+':\\s*"?([^"#\\s]+)"?','m'));return m?m[1]:''};
  return {url:get('url').replace(/\/$/,''),key:get('indexnow')};
}
// サイトマップから {URL: 更新日} を取り出す
function parse(xml){const o={};for(const m of String(xml||'').matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g))o[m[1]]=m[2];return o}
// 増えたURL・更新日が変わったURL（今のサイトマップが読めないときは空＝何も送らない）
function changed(oldXml,newXml){
  const a=parse(oldXml),b=parse(newXml);
  if(!Object.keys(a).length)return [];
  return Object.keys(b).filter(u=>a[u]!==b[u]);
}

async function diff(){
  const {url}=siteConf();
  const now=fs.readFileSync(path.join(ROOT,'dist','sitemap.xml'),'utf8');
  let live='';
  try{const r=await fetch(url+'/sitemap.xml',{headers:{'cache-control':'no-cache'}});if(r.ok)live=await r.text()}catch(e){console.log('今のサイトマップを読めませんでした：'+e.message)}
  const urls=changed(live,now).slice(0,10000);
  console.log(urls.length?`知らせるページ ${urls.length}件\n`+urls.join('\n'):'知らせるページはありません');
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'urls='+JSON.stringify(urls)+'\n');
}

async function send(){
  const {url,key}=siteConf();
  const urls=JSON.parse(process.env.URLS||'[]');
  if(!key||!urls.length)return console.log('送るものはありません');
  const host=url.replace(/^https?:\/\//,''),keyLocation=`${url}/${key}.txt`;
  // 公開直後はキーのファイルがまだ届いていないことがあるので、確認してから送る
  for(let i=0;i<10;i++){try{const r=await fetch(keyLocation,{headers:{'cache-control':'no-cache'}});if(r.ok&&(await r.text()).trim()===key)break}catch(e){}await new Promise(r=>setTimeout(r,15000))}
  const r=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({host,key,keyLocation,urlList:urls})});
  console.log(`IndexNow：${r.status} ${r.statusText}（${urls.length}件）`);
  // 200/202 は受付。それ以外でも公開そのものは済んでいるので、失敗扱いにはしない（ログで確認）
  if(![200,202].includes(r.status))console.log(await r.text().catch(()=>''));
}

if(require.main===module){
  const m=process.argv[2];
  (m==='diff'?diff():m==='send'?send():Promise.reject(new Error('diff か send を指定してください'))).catch(e=>{console.error(e.message);process.exit(m==='send'?0:1)});
}
module.exports={parse,changed};
