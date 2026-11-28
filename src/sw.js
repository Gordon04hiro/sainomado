/* サイのまど：ホーム画面のアプリ用（サービスワーカー）
   ・同じサイトのファイルだけを扱う（広告・アクセス解析などほかのサイトには触れない）
   ・ページ（HTML）は、まずネットから。つながらないときだけ、前に開いたものを出す
   ・名前に番号が付いたプログラムは手元にあればそれを使い、データや画像はまずネットから
   ・入力内容はこの仕組みでは保存も送信もしない（入力はこれまでどおりブラウザの中だけ） */
const CACHE='sainomado-__VER__';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/']).catch(()=>{})));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('sainomado-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin)return;
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(u.pathname,cp))}return res})
      .catch(()=>caches.match(u.pathname).then(m=>m||caches.match('/'))));return}
  if(!u.pathname.startsWith('/assets/'))return;
  const keep=res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp))}return res};
  // 名前に番号が付いたプログラム（app.xxxxxxxx.js など）は中身が変わらないので、手元にあればそれを使う
  if(/\.[0-9a-f]{8}\.(js|css)$/.test(u.pathname)){e.respondWith(caches.match(r).then(m=>m||fetch(r).then(keep)));return}
  // 相場・家賃のデータや画像は、まずネットから（更新されることがあるため）。つながらないときだけ手元のもの
  e.respondWith(fetch(r).then(keep).catch(()=>caches.match(r)));
});
