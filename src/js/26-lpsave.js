/* ---------- ライフプラン：入力の保存・読み込み・元に戻す ----------
   ・入力はふだんから自動で保存（sainomado-lifeplan-v1）
   ・名前を付けて保存：最大10件（sainomado-lifeplan-saves-v1）
   ・「空にする」「入力例を見る」「保存した入力を開く」の前に、今の入力を1つだけ控える（sainomado-lifeplan-prev-v1）→「元に戻す」 */
const LSAVE='sainomado-lifeplan-saves-v1', LPREV='sainomado-lifeplan-prev-v1', SAVEMAX=10;
const lsGet=(k,d)=>{try{const s=localStorage.getItem(k);return s?JSON.parse(s):d}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
const lpSaves=()=>{const a=lsGet(LSAVE,[]);return Array.isArray(a)?a:[]};
const dstr=t=>{const d=new Date(t);return (d.getMonth()+1)+'月'+d.getDate()+'日 '+d.getHours()+':'+String(d.getMinutes()).padStart(2,'0')};
let lpDeleted=null;
function toastAct(t,label,act){const el=document.getElementById('toast');if(!el)return;el.innerHTML=`${esc(t)}<button class="tbtn" data-act="${act}">${esc(label)}</button>`;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,8000)}
function lpView(){const v=document.getElementById('view');if(v)vLife(v)}
function blankLP(){const p=basePlan();Object.assign(p,{kids:[],events:[],inc:'',sinc:'',live:'',rent:'',car:0,price:'',down:'',sev:'',reinc:'',pen:'',spen:'',assets:zeroAssets(),props:[]});return{plans:{A:p},names:{A:'今のまま'},example:false}}
function exampleLP(){return{plans:{A:basePlan()},names:{A:'今のまま'},example:true}}
/* 今の入力を控えてから入れ替える（あとで「元に戻す」） */
function lpReplace(next,msg){
  lsSet(LPREV,{at:Date.now(),lp:LP});
  const mode=LP.mode;LP=next;if(mode&&!LP.mode)LP.mode=mode;
  U.plan='A';U.cf='A';saveLP();lpView();toastAct(msg,'元に戻す','lpundo');
}
function lpUndo(){
  const p=lsGet(LPREV,null);if(!p||!p.lp)return;
  const cur=LP;LP=p.lp;lsSet(LPREV,{at:Date.now(),lp:cur});
  U.plan='A';U.cf='A';saveLP();lpView();toast('元の入力に戻しました');
}
function lpSaveNow(){
  const inp=document.getElementById('lpsname');const name=(inp&&inp.value.trim())||dstr(Date.now())+'の入力';
  const list=lpSaves();const i=list.findIndex(x=>x.name===name);
  if(i<0&&list.length>=SAVEMAX){toast('保存は'+SAVEMAX+'件までです。いらないものを削除してください');return}
  const item={name,at:Date.now(),lp:clone(LP)};
  if(i>=0)list[i]=item;else list.unshift(item);
  if(!lsSet(LSAVE,list)){toast('保存できませんでした（ブラウザの設定で保存が止められている可能性があります）');return}
  toast(i>=0?'「'+name+'」を上書き保存しました':'「'+name+'」として保存しました');lpView();
  const d=document.querySelector('.lpsaves');if(d)d.open=true;
}
function lpOpen(i){const s=lpSaves()[i];if(!s)return;lpReplace(clone(s.lp),'「'+s.name+'」を開きました')}
function lpDel(i){const list=lpSaves();const s=list[i];if(!s)return;list.splice(i,1);lsSet(LSAVE,list);lpDeleted={i,s};lpView();const d=document.querySelector('.lpsaves');if(d)d.open=true;toastAct('「'+s.name+'」を削除しました','元に戻す','lpundel')}
function lpUndel(){if(!lpDeleted)return;const list=lpSaves();list.splice(Math.min(lpDeleted.i,list.length),0,lpDeleted.s);lsSet(LSAVE,list);lpDeleted=null;lpView();const d=document.querySelector('.lpsaves');if(d)d.open=true;toast('元に戻しました')}

/* 診断ページ上部の「保存・読み込み」 */
function lpSaveBox(){
  const list=lpSaves(), prev=lsGet(LPREV,null);
  return `<p class="lpnote"><span>✓ 入力はこの端末に自動で保存されます（閉じても続きから。送信はしません）</span>
   ${LP.example?`<span>いまは入力例が入っています <button class="btn small" data-act="clear">空にして始める</button></span>`:`<button class="btn small ghost" data-act="lpexample">入力例を見る</button>`}</p>
  <details class="lpsaves"><summary>入力を保存・読み込み${list.length?`<span class="chip muted">保存 ${list.length}件</span>`:''}</summary><div class="body">
   <div class="lpsrow"><label class="fld"><span class="lab">今の入力に名前を付けて保存</span><input class="txt" id="lpsname" maxlength="30" placeholder="例：家を買う前の案"></label><button class="btn small primary" data-act="lpsave">保存する</button></div>
   ${list.length?`<ul class="lpslist">${list.map((s,i)=>`<li><span><b>${esc(s.name)}</b><small>${dstr(s.at)}</small></span><span class="macts"><button class="btn small" data-act="lpopen" data-i="${i}">開く</button><button class="btn small ghost danger" data-act="lpdel" data-i="${i}">削除</button></span></li>`).join('')}</ul>`:'<p class="unit" style="margin:10px 0 0">まだ保存した入力はありません。家族と相談するときの案や、入力の途中で区切りたいときに使えます。</p>'}
   ${prev&&prev.lp?`<p class="unit" style="margin:10px 0 0">入力を入れ替える前の内容（${dstr(prev.at)}）に <button class="linkbtn" data-act="lpundo">戻す</button></p>`:''}
   <p class="unit" style="margin:10px 0 0">保存先は、このスマホ・パソコンのブラウザの中だけです（最大${SAVEMAX}件）。ブラウザの履歴やサイトのデータを消すと、保存も消えます。別の端末で続きをするときは、結果の「結果を共有」のリンクを使ってください。</p>
  </div></details>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='lpundo'){document.getElementById('toast').hidden=true;lpUndo()}
  else if(a==='lpundel'){document.getElementById('toast').hidden=true;lpUndel()}
  else if(a==='lpexample')lpReplace(exampleLP(),'入力例を表示しました');
  else if(a==='lpsave')lpSaveNow();
  else if(a==='lpopen')lpOpen(+b.dataset.i);
  else if(a==='lpdel')lpDel(+b.dataset.i);
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='lpsname'){e.preventDefault();lpSaveNow()}});

/* ---------- ほかのツールの結果を、ライフプラン診断の「比べるパターン」として入れる ---------- */
function lpAddPattern(name,mut){
  const k=PK.find(x=>!LP.plans[x])||'C';
  const T=clone(LP.plans.A); mut(T);
  LP.plans[k]=T; LP.names[k]=name;
  try{localStorage.setItem(LKEY,JSON.stringify(LP));sessionStorage.setItem('sainomado-lp-open',k)}catch(e){}
  location.href=pageURL('lifeplan');
}
function bridgeHTML(title,text,act){return `<section class="lpbridge"><b>${title}</b><p>${text}</p><button class="btn small primary" data-act="${act}">ライフプラン診断で比べる</button><span class="unit">今のライフプランの入力（パターンA）に、この結果を足した「比べるパターン」を作ります。パターンがすでに3つあるときは、Cを置き換えます。</span></section>`}
