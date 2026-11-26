/* ---------- ヘッダーの「目的から探す」メニューと、目的ごとに整理したフッター ----------
   PURPOSE（目的ごとのツール）と HUBS（ガイド）から作る。ツールやガイドを足すと、メニューにも自動で並ぶ */
const NAVSHORT={'p-buy':'家を買う','p-sell':'売る・住み替え','p-inherit':'相続・実家','p-life':'家計・老後'};
function navCols(){return PURPOSE.map(p=>{const h=HUBS.find(x=>x.slug===p.hub);
  return `<div class="mcol"><p class="mh">${esc(NAVSHORT[p.id]||p.t)}</p><ul>${p.tools.map(t=>TITLES[t]?`<li><a href="#${t}">${esc(TITLES[t])}</a></li>`:'').join('')}</ul>${h?`<a class="mguide" href="#g-${h.slug}" title="${esc(h.title)}">ガイドを読む →</a>`:''}</div>`}).join('')}
function navInit(){
  const nav=document.querySelector('.gnav');if(!nav||nav.dataset.done)return;nav.dataset.done='1';
  nav.innerHTML=`<button type="button" class="gmenu" aria-expanded="false" aria-controls="mega"><span class="gm-l">目的から探す</span><span class="gm-s" aria-hidden="true">メニュー</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
   <a href="#tools" data-r="tools" class="hide-md">ツール</a><a href="#articles" data-r="articles" class="hide-sm">記事</a><a href="#about" data-r="about" class="hide-md">サイトについて</a>
   <a class="btn small primary gcta" href="#lifeplan" data-lpguide="1">ライフプラン診断</a>`;
  const hd=document.querySelector('header.site');
  if(hd&&!document.getElementById('mega')){const m=document.createElement('div');m.id='mega';m.className='mega';m.hidden=true;
    m.innerHTML=`<div class="wrap"><div class="mcols">${navCols()}</div><div class="mfoot"><a href="#tools">すべてのツール</a><a href="#articles">記事</a><a href="#glossary">用語集</a><a href="#about">サイトについて</a></div></div>`;
    hd.appendChild(m)}
  const ft=document.querySelector('footer.ft .wrap');
  if(ft&&!ft.dataset.done){ft.dataset.done='1';
    ft.innerHTML=`<div class="fcols">${navCols()}<div class="mcol"><p class="mh">サイのまど</p><ul><li><a href="#home">トップ</a></li><li><a href="#tools">すべてのツール</a></li><li><a href="#articles">記事</a></li><li><a href="#glossary">用語集</a></li><li><a href="#data">使っているデータ</a></li><li><a href="#links">一次情報リンク集</a></li><li><a href="#news">お知らせ</a></li><li><a href="#fptool">無料のFPツール</a></li><li><a href="#about">サイトについて・お問い合わせ</a></li><li><a href="#privacy">プライバシーポリシー</a></li></ul></div></div>
     <span>© サイのまど（さいのまど）｜住まいとお金の無料シミュレーション</span>`}
}
function navClose(){const m=document.getElementById('mega'),b=document.querySelector('.gmenu');if(m)m.hidden=true;if(b)b.setAttribute('aria-expanded','false')}
document.addEventListener('click',e=>{
  const b=e.target.closest('.gmenu');
  if(b){const m=document.getElementById('mega');if(!m)return;const open=m.hidden;m.hidden=!open;b.setAttribute('aria-expanded',String(open));return}
  if(e.target.closest('#mega a')||!e.target.closest('#mega'))navClose();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')navClose()});
window.addEventListener('hashchange',navClose);
navInit();
