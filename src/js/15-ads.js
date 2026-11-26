/* ---------- 広告枠（AdSense と アフィリエイト） ----------
   ・AdSenseの枠は content/site.yml の adslots に番号を入れた枠だけ表示（空なら何も出ない）
   ・アフィリエイトは content/affiliates.yml にコードを入れたものだけ表示（PR表示つき）
   ・入力のたびに描き直す場所には置かない（広告が何度も読み込まれないように） */
function adUnit(name){
  const id=SITE_CFG.adsense,slot=(SITE_CFG.adslots||{})[name];
  if(!id||!slot) return '';
  return `<div class="ad" data-ad="${esc(name)}"><span class="ad-lab">スポンサーリンク</span><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(id)}" data-ad-slot="${esc(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
}
function affBox(key){
  const a=AFF_ADS[key]; if(!a) return '';
  return `<aside class="pr-box" data-aff="${esc(key)}"><span class="pr-label">PR</span><b>${esc(a.h)}</b>${a.d?`<p>${esc(a.d)}</p>`:''}<div class="pr-code">${a.code}</div></aside>`;
}
/* 自社の広告（site.yml の 自社広告）。ページの内容（テーマ）に合わせて出し分ける。where はどのページから来たか（utm_content） */
function houseTheme(kind,v){const h=SITE_CFG.houseAd;if(!h||!h['出す']||!h['テーマ'])return null;
  return Object.keys(h['テーマ']).find(t=>[].concat(h['テーマ'][t][kind]||[]).includes(v))||null}
function houseAd(theme,where){
  const h=SITE_CFG.houseAd;if(!theme||!h||!h['リンク'])return '';
  const T=h['テーマ'][theme]||{},B=window.BASE||'',L=String(h['リンク']);
  const url=L+(L.includes('?')?'&':'?')+'utm_source=sainomado&utm_medium=banner&utm_campaign=kj_'+theme+'&utm_content='+encodeURIComponent(where);
  return `<aside class="house-ad"><span class="pr-label">広告</span><a href="${esc(url)}" target="_blank" rel="noopener sponsored" data-house="${esc(theme+':'+where)}"><picture><source media="(max-width:600px)" srcset="${B}assets/ads/kj-${theme}-rect.webp" width="600" height="500"><img src="${B}assets/ads/kj-${theme}-wide.webp" width="1200" height="400" alt="${esc(h['名前']||'')}　${esc(T['説明']||'')}（ホームページへ）" loading="lazy"></picture></a></aside>`;
}
const houseFor=(kind,v,where)=>houseAd(houseTheme(kind,v),where);
document.addEventListener('click',e=>{const a=e.target.closest('[data-house]');if(a){const [t,p]=a.dataset.house.split(':');track('kj_banner_click',{theme:t,place:p})}});
/* ツールごとに出すアフィリエイト（affiliates.yml の名前） */
const TOOL_AFF={
 hoshou:[], souba:[], chuko:['住宅ローン比較'], koujo:['住宅ローン比較','ふるさと納税'], furusato:['ふるさと納税'], chukai:[], zoyo:['住宅ローン比較'], souzokubun:[],
 lifeplan:['証券口座','子ども口座','住宅ローン比較'], loan:['住宅ローン比較'], vs:['住宅ローン比較'], rent2buy:['住宅ローン比較'], prepay:['住宅ローン比較'],
 sell:[], akiya:[], souzoku:[], souzoku2:[], souzokuzei:[]
};
/* ページの下の広告（ツールのページだけ。#view の外なので、入力で描き直されない） */
function adTail(r){
  const box=document.getElementById('adtail'); if(!box) return;
  const affs=(TOOL_AFF[r]||[]).map(affBox).filter(Boolean);
  const unit=TOOL_AFF[r]?adUnit('ツールの下'):'';
  box.innerHTML=houseFor('ツール',r,'tool_'+r)+(affs.length?`<p class="pr-note">当サイトはアフィリエイト広告を利用しています。「PR」と表示したリンクから申し込みがあると、当サイトが報酬を受け取ることがあります。</p>${affs.join('')}`:'')+unit;
  box.hidden=!box.innerHTML;
}
/* 記事の本文に、見出し2つごとに広告を入れる */
function withMidAds(html){
  const u=adUnit('記事の中'); if(!u) return html;
  let k=0; return html.replace(/<h2/g,m=>{k++;return k>1&&k%2===1?u+m:m});
}
/* 新しく置かれた広告枠を読み込む */
function fillAds(){
  if(!SITE_CFG.adsense) return;
  document.querySelectorAll('ins.adsbygoogle:not([data-pushed])').forEach(el=>{el.setAttribute('data-pushed','1');try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch(e){}});
}
