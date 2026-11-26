/* ---------- 名前を付けて保存（ライフプラン診断以外のツール） ----------
   ツールの入力（この端末の localStorage にある1件分）を、名前を付けて何件でも残せるようにする。
   ・保存先：sainomado-saves-v1 = {ツールid:[{id,name,at,d}]}（d は入力そのもの）
   ・呼び出すと、その入力をツールの保存場所に書き戻して開き直す
   ・わが家のまとめ・PDFには、保存したものが1件ずつ別の行で入る */
const SVKEY='sainomado-saves-v1',SVMAX=10;
const SVTOOLS=['loan','rent2buy','vs','koujo','zoyo','prepay','chukai','akiya','souzokuzei','souzokubun','furusato'];
function svReg(){
  const cp=d=>JSON.parse(JSON.stringify(d));
  const o={sell:{key:SKEY,get:()=>SV,set:d=>{SV=Object.assign(sellBase(),cp(d))}},souba:{key:SBKEY,get:()=>SB,set:d=>{SB=cp(d)}},chuko:{key:CHUKOKEY,get:()=>CHK,set:d=>{CHK=cp(d)}},souzoku:{key:CKEY,get:()=>CK,set:d=>{CK=cp(d)}},souzoku2:{key:C2KEY,get:()=>C2,set:d=>{C2=cp(d)}}};
  SVTOOLS.forEach(k=>{if(GDEF[k])o[k]={key:'sainomado-'+k+'-v1',get:()=>GT[k]||mtLoad('sainomado-'+k+'-v1')}});
  return o;
}
function svAll(){return mtLoad(SVKEY)||{}}
function svList(t){const a=svAll()[t];return Array.isArray(a)?a:[]}
function svPut(t,a){const all=svAll();if(a.length)all[t]=a;else delete all[t];try{localStorage.setItem(SVKEY,JSON.stringify(all))}catch(e){}}
const SVC={}; // sessionStorage が使えないときの控え
function svCur(t){try{const x=sessionStorage.getItem('sainomado-svcur-'+t);if(x!=null)return x}catch(e){}return SVC[t]||''}
function svSetCur(t,id){SVC[t]=id||'';try{if(id)sessionStorage.setItem('sainomado-svcur-'+t,id);else sessionStorage.removeItem('sainomado-svcur-'+t)}catch(e){}}
const svEmpty=d=>!d||d.example||!Object.keys(d).some(k=>k!=='example'&&d[k]!==''&&d[k]!=null&&d[k]!==false);
const svSame=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
/* 今の入力が、保存したもののどれと同じか（同じなら、まとめでその名前で出す） */
function svMatch(t){const R=svReg()[t];if(!R)return null;const cur=mtLoad(R.key);if(svEmpty(cur))return null;return svList(t).find(s=>svSame(s.d,cur))||null}

const SVHINT={sell:'物件ごとに保存しておけば、何軒あっても、わが家のまとめで並べて見られます。',souba:'物件ごとに保存しておけば、持っている家や実家の相場をまとめて見られます。',akiya:'相続した家・実家ごとに保存できます。',chuko:'内見した家ごとに保存して、見比べられます。',souzoku:'お父さん・お母さんなど、人ごとに分けて保存できます。',souzoku2:'相続ごとに分けて保存できます。'};
const SVPH={sell:'例：自宅マンション',souba:'例：実家（静岡市）',akiya:'例：実家',chuko:'例：候補A 〇〇町の戸建て',souzoku:'例：父の分',souzoku2:'例：父の相続'};
let SVOPEN=false; // まだ何も保存していないときは、1行だけの小さな表示にしておく
function svBarHTML(t){
  const L=svList(t),cur=svCur(t),c=L.find(s=>s.id===cur);
  if(!L.length&&!SVOPEN)return `<section class="svbar mini noprint" data-svtool="${t}"><button type="button" class="svopen" data-act="svopenbar"><b>＋ 名前を付けて保存</b><span>${t==='chuko'?'内見した家ごとに残せます':/^(sell|souba|akiya)$/.test(t)?'物件ごとに残せます':'条件を変えた案を残せます'}</span></button></section>`;
  return `<section class="svbar noprint" data-svtool="${t}"><div class="svhead"><b>名前を付けて保存</b><span class="unit">${esc(SVHINT[t]||'条件を変えた計算を、名前を付けて残しておけます。')}わが家のまとめ・PDFにも1件ずつ入ります（この端末にだけ保存）。</span></div>
   ${L.length?`<div class="svlist">${L.map(s=>`<span class="svchip${s.id===cur?' cur':''}"><button type="button" data-act="svload" data-id="${s.id}" title="この入力を呼び出す">${esc(s.name)}</button><button type="button" class="svdel" data-act="svdel" data-id="${s.id}" aria-label="${esc(s.name)}を削除">×</button></span>`).join('')}</div><p class="unit svnote">名前を押すと、その入力を呼び出します（今の入力は置き換わるので、残したいときは先に保存してください）。</p>`:''}
   <div class="svnew"><input class="txt" id="sv_name" maxlength="30" placeholder="${esc(SVPH[t]||'例：頭金を増やした場合')}" aria-label="保存する名前"><button type="button" class="btn small primary" data-act="svsave">今の入力を保存</button>${c?`<button type="button" class="btn small" data-act="svover" data-id="${c.id}">「${esc(c.name)}」に上書き</button>`:''}</div>
   <p class="unit svmsg" role="status" aria-live="polite"></p></section>`;
}
function svInject(){if(window.__shared)return;const t=window.PAGE||route();if(!svReg()[t])return;const v=document.getElementById('view');if(!v||v.querySelector('.svbar'))return;const th=v.querySelector('.thead');if(th)th.insertAdjacentHTML('afterend',svBarHTML(t))}
function svRedraw(t,msg){const b=document.querySelector('.svbar');if(!b)return;b.outerHTML=svBarHTML(t);if(msg){const m=document.querySelector('.svbar .svmsg');if(m)m.textContent=msg}}
function svSnap(t){const R=svReg()[t],d=R.get();if(svEmpty(d))return null;const x=JSON.parse(JSON.stringify(d));try{localStorage.setItem(R.key,JSON.stringify(x))}catch(e){}return x}
const svNow=()=>{const d=new Date();return d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate()};
document.addEventListener('click',e=>{const b=e.target.closest('.svbar [data-act]');if(!b)return;const t=b.closest('.svbar').dataset.svtool,a=b.dataset.act,L=svList(t);
  const nmEl=document.getElementById('sv_name'),nm=(nmEl&&nmEl.value||'').trim().slice(0,30);
  if(a==='svopenbar'){SVOPEN=true;svRedraw(t);const i=document.getElementById('sv_name');if(i)i.focus();return}
  if(a==='svsave'){const d=svSnap(t);if(!d)return svRedraw(t,'まだ入力がありません。自分の数字を入れてから保存してください。');
    if(L.length>=SVMAX)return svRedraw(t,'保存できるのは'+SVMAX+'件までです。いらないものを×で消してから保存してください。');
    const id='s'+Date.now().toString(36),name=nm||('保存'+(L.length+1));L.push({id,name,at:svNow(),d});svPut(t,L);svSetCur(t,id);track('save_slot',{tool:t,n:L.length});svRedraw(t,'「'+name+'」として保存しました。');return}
  if(a==='svover'){const d=svSnap(t),s=L.find(x=>x.id===b.dataset.id);if(!d||!s)return;s.d=d;s.at=svNow();if(nm)s.name=nm;svPut(t,L);svRedraw(t,'「'+s.name+'」を今の入力で上書きしました。');return}
  if(a==='svdel'){const s=L.find(x=>x.id===b.dataset.id);if(!s)return;if(b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='削除する';b.classList.add('arm');return}
    svPut(t,L.filter(x=>x!==s));if(svCur(t)===s.id)svSetCur(t,'');svRedraw(t,'「'+s.name+'」を削除しました。');return}
  if(a==='svload'){const s=L.find(x=>x.id===b.dataset.id);if(!s)return;svApply(t,s);try{location.reload()}catch(err){}}
});
/* 保存したものを、ツールの保存場所に書き戻す（開き直すと、その入力で表示される） */
function svApply(t,s){const R=svReg()[t];if(!R||!s)return;try{localStorage.setItem(R.key,JSON.stringify(s.d))}catch(e){}svSetCur(t,s.id);if(GT[t])delete GT[t];if(R.set)R.set(s.d)}
/* わが家のまとめの「開く」：保存したものなら、それを書き戻してから開く */
document.addEventListener('click',e=>{const a=e.target.closest('[data-svopen]');if(!a)return;const [t,id]=a.dataset.svopen.split('|');svApply(t,svList(t).find(x=>x.id===id))},true);

if(typeof MutationObserver==='function'){const v=document.getElementById('view');if(v)new MutationObserver(svInject).observe(v,{childList:true,subtree:true})}
svInject();
