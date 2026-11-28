/* ---------- ホーム画面に追加（PWA） ----------
   ・サービスワーカー（/sw.js）を登録する。https のときだけ
   ・フッターの「アプリにする」：Android・パソコンは追加の確認を出す。iPhone は手順を案内する
   ・すでにホーム画面から開いているときは、案内を出さない */
const PWA={ev:null,standalone:false};
try{PWA.standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch(e){}
if('serviceWorker' in navigator&&location.protocol==='https:'){addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();PWA.ev=e});
addEventListener('appinstalled',()=>{track('pwa_installed',{});PWA.ev=null});
if(PWA.standalone){document.documentElement.classList.add('standalone')}
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function pwaSheet(){
  const old=document.getElementById('pwasheet');if(old)old.remove();
  const ios=isIOS();
  const d=document.createElement('div');d.id='pwasheet';d.className='pwasheet';d.setAttribute('role','dialog');d.setAttribute('aria-label','ホーム画面に追加');
  d.innerHTML=`<div class="pwabox"><b>サイのまどをホーム画面に追加</b>
   <p class="unit">アプリのように、ホーム画面のアイコンからすぐ開けます。登録もお金もいりません。</p>
   ${ios?`<ol><li>Safari で開いて、画面下の共有ボタン（□に↑のマーク）を押す</li><li>「ホーム画面に追加」を選ぶ</li><li>右上の「追加」を押す</li></ol><p class="unit">※ iPhone では、ホーム画面から開いたときと Safari で開いたときとで、入力の保存場所が分かれます。ホーム画面のアイコンから使い始めてください。</p>`
   :`<ol><li>ブラウザのメニュー（︙）を開く</li><li>「ホーム画面に追加」または「アプリをインストール」を選ぶ</li></ol>`}
   <div class="macts"><button type="button" class="btn small" data-act="pwaclose">閉じる</button></div></div>`;
  document.body.appendChild(d);
}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act="pwa"],[data-act="pwaclose"]');if(!b)return;e.preventDefault();
  if(b.dataset.act==='pwaclose'){const s=document.getElementById('pwasheet');if(s)s.remove();return}
  track('pwa_install_click',{how:PWA.ev?'prompt':isIOS()?'ios':'guide'});
  if(PWA.ev){try{PWA.ev.prompt();await PWA.ev.userChoice}catch(err){}PWA.ev=null;return}
  pwaSheet();
});
document.addEventListener('click',e=>{if(e.target.id==='pwasheet')e.target.remove()});
