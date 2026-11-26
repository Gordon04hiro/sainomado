/* ---------- 数字の入力欄の共通のふるまい ----------
   ・マイナスにならないように min="0"（住宅の価値の下落率など、マイナスを使う欄は data-neg で除外）
   ・入力欄にカーソルがあるままマウスのホイールを回すと、数字が勝手に増減してしまうので、ホイールではページだけ動かす
   ・欄を離れたときに、最小値より小さければ最小値に戻す */
const NEGOK=new Set(['f_hdep']);
function fixNums(root){(root||document).querySelectorAll('input[type="number"]:not([data-nf])').forEach(i=>{i.dataset.nf='1';
  if(NEGOK.has(i.id)||i.dataset.neg!==undefined)return;if(!i.hasAttribute('min'))i.min='0'})}
document.addEventListener('wheel',e=>{const t=e.target;if(t&&t.type==='number'&&document.activeElement===t)t.blur()},{passive:true});
document.addEventListener('change',e=>{const t=e.target;if(!t||t.type!=='number'||t.value==='')return;const mn=t.min===''?null:+t.min,mx=t.max===''?null:+t.max,v=+t.value;
  let w=v;if(mn!=null&&v<mn)w=mn;if(mx!=null&&v>mx)w=mx;if(w!==v){t.value=String(w);t.dispatchEvent(new Event('input',{bubbles:true}))}},true);
document.addEventListener('focusin',e=>{if(e.target&&e.target.type==='number')fixNums(e.target.parentNode)});
if(typeof MutationObserver==='function'){const mo=new MutationObserver(()=>fixNums());const v=document.getElementById('view');if(v)mo.observe(v,{childList:true,subtree:true})}
fixNums();
