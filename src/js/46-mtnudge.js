/* ---------- わが家のまとめを見つけやすく ----------
   ・2つ以上のツールで自分の数字を入れた人に、画面の下に小さなお知らせを出す（×で閉じる。使ったツールが増えたら、また出す）
   ・ヘッダー（PC）とメニューに「わが家のまとめ」と、結果のあるツールの数を出す */
const MTNKEY='sainomado-mtnudge-v1';
function mtToolCount(){try{return new Set(mtItems().map(x=>String(x.k).split('@')[0])).size}catch(e){return 0}}
function mtNudgeShown(){try{return +(localStorage.getItem(MTNKEY)||0)}catch(e){return 99}}
function mtNudge(){
  if(window.__shared||window.__prerender)return;
  const r=window.PAGE||route();const c=mtToolCount();
  // ヘッダーとメニューの件数
  document.querySelectorAll('.mtlink').forEach(a=>{a.hidden=c<1;const b=a.querySelector('.mtn');if(b)b.textContent=c});
  document.querySelectorAll('.mtcnt').forEach(x=>x.textContent=c?'（'+c+'つのツールの結果）':'');
  const old=document.getElementById('mtnudge');
  if(r==='matome'||c<2||c<=mtNudgeShown()){if(old)old.remove();return}
  if(old){old.querySelector('b').textContent=c+'つのツールの結果';return}
  const d=document.createElement('div');d.id='mtnudge';d.className='mtnudge noprint';d.setAttribute('role','status');
  d.innerHTML=`<div><p><b>${c}つのツールの結果</b>を、わが家のまとめで1枚に並べられます。印刷・PDFにして、家族や相談先と共有できます。</p>
   <div class="mtnacts"><a class="btn small primary" href="#matome" data-act="mtnopen">わが家のまとめを見る</a><button type="button" class="btn small ghost" data-act="mtnclose">あとで</button></div></div>
   <button type="button" class="mtnx" data-act="mtnclose" aria-label="閉じる">×</button>`;
  document.body.appendChild(d);requestAnimationFrame(()=>d.classList.add('on'));
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="mtnclose"],[data-act="mtnopen"]');if(!b)return;
  try{localStorage.setItem(MTNKEY,String(mtToolCount()))}catch(x){}
  if(b.dataset.act==='mtnopen')track('matome_nudge',{n:mtToolCount()});
  const d=document.getElementById('mtnudge');if(d)d.remove()});
/* 入力のたびではなく、少し落ち着いてから数え直す */
let mtNT=0;const mtNudgeLater=(ms)=>{clearTimeout(mtNT);mtNT=setTimeout(mtNudge,ms||1500)};
document.addEventListener('input',()=>mtNudgeLater(2500));
document.addEventListener('change',()=>mtNudgeLater(2500));
window.addEventListener('hashchange',()=>mtNudgeLater(800));
mtNudgeLater(1200);
