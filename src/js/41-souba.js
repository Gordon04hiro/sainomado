/* ---------- 売却相場の目安（国土交通省「不動産情報ライブラリ」の取引価格・成約価格から） ----------
   データ：content/souba/<都道府県コード>.json（scripts/souba.js が GitHub Actions で作る）を、選んだ都道府県の分だけ読み込む
   計算：市区町村ごとの「基準の1㎡単価」の25%・50%・75% × 築年数の補正 × 面積。件数が少ない市区町村は都道府県全体で代用 */
const SBKEY='sainomado-souba-v1';
const SBPREF=['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const SBK={m:{t:'中古マンション',area:'専有面積',ah:'登記簿や販売図面の「専有面積」（壁芯）。60〜80㎡が一般的'},h:{t:'戸建て（土地と建物）',area:'土地の面積',ah:'登記簿の「地積」。建物の広さではなく土地の面積で計算します'},l:{t:'土地',area:'土地の面積',ah:'登記簿の「地積」'}};
const SBBANDS=[0,5,10,15,20,25,30,35,40,50];
const sbBand=a=>{let b=0;SBBANDS.forEach((x,i)=>{if(a>=x)b=i});return b};
const SBD={},SBT={};let SB=null;
try{const s=localStorage.getItem(SBKEY);if(s)SB=JSON.parse(s)}catch(e){}
if(!SB)SB={pref:'13',city:'',k:'m',area:65,age:15,example:true};
const sbSave=()=>{try{localStorage.setItem(SBKEY,JSON.stringify(SB))}catch(e){}};
function sbLoad(code){
  if(SBD[code])return Promise.resolve(SBD[code]);
  if(typeof fetch!=='function')return Promise.reject('nofetch');
  return fetch('assets/souba/'+code+'.json').then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(j=>(SBD[code]=j));
}
/* 計算：A＝都道府県のデータ、V＝入力 */
/* 町名（地区名）のデータ：市区町村ごとのファイル。町名が5件以上ある市区町村だけ */
function sbTowns(pref,city){const key=pref+'/'+city,A=SBD[pref];
  if(SBT[key])return Promise.resolve(SBT[key]);if(!A||!A.C[city]||!A.C[city].towns||typeof fetch!=='function')return Promise.resolve(null);
  return fetch('assets/souba/'+pref+'/'+city+'.json').then(r=>r.ok?r.json():null).then(j=>(SBT[key]=j)).catch(()=>null)}
const sbTown=V=>{const T=SBT[V.pref+'/'+V.city];return V.town&&T&&T[V.town]?T[V.town]:null};
function sbCalc(A,V){
  const k=V.k,c=V.city&&A.C[V.city]&&A.C[V.city][k]?A.C[V.city][k]:null,tw=sbTown(V),t=tw&&tw[k]?tw[k]:null,st=t||c||A.P[k];if(!st)return null;
  const area=Math.max(0,n(V.area)),f=k==='l'?1:A.curve[k][sbBand(Math.max(0,n(V.age)))];
  const u=st.q.map(q=>q*f); // 1㎡あたり（円）
  const base=c||A.P[k];
  return{unit:u,price:u.map(x=>x*area/1e4),n:st.n,local:!!c,town:!!t,area,f,ratio:t?t.q[1]/base.q[1]:null,baseMid:base.q[1]*f*area/1e4};
}
function sbFields(A){
  const cities=A?Object.entries(A.C).filter(([c,v])=>v[SB.k]).sort((a,b)=>a[0].localeCompare(b[0])):[];
  return `<div class="fields">
   <label class="fld"><span class="lab">都道府県</span><select id="sb_pref">${SBPREF.map((p,i)=>{const c=String(i+1).padStart(2,'0');return `<option value="${c}"${c===SB.pref?' selected':''}>${p}</option>`}).join('')}</select></label>
   <label class="fld"><span class="lab">市区町村</span><select id="sb_city"><option value="">${A?esc(A.name)+'全体':'読み込み中…'}</option>${cities.map(([c,v])=>`<option value="${c}"${c===SB.city?' selected':''}>${esc(v.name)}</option>`).join('')}</select><span class="hint">取引が少ない市区町村は一覧に出ません（都道府県全体で計算します）</span></label>
   ${(()=>{const T=SB.city?SBT[SB.pref+'/'+SB.city]:null;if(!T)return '';const ts=Object.keys(T).filter(t=>T[t][SB.k]).sort((a,b)=>a.localeCompare(b,'ja'));if(!ts.length)return '';
     return `<label class="fld"><span class="lab">町名（任意）</span><select id="sb_town"><option value="">選ばない（${esc(A.C[SB.city].name)}全体）</option>${ts.map(t=>`<option value="${esc(t)}"${t===SB.town?' selected':''}>${esc(t)}（${T[t][SB.k].n}件）</option>`).join('')}</select><span class="hint">5年で5件以上の取引がある町名だけ選べます。件数が少ないほど、ふれ幅が大きくなります</span></label>`})()}
   <div class="fld"><span class="lab">種類</span><span class="seg" role="group" aria-label="種類">${Object.entries(SBK).map(([k,v])=>`<button type="button" data-act="sbk" data-k="${k}" aria-pressed="${SB.k===k}">${v.t}</button>`).join('')}</span></div>
   <label class="fld"><span class="lab">${SBK[SB.k].area}</span><span class="inp"><input id="sb_area" type="number" inputmode="decimal" value="${esc(SB.area)}"><span class="u">㎡</span></span><span class="hint">${SBK[SB.k].ah}。1坪＝約3.3㎡（${fmt(n(SB.area)/3.3058)}坪）</span></label>
   ${SB.k==='l'?'':`<label class="fld"><span class="lab">築年数</span><span class="inp"><input id="sb_age" type="number" inputmode="numeric" value="${esc(SB.age)}"><span class="u">年</span></span></label>`}
  </div>`;
}
function vSouba(v){
  v.innerHTML=`<div class="wrap"><div class="crumb"><a href="#home">サイのまど</a> › 売却相場の目安</div>
  <div class="thead"><h1>売却相場の目安</h1><p>国土交通省が公開している、実際の不動産の取引価格（直近5年分）から、地域・種類・広さ・築年数が近い物件の価格の幅を出します。売り出す前に「だいたいの相場」をつかむためのツールです。</p>
   <div class="safe">✓ 入力内容はこの端末の中だけに保存され、どこにも送信されません。名前や連絡先も聞きません</div></div>
  <div class="formgrid"><details class="grp" open><summary>物件のこと</summary><div class="body" id="sbform">${sbFields(SBD[SB.pref])}</div></details></div>
  <section class="result" id="sbresult"><p class="unit">データを読み込んでいます…</p></section></div>`;
  sbLoad(SB.pref).then(()=>sbTowns(SB.pref,SB.city)).then(()=>{if(route()!=='souba')return;document.getElementById('sbform').innerHTML=sbFields(SBD[SB.pref]);sbRender()}).catch(e=>{if(e==='nofetch')return;const r=document.getElementById('sbresult');if(r)r.innerHTML='<p class="unit">データを読み込めませんでした。通信の状態を確かめて、ページを読み込み直してください。</p>'});
}
function sbRender(){
  const box=document.getElementById('sbresult'),A=SBD[SB.pref];if(!box||!A)return;
  const R=sbCalc(A,SB);
  if(!R||!(R.area>0)){box.innerHTML='<p class="unit">面積を入れると、相場の目安が出ます。</p>';return}
  const cn=(SB.city&&A.C[SB.city]?A.C[SB.city].name:A.name+'全体')+(R.town?' '+SB.town:''), mid=Math.round(R.price[1]/10)*10;
  box.innerHTML=`<h2>${esc(cn)}の${SBK[SB.k].t}の相場の目安</h2>
   <div class="sbmain"><p class="sbl">真ん中あたりの価格</p><p class="sbv"><b>約${fmt(mid)}</b><small>万円</small></p>
    <div class="sbbar" aria-hidden="true"><span class="lo">${fmt(Math.round(R.price[0]/10)*10)}</span><span class="md"></span><span class="hi">${fmt(Math.round(R.price[2]/10)*10)}</span></div>
    <p class="sbr">近い条件の取引の半分が、<b>約${fmt(Math.round(R.price[0]/10)*10)}万〜${fmt(Math.round(R.price[2]/10)*10)}万円</b>の間に入ります</p></div>
   <div class="panels"><section class="panel"><div class="ph"><span class="nm">1㎡あたり・1坪あたり</span></div><div class="kv">${kvRow('1㎡あたり（真ん中）',(Math.round(R.unit[1]/1000)/10).toLocaleString('ja-JP')+'<small>万円</small>')}${kvRow('1坪あたり（真ん中）',(Math.round(R.unit[1]*3.3058/1000)/10).toLocaleString('ja-JP')+'<small>万円</small>')}</div></section>
    <section class="panel"><div class="ph"><span class="nm">もとにしたデータ</span></div><div class="kv">${kvRow('取引の件数',fmt(R.n)+'<small>件</small>')}${kvRow('期間',`<small>${esc(A.from)}〜${esc(A.to)}</small>`)}</div>${R.town?`<p class="unit" style="margin:6px 0 0">${esc(SB.town)}の取引だけで計算しています。${esc(A.C[SB.city].name)}全体の真ん中（約${fmt(Math.round(R.baseMid/10)*10)}万円）より<b>${R.ratio>=1?'約'+Math.round((R.ratio-1)*100)+'%高め':'約'+Math.round((1-R.ratio)*100)+'%低め'}</b>です。件数が少ないので、ふれ幅が大きくなります。</p>`:SB.town?`<p class="unit" style="margin:6px 0 0">${esc(SB.town)}は${SBK[SB.k].t}の取引が少ないため、${esc(A.C[SB.city].name)}全体で計算しています。</p>`:''}${R.local?'':`<p class="unit" style="margin:6px 0 0">${SB.city?'この市区町村は取引が少ないため、':''}${esc(A.name)}全体の取引で計算しています。</p>`}</section></div>
   <section class="advice"><h3>この目安の見方</h3><ul>
    <li>実際の取引価格（不動産取引価格情報）と、不動産会社が登録した成約価格（成約価格情報）をもとにした<b>統計的な目安</b>です。不動産会社の査定ではありません</li>
    <li>${SB.k==='m'?'階数・向き・管理の状態・駅からの距離':SB.k==='h'?'建物の広さや状態・リフォームの有無・道路との関係・駅からの距離':'形・道路との関係・用途地域・駅からの距離'}などで、同じ地域でも価格は大きく変わります。幅の外側になることもめずらしくありません</li>
    ${SB.k!=='l'?`<li>築年数による差は、${esc(A.name)}の取引から計算した補正をかけています（築${fmt(n(SB.age))}年は、平均的な物件の約${Math.round(R.f*100)}%）</li>`:''}
    <li>年ごとの価格の動きは、いちばん新しい年の水準にそろえています</li></ul></section>
   <section class="lpbridge"><b>この価格で売ると、手元にいくら残る？</b><p>真ん中の価格（約${fmt(mid)}万円）を売却シミュレーターに入れて、仲介手数料・税金・ローンの残りを引いた手取りを確かめられます。</p><button class="btn small primary" data-act="sb2sell" data-p="${mid}">売却シミュレーターで計算する</button></section>
   <p class="unit sbcredit">このサービスは、国土交通省の不動産情報ライブラリのAPI機能を使用していますが、提供情報の最新性、正確性、完全性等が保証されたものではありません。正確な価格は、物件を見たうえでの不動産会社の査定で確かめてください。</p>`;
  const d=document.getElementById('dockin');if(d){d.innerHTML=`<div class="v"><span>相場の目安（真ん中）<b>${fmt(mid)} 万円</b></span></div><button class="btn primary" data-act="sbres">結果を見る</button>`}
}
document.addEventListener('input',e=>{const t=e.target;if(!t.id||!/^sb_(area|age)$/.test(t.id))return;SB[t.id.slice(3)]=t.value===''?'':parseFloat(t.value);SB.example=false;sbSave();
  if(t.id==='sb_area'){const h=t.closest('.fld').querySelector('.hint');if(h)h.textContent=SBK[SB.k].ah+'。1坪＝約3.3㎡（'+fmt(n(SB.area)/3.3058)+'坪）'}sbRender()});
document.addEventListener('change',e=>{const t=e.target;
  if(t.id==='sb_pref'){SB.pref=t.value;SB.city='';SB.town='';sbSave();const f=document.getElementById('sbform');sbLoad(SB.pref).then(()=>{f.innerHTML=sbFields(SBD[SB.pref]);sbRender()}).catch(()=>{})}
  else if(t.id==='sb_city'){SB.city=t.value;SB.town='';sbSave();sbRender();sbTowns(SB.pref,SB.city).then(()=>{const f=document.getElementById('sbform');if(f){f.innerHTML=sbFields(SBD[SB.pref]);sbRender()}})}
  else if(t.id==='sb_town'){SB.town=t.value;sbSave();sbRender()}});
document.addEventListener('click',e=>{if(e.target.closest('[data-act="sbres"]')){const r=document.getElementById('sbresult');if(r)r.scrollIntoView({behavior:'smooth'});return}
  const b=e.target.closest('[data-act="sbk"],[data-act="sb2sell"]');if(!b)return;
  if(b.dataset.act==='sbk'){SB.k=b.dataset.k;if(SB.k==='m'&&n(SB.area)>150)SB.area=65;if(SB.k!=='m'&&n(SB.area)<80)SB.area=165;sbSave();document.getElementById('sbform').innerHTML=sbFields(SBD[SB.pref]);sbRender()}
  else{try{const s=JSON.parse(localStorage.getItem('sainomado-sell-v2')||'null')||sellBase();s.price=+b.dataset.p;s.example=false;localStorage.setItem('sainomado-sell-v2',JSON.stringify(s));if(typeof SV!=='undefined'&&SV)SV.price=+b.dataset.p}catch(x){}
    location.href=window.PAGE?'sell.html':'#sell'}});
