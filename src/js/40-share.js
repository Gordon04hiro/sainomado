/* ---------- 複数ページ対応のリンク ---------- */
const FILES={kasu:'kasu.html',iryou:'iryou.html',hoshou:'hoshou.html',matome:'matome.html',souba:'souba.html',fptool:'fptool.html',furusato:'furusato.html',chukai:'chukai.html',zoyo:'zoyo.html',chuko:'chuko.html',links:'links.html',koujo:'koujo.html',souzokubun:'souzokubun.html',glossary:'glossary.html',rent2buy:'rent2buy.html',prepay:'prepay.html',souzokuzei:'souzokuzei.html',home:'',lifeplan:'lifeplan.html',sell:'sell.html',loan:'loan.html',souzoku:'souzoku.html',souzoku2:'souzoku2.html',akiya:'akiya.html',vs:'vs.html',articles:'articles/',news:'news.html',data:'data.html',about:'about.html',privacy:'privacy.html',tools:'index.html#tools',contact:'about.html#contact'};
function pageURL(h){const B=window.BASE||'';if(h.startsWith('a-'))return B+'articles/'+h.slice(2)+'.html';if(h.startsWith('g-'))return B+'guide/'+h.slice(2)+'.html';return Object.prototype.hasOwnProperty.call(FILES,h)?(B+FILES[h])||'./':null}
function linkFix(root){if(!window.PAGE)return;const D=root||(typeof document!=='undefined'?document:null);if(!D||!D.querySelectorAll)return;D.querySelectorAll('a[href^="#"]').forEach(a=>{const u=pageURL(a.getAttribute('href').slice(1));if(u)a.setAttribute('href',u)})}
if(window.PAGE&&window.MutationObserver){new MutationObserver(()=>linkFix(document)).observe(document.body,{childList:true,subtree:true})}

/* ---------- 結果の共有 ---------- */
const SHARE={
 lifeplan:{get:()=>({plans:LP.plans,names:LP.names}),set:d=>{LP.plans=d.plans;LP.names=d.names;LP.example=false;U.plan='A';U.cf='A'}},
 sell:{get:()=>SV,set:d=>{SV=Object.assign(sellBase(),d)}},
 loan:{get:()=>gtState(LOANDEF),set:d=>{GT.loan=d}},
 akiya:{get:()=>gtState(AKIYADEF),set:d=>{GT.akiya=d}},
 vs:{get:()=>gtState(VSDEF),set:d=>{GT.vs=d}},
 rent2buy:{get:()=>gtState(RENT2BUYDEF),set:d=>{GT.rent2buy=d}},
 koujo:{get:()=>gtState(KOUJODEF),set:d=>{GT.koujo=d}},
 furusato:{get:()=>gtState(FURUDEF),set:d=>{GT.furusato=d}},
 chukai:{get:()=>gtState(CHUKAIDEF),set:d=>{GT.chukai=d}},
 zoyo:{get:()=>gtState(ZOYODEF),set:d=>{GT.zoyo=d}},
 souzokubun:{get:()=>gtState(BUNDEF),set:d=>{GT.souzokubun=d}},
 prepay:{get:()=>gtState(PREPAYDEF),set:d=>{GT.prepay=d}},
 souzokuzei:{get:()=>gtState(ZEIDEF),set:d=>{GT.souzokuzei=d}}
};
const b64u={enc:u8=>{let s='';u8.forEach(c=>s+=String.fromCharCode(c));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')},
 dec:s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const b=atob(s);return Uint8Array.from(b,c=>c.charCodeAt(0))}};
async function packShare(obj){
  const u8=new TextEncoder().encode(JSON.stringify(obj));
  if(window.CompressionStream){try{const cs=new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate-raw'));const out=new Uint8Array(await new Response(cs).arrayBuffer());return 'z.'+b64u.enc(out)}catch(e){}}
  return 'j.'+b64u.enc(u8);
}
async function unpackShare(s){
  const [k,body]=[s.slice(0,1),s.slice(2)];const u8=b64u.dec(body);
  if(k==='z'){const ds=new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return JSON.parse(await new Response(ds).text())}
  return JSON.parse(new TextDecoder().decode(u8));
}
function curTool(){return window.PAGE||route()}
function shareBtn(){return SHARE[curTool()]?'<button class="btn small" data-act="share">結果を共有</button>':''}
async function openShare(){
  const t=curTool(),S=SHARE[t];if(!S)return;
  const code=await packShare({t,v:1,d:S.get()});
  const base=location.href.split('#')[0];
  const url=base+'#s='+code;
  const line='https://social-plugins.line.me/lineit/share?url='+encodeURIComponent(url);
  const m=document.getElementById('modal')||Object.assign(document.createElement('div'),{id:'modal'});
  m.className='modal';document.body.appendChild(m);
  m.innerHTML=`<div class="mbox" role="dialog" aria-modal="true" aria-labelledby="mttl"><h3 id="mttl">結果を共有する</h3>
   <p class="unit">入力した条件を含むリンクを作りました。開いた人は同じ結果を見られます。相手の端末のデータは上書きされません。</p>
   <div class="taxnote" style="margin:0">リンクには、入力した年収や資産などの数字が含まれます。家族など、見せたい相手にだけ送ってください。内容が当サイトのサーバーに送られることはありません。</div>
   <textarea class="txt" id="shareurl" readonly rows="3">${esc(url)}</textarea>
   <div class="macts">${navigator.share?'<button class="btn primary" data-act="nshare">スマホで共有</button>':''}<a class="btn" href="${esc(line)}" target="_blank" rel="noopener">LINEで送る</a><button class="btn" data-act="copyshare">リンクをコピー</button><button class="btn ghost" data-act="closemodal">閉じる</button></div>
   ${PREVIEW?'<p class="unit" style="margin:0">※このプレビュー画面では、共有リンクを開いても結果は再現されません。公開したサイトで使えます。</p>':''}</div>`;
  m.hidden=false;
  m.onclick=e=>{if(e.target===m)m.hidden=true};
}
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='share') openShare();
  else if(a==='closemodal'){const m=document.getElementById('modal');if(m)m.hidden=true}
  else if(a==='copyshare'){const t=document.getElementById('shareurl');try{await navigator.clipboard.writeText(t.value);toast('リンクをコピーしました')}catch(err){t.select();toast('選択しました。長押しまたはCtrl+Cでコピーしてください')}}
  else if(a==='nshare'){const t=document.getElementById('shareurl');try{await navigator.share({title:document.title,text:'サイのまどで計算した結果です',url:t.value})}catch(err){}}
  else if(a==='keepshared'){window.__shared=false;try{saveLP();saveSV();Object.keys(GDEF).forEach(k=>GT[k]&&gtSave(GDEF[k]))}catch(err){}history.replaceState(null,'',location.href.split('#')[0]);toast('自分のデータとして保存しました');go()}
  else if(a==='leaveshared'){location.href=location.href.split('#')[0]}
});
function sharedBanner(){return window.__shared?`<div class="shared wrap"><span><b>共有された結果を表示しています。</b>この画面で変えても保存されません。</span><span class="macts"><button class="btn small primary" data-act="keepshared">自分のデータとして保存</button><button class="btn small" data-act="leaveshared">自分のデータに戻る</button></span></div>`:''}
async function loadShared(){
  const h=location.hash||'';if(!h.startsWith('#s='))return false;
  try{const o=await unpackShare(h.slice(3));if(!o||!SHARE[o.t])return false;if(o.t!==curTool()&&window.PAGE)return false;
    window.__shared=true;SHARE[o.t].set(o.d);return true}
  catch(e){toast('共有リンクを読み込めませんでした');return false}
}


/* ---------- ページそのものを送る（記事の最後・ツールの結果の下） ----------
   外部のシェア用スクリプトは読み込まず、リンクだけで開く。押されたら GA4 に share_page を送る */
try{if(navigator.share)document.documentElement.classList.add('canshare')}catch(e){}
function pageShareHTML(kind){
  const h=kind==='article'?'この記事を送る':'このツールを家族に教える',p=kind==='article'?'家族や、同じことで悩んでいる人に。':'夫婦や親子で、同じツールを触りながら相談できます。';
  const B=(via,l)=>`<button type="button" class="btn small${via==='native'?' primary pnative':''}" data-act="pshare" data-via="${via}" data-kind="${kind}">${l}</button>`;
  return `<section class="pshare noprint" aria-label="${h}"><div><b>${h}</b><span class="unit">${p}</span></div><div class="pshare-b">${B('native','スマホで送る')}${B('line','LINE')}${B('x','X')}${B('copy','リンクをコピー')}</div></section>`;
}
function pageShareURL(){const c=document.querySelector('link[rel="canonical"]');return c&&c.href?c.href:location.href.split('#')[0].split('?')[0]}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act="pshare"]');if(!b)return;
  const url=pageShareURL(),title=document.title,via=b.dataset.via;track('share_page',{method:via,kind:b.dataset.kind,page:location.pathname});
  if(via==='native'){try{await navigator.share({title,url})}catch(err){}return}
  if(via==='line'){window.open('https://social-plugins.line.me/lineit/share?url='+encodeURIComponent(url),'_blank','noopener');return}
  if(via==='x'){window.open('https://x.com/intent/post?text='+encodeURIComponent(title)+'&url='+encodeURIComponent(url),'_blank','noopener');return}
  if(via==='copy'){let ok=false;try{await navigator.clipboard.writeText(url);ok=true}catch(err){}
    if(!ok){const t=document.createElement('textarea');t.value=url;document.body.appendChild(t);t.select();try{ok=document.execCommand('copy')}catch(err){}t.remove()}
    toast(ok?'リンクをコピーしました':'コピーできませんでした。アドレス欄のURLをコピーしてください')}
});
