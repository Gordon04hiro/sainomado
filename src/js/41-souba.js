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
/* 都道府県・市区町村の候補（入力して探す） */
const SBPREFK=['ほっかいどう','あおもり','いわて','みやぎ','あきた','やまがた','ふくしま','いばらき','とちぎ','ぐんま','さいたま','ちば','とうきょう','かながわ','にいがた','とやま','いしかわ','ふくい','やまなし','ながの','ぎふ','しずおか','あいち','みえ','しが','きょうと','おおさか','ひょうご','なら','わかやま','とっとり','しまね','おかやま','ひろしま','やまぐち','とくしま','かがわ','えひめ','こうち','ふくおか','さが','ながさき','くまもと','おおいた','みやざき','かごしま','おきなわ'];
const SBED={pref:false};
function sbPrefSug(q){const Q=sbNorm(q);const all=SBPREF.map((p,i)=>[String(i+1).padStart(2,'0'),p,SBPREFK[i]]);
  const list=Q?all.filter(([c,p,k])=>sbNorm(p).includes(Q)||k.startsWith(Q)):['13','14','27','23','11','12','40','01'].map(c=>all[+c-1]);
  return (Q?'':'<p class="sbsl">よく使われる都道府県</p>')+(list.length?list.map(([c,p])=>`<button type="button" data-act="sbpref" data-c="${c}">${p}</button>`).join(''):'<p class="sbsl">見つかりませんでした</p>')+(Q?'':'<p class="sbsl">ほかは名前の一部やよみがなを入れると出てきます</p>')}
function sbCitySug(A,q){const Q=sbNorm(q);let cs=Object.entries(A.C).filter(([c,v])=>v[SB.k]).sort((a,b)=>b[1][SB.k].n-a[1][SB.k].n);
  if(Q)cs=cs.filter(([c,v])=>sbNorm(v.name).includes(Q));const list=cs.slice(0,Q?20:10);
  return (Q?'':'<p class="sbsl">取引の多い市区町村</p>')+(list.length?list.map(([c,v])=>`<button type="button" data-act="sbcity" data-c="${c}">${esc(v.name)}<small>${v[SB.k].n}件</small></button>`).join('')+(cs.length>list.length?`<p class="sbsl">ほか${cs.length-list.length}市区町村。名前の一部を入れると絞り込めます</p>`:''):'<p class="sbsl">見つかりませんでした</p>')}
/* 町名の候補：入力が空なら取引の多い順、入力があれば名前に含むもの（ひらがな・カタカナ・ヶ/ケの違いはそろえて比べる） */
const sbNorm=t=>String(t).replace(/[ァ-ン]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/[ヶヵケ]/g,'け').replace(/[ヶ]/g,'け').replace(/\s/g,'');
const sbTop=T=>Object.keys(T).filter(t=>T[t][SB.k]).sort((a,b)=>T[b][SB.k].n-T[a][SB.k].n);
function sbSugHTML(T,q){const Q=sbNorm(q);let ts=sbTop(T);if(Q)ts=ts.filter(t=>sbNorm(t).includes(Q)).sort((a,b)=>(sbNorm(a).startsWith(Q)?0:1)-(sbNorm(b).startsWith(Q)?0:1)||T[b][SB.k].n-T[a][SB.k].n);
  const list=ts.slice(0,Q?20:10);
  return (Q?'':'<p class="sbsl">取引の多い町名</p>')+(list.length?list.map(t=>`<button type="button" data-act="sbtown" data-t="${esc(t)}">${esc(t)}<small>${T[t][SB.k].n}件</small></button>`).join('')+(ts.length>list.length?`<p class="sbsl">ほか${ts.length-list.length}町名。名前の一部を入れると絞り込めます</p>`:''):'<p class="sbsl">見つかりませんでした。取引が少ない町名は選べないので、市区町村全体の目安を見てください</p>')}
function sbCalc(A,V){
  const k=V.k,c=V.city&&A.C[V.city]&&A.C[V.city][k]?A.C[V.city][k]:null,tw=sbTown(V),t=tw&&tw[k]?tw[k]:null,st=t||c||A.P[k];if(!st)return null;
  const area=Math.max(0,n(V.area)),f=k==='l'?1:A.curve[k][sbBand(Math.max(0,n(V.age)))];
  const u=st.q.map(q=>q*f); // 1㎡あたり（円）
  const base=c||A.P[k];
  return{unit:u,price:u.map(x=>x*area/1e4),n:st.n,local:!!c,town:!!t,area,f,ratio:t?t.q[1]/base.q[1]:null,baseMid:base.q[1]*f*area/1e4};
}
/* 年ごとの推移のグラフ（1㎡あたりの中央値。築年数の補正をかけた値）。市区町村と都道府県全体の2本 */
function sbTrendHTML(A,V){
  const TR=A.TR;if(!TR)return '';const k=V.k,cs=V.city&&TR.C[V.city]&&TR.C[V.city][k]?TR.C[V.city][k]:null,ps=TR.P[k];if(!ps&&!cs)return '';
  const partial=!/第4四半期/.test(TR.last||''),lastY=+String(TR.last||'').slice(0,4);
  const full=a=>(a||[]).filter(r=>!(partial&&r[0]===lastY));
  const S=[cs?{a:cs,name:A.C[V.city].name,col:'var(--brand)',w:3}:null,ps?{a:ps,name:A.name+'全体',col:'var(--muted)',w:2,dash:'5 4'}:null].filter(Boolean);
  const ys=S.flatMap(x=>x.a.map(r=>r[0])),y0=Math.min(...ys),y1=Math.max(...ys),vs=S.flatMap(x=>x.a.map(r=>r[1]/1e4)),vmax=Math.max(...vs)*1.1,vmin=0;
  const W=400,H=230,L=34,R=18,T=12,B=26,X=y=>L+(y-y0)/Math.max(1,y1-y0)*(W-L-R),Y=v=>T+(1-(v-vmin)/(vmax-vmin))*(H-T-B);
  const step=vmax>40?10:vmax>20?5:vmax>8?2:1,ticks=[];for(let v=0;v<=vmax;v+=step)ticks.push(v);
  const svg=`<svg viewBox="0 0 ${W} ${H}" class="sbtr" role="img" aria-label="1㎡あたりの価格の年ごとの推移">
   ${ticks.map(v=>`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${L-6}" y="${Y(v)+4}" text-anchor="end" font-size="12" fill="var(--muted)">${v}</text>`).join('')}
   ${[...new Set(ys)].filter(y=>(y-y0)%4===0||y===y1).map(y=>`<text x="${X(y)}" y="${H-8}" text-anchor="middle" font-size="12" fill="var(--muted)">${y}${partial&&y===lastY?'*':''}</text>`).join('')}
   ${S.slice().reverse().map(x=>`<polyline fill="none" stroke="${x.col}" stroke-width="${x.w}" ${x.dash?`stroke-dasharray="${x.dash}"`:''} stroke-linejoin="round" points="${x.a.map(r=>X(r[0]).toFixed(1)+','+Y(r[1]/1e4).toFixed(1)).join(' ')}"/>`).join('')}
  </svg>`;
  const main=full(S[0].a),chg=(a,b)=>{const r=b[1]/a[1]-1;return (r>=0?'+':'')+Math.round(r*100)+'%'};
  const pick=n=>{const f=main.find(r=>r[0]>=main[main.length-1][0]-n);return f};
  const last=main[main.length-1],p10=pick(10),p5=pick(5);
  return `<section class="chartcard sbtrend"><h3>1㎡あたりの価格の推移（${SBK[k].t}）</h3>
   <p class="unit" style="margin:0 0 6px">${S.map(x=>`<span class="lg"><i style="border-color:${x.col};${x.dash?'border-top-style:dashed':''}"></i>${esc(x.name)}</span>`).join('')}　単位：万円/㎡</p>${svg}
   <p class="sbtrs">${esc(S[0].name)}：${p10&&p10!==last?`${p10[0]}年→${last[0]}年で<b>${chg(p10,last)}</b>`:''}${p5&&p5!==last&&p5!==p10?`、${p5[0]}年→${last[0]}年で<b>${chg(p5,last)}</b>`:''}</p>
   <p class="unit" style="margin:4px 0 0">国の不動産取引価格情報（アンケート調査）の、その年の1㎡あたりの中央値です${k==='l'?'':'（築年数の違いをそろえた値）'}。${partial?`*${lastY}年は${esc(TR.last)}までの途中の値です。`:''}${V.town?'町名ごとは件数が少ないため、推移は市区町村全体で見ています。':''}件数の少ない年は表示していません。</p></section>`;
}
/* 地価公示・地価調査の地点（国土数値情報）：市区町村ごとのファイル */
const SBC={};
function sbChika(pref,city){const key=pref+'/'+city;if(key in SBC)return Promise.resolve(SBC[key]);if(!city||typeof fetch!=='function')return Promise.resolve(null);
  return fetch('assets/chika/'+pref+'/'+city+'.json').then(r=>r.ok?r.json():null).catch(()=>null).then(j=>(SBC[key]=j))}
const yen=v=>Math.round(v).toLocaleString('ja-JP');
function sbSpark(h){if(!h||h.length<2)return '';const v=h.map(x=>x[1]),mn=Math.min(...v),mx=Math.max(...v),W=90,H=26;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><polyline fill="none" stroke="var(--brand)" stroke-width="2" points="${h.map((x,i)=>(i/(h.length-1)*(W-4)+2).toFixed(1)+','+(H-2-(mx>mn?(x[1]-mn)/(mx-mn):.5)*(H-4)).toFixed(1)).join(' ')}"/></svg>`}
function sbChikaHTML(A,V){
  const P=SBC[V.pref+'/'+V.city];if(!V.city||!P||!P.length)return '';
  const cname=A.C[V.city]?A.C[V.city].name:'';
  const inTown=V.town?P.filter(x=>x.addr.replace(cname,'').startsWith(V.town)):[];
  const res=P.filter(x=>x.use==='住宅'),pool=inTown.length?inTown:res.length?res:P;
  const med=a=>{const b=a.slice().sort((x,y)=>x-y);return b.length?b[Math.floor((b.length-1)/2)]:NaN};
  const row=x=>`<div class="ckrow"><div class="ckl"><b>${esc(x.no)}</b><small>${x.t==='公'?'地価公示':'地価調査'}・${esc(x.use)}</small><span>${esc(x.jk||x.addr.replace(cname,''))}</span>${x.st?`<small>${esc(x.st)}駅${x.dist?' '+fmt(x.dist)+'m':''}</small>`:''}</div><div class="ckr"><b>${yen(x.p)}<small>円/㎡</small></b><small>${(x.p*3.3058/1e4).toFixed(1)}万円/坪</small><span class="${x.chg>0?'up':x.chg<0?'dn':''}">前年比 ${x.chg>0?'+':''}${x.chg}%</span>${sbSpark(x.h)}</div></div>`;
  const list=pool.slice().sort((a,b)=>b.p-a.p);
  const head=inTown.length?`${esc(V.town)}にある地点（${inTown.length}地点）`:`${esc(cname)}の${res.length?'住宅地の':''}地点（${pool.length}地点${V.town?`。${esc(V.town)}には地点がないため、${esc(cname)}全体`:''}）`;
  const yrs={};res.forEach(x=>x.h.forEach(([y,v])=>{(yrs[y]=yrs[y]||[]).push(v)}));
  const tr=Object.keys(yrs).map(Number).sort((a,b)=>a-b).filter(y=>yrs[y].length>=3).map(y=>[y,med(yrs[y])]);
  const chg=tr.length>=11?Math.round((tr[tr.length-1][1]/tr[tr.length-11][1]-1)*100):null;
  return `<section class="chartcard sbchika"><h3>国の土地の価格（地価公示・地価調査）</h3>
   <p class="unit" style="margin:0 0 8px">国や都道府県が毎年、決まった地点の土地の価格（1㎡あたり）を調べて公表しているものです。${esc(cname)}の住宅地の真ん中は<b>約${yen(med(res.map(x=>x.p)))}円/㎡</b>、前年比は<b>${(m=>(m>0?'+':'')+m)(Math.round(med(res.map(x=>x.chg))*10)/10)}%</b>${chg!=null?`（${tr[tr.length-11][0]}年→${tr[tr.length-1][0]}年で${chg>0?'+':''}${chg}%）`:''}です。</p>
   <p class="sbchh">${head}</p>
   <div class="cklist">${list.slice(0,6).map(row).join('')}</div>
   ${list.length>6?`<details class="sbmore"><summary>ほかの${list.length-6}地点を見る</summary><div class="cklist">${list.slice(6).map(row).join('')}</div></details>`:''}
   <p class="unit" style="margin:8px 0 0"><b>路線価について</b>：相続税や贈与税の計算に使う路線価は、地価公示の価格のおよそ8割を目安に、国税庁が道路ごとに決めています。正確な路線価は、国税庁の<a href="https://www.rosenka.nta.go.jp/" target="_blank" rel="noopener">路線価図・評価倍率表</a>で確かめられます。</p>
   <p class="unit" style="margin:4px 0 0">地価公示は1月1日時点、地価調査は7月1日時点の価格です。推移は${FROMY}年からの毎年の価格。出典：国土数値情報（地価公示データ・都道府県地価調査データ）（国土交通省）を加工して作成</p></section>`;
}
const FROMY=2005;
function sbFields(A){
  const cities=A?Object.entries(A.C).filter(([c,v])=>v[SB.k]).sort((a,b)=>a[0].localeCompare(b[0])):[];
  return `<div class="fields">
   <div class="fld"><span class="lab">都道府県</span>${SBED.pref?`<input id="sb_prefq" class="sbq" type="search" autocomplete="off" placeholder="都道府県を入力（例：しずおか・静岡）" aria-label="都道府県を入力して探す"><div class="sbsug" id="sb_psug">${sbPrefSug('')}</div>`:`<div class="sbsel"><b>${SBPREF[+SB.pref-1]}</b><button type="button" class="btn small" data-act="sbedit" data-w="pref">変更する</button></div>`}</div>
   <div class="fld"><span class="lab">市区町村</span>${!A?'<p class="unit">読み込み中…</p>':SB.city&&A.C[SB.city]?`<div class="sbsel"><b>${esc(A.C[SB.city].name)}</b><small>${A.C[SB.city][SB.k]?A.C[SB.city][SB.k].n+'件':''}</small><button type="button" class="btn small" data-act="sbedit" data-w="city">変更する</button></div>`:`<input id="sb_cityq" class="sbq" type="search" autocomplete="off" placeholder="市区町村を入力（例：${esc((cities.slice().sort((a,b)=>b[1][SB.k].n-a[1][SB.k].n)[0]||[0,{name:''}])[1].name)}）" aria-label="市区町村を入力して探す"><div class="sbsug" id="sb_csug">${sbCitySug(A,'')}</div><span class="hint">選ばなければ${esc(A.name)}全体で計算します。取引が少ない市区町村は出てきません</span>`}</div>
   ${(()=>{const T=SB.city?SBT[SB.pref+'/'+SB.city]:null;if(!T)return '';const ts=Object.keys(T).filter(t=>T[t][SB.k]);if(!ts.length)return '';
     const cur=SB.town&&T[SB.town]?SB.town:'';
     return `<div class="fld"><span class="lab">町名（任意）</span>${cur?`<div class="sbsel"><b>${esc(cur)}</b><small>${T[cur][SB.k]?T[cur][SB.k].n+'件':'取引が少ない種類'}</small><button type="button" class="btn small" data-act="sbtownclr">変更する</button></div>`:
      `<input id="sb_townq" type="search" autocomplete="off" placeholder="町名を入力（例：${esc(sbTop(T)[0]||'')}）" aria-label="町名を入力して探す"><div class="sbsug" id="sb_tsug">${sbSugHTML(T,'')}</div>`}
      <span class="hint">${esc(A.C[SB.city].name)}で、5年で5件以上の取引がある${ts.length}の町名から選べます。選ばなければ${esc(A.C[SB.city].name)}全体で計算します</span></div>`})()}
   <div class="fld"><span class="lab">種類</span><span class="seg" role="group" aria-label="種類">${Object.entries(SBK).map(([k,v])=>`<button type="button" data-act="sbk" data-k="${k}" aria-pressed="${SB.k===k}">${v.t}</button>`).join('')}</span></div>
   <label class="fld"><span class="lab">${SBK[SB.k].area}</span><span class="inp"><input id="sb_area" type="number" inputmode="decimal" min="0" step="1" value="${esc(SB.area)}"><span class="u">㎡</span></span><span class="hint">${SBK[SB.k].ah}。1坪＝約3.3㎡（${fmt(n(SB.area)/3.3058)}坪）</span></label>
   ${SB.k==='l'?'':`<label class="fld"><span class="lab">築年数</span><span class="inp"><input id="sb_age" type="number" inputmode="numeric" min="0" max="80" step="1" value="${esc(SB.age)}"><span class="u">年</span></span></label>`}
  </div>`;
}
function vSouba(v){
  v.innerHTML=`<div class="wrap"><div class="crumb"><a href="#home">サイのまど</a> › 売却相場の目安</div>
  <div class="thead"><h1>売却相場の目安</h1><p>国土交通省が公開している、実際の不動産の取引価格（直近5年分）から、地域・種類・広さ・築年数が近い物件の価格の幅を出します。売り出す前に「だいたいの相場」をつかむためのツールです。</p>
   <div class="safe">✓ 入力内容はこの端末の中だけに保存され、どこにも送信されません。名前や連絡先も聞きません</div></div>
  <div class="formgrid"><details class="grp" open><summary>物件のこと</summary><div class="body" id="sbform">${sbFields(SBD[SB.pref])}</div></details></div>
  <section class="result" id="sbresult"><p class="unit">データを読み込んでいます…</p></section></div>`;
  sbLoad(SB.pref).then(()=>Promise.all([sbTowns(SB.pref,SB.city),sbChika(SB.pref,SB.city)])).then(()=>{if(route()!=='souba')return;document.getElementById('sbform').innerHTML=sbFields(SBD[SB.pref]);sbRender()}).catch(e=>{if(e==='nofetch')return;const r=document.getElementById('sbresult');if(r)r.innerHTML='<p class="unit">データを読み込めませんでした。通信の状態を確かめて、ページを読み込み直してください。</p>'});
}
function sbRender(){
  const box=document.getElementById('sbresult'),A=SBD[SB.pref];if(!box||!A)return;
  const R=sbCalc(A,SB);
  if(!R||!(R.area>0)){box.innerHTML='<p class="unit">面積を入れると、相場の目安が出ます。</p>';return}
  const cn=(SB.city&&A.C[SB.city]?A.C[SB.city].name:A.name+'全体')+(R.town?' '+SB.town:''), mid=Math.round(R.price[1]/10)*10;
  box.innerHTML=`<h2>${esc(cn)}の${SBK[SB.k].t}の相場の目安</h2>
   <div class="sbmain"><p class="sbl">中央値（取引を価格順に並べたときの真ん中）</p><p class="sbv"><b>約${fmt(mid)}</b><small>万円</small></p>
    <div class="sbbar" aria-hidden="true"><span class="lo">${fmt(Math.round(R.price[0]/10)*10)}</span><span class="md"></span><span class="hi">${fmt(Math.round(R.price[2]/10)*10)}</span></div>
    <p class="sbr">近い条件の取引の半分が、<b>約${fmt(Math.round(R.price[0]/10)*10)}万〜${fmt(Math.round(R.price[2]/10)*10)}万円</b>の間に入ります</p></div>
   <div class="panels"><section class="panel"><div class="ph"><span class="nm">1㎡あたり・1坪あたり</span></div><div class="kv">${kvRow('1㎡あたり（中央値）',(Math.round(R.unit[1]/1000)/10).toLocaleString('ja-JP')+'<small>万円</small>')}${kvRow('1坪あたり（中央値）',(Math.round(R.unit[1]*3.3058/1000)/10).toLocaleString('ja-JP')+'<small>万円</small>')}</div></section>
    <section class="panel"><div class="ph"><span class="nm">もとにしたデータ</span></div><div class="kv">${kvRow('取引の件数',fmt(R.n)+'<small>件</small>')}${kvRow('期間',`<small>${esc(A.from)}〜${esc(A.to)}</small>`)}</div>${R.town?`<p class="unit" style="margin:6px 0 0">${esc(SB.town)}の取引だけで計算しています。${esc(A.C[SB.city].name)}全体の中央値（約${fmt(Math.round(R.baseMid/10)*10)}万円）より<b>${R.ratio>=1?'約'+Math.round((R.ratio-1)*100)+'%高め':'約'+Math.round((1-R.ratio)*100)+'%低め'}</b>です。件数が少ないので、ふれ幅が大きくなります。</p>`:SB.town?`<p class="unit" style="margin:6px 0 0">${esc(SB.town)}は${SBK[SB.k].t}の取引が少ないため、${esc(A.C[SB.city].name)}全体で計算しています。</p>`:''}${R.local?'':`<p class="unit" style="margin:6px 0 0">${SB.city?'この市区町村は取引が少ないため、':''}${esc(A.name)}全体の取引で計算しています。</p>`}</section></div>
   ${sbTrendHTML(A,SB)}
   ${sbChikaHTML(A,SB)}
   <section class="advice"><h3>この目安の見方</h3><ul>
    <li>実際の取引価格（不動産取引価格情報）と、不動産会社が登録した成約価格（成約価格情報）をもとにした<b>統計的な目安</b>です。不動産会社の査定ではありません</li>
    <li>${SB.k==='m'?'階数・向き・管理の状態・駅からの距離':SB.k==='h'?'建物の広さや状態・リフォームの有無・道路との関係・駅からの距離':'形・道路との関係・用途地域・駅からの距離'}などで、同じ地域でも価格は大きく変わります。幅の外側になることもめずらしくありません</li>
    ${SB.k!=='l'?`<li>築年数による差は、${esc(A.name)}の取引から計算した補正をかけています（築${fmt(n(SB.age))}年は、平均的な物件の約${Math.round(R.f*100)}%）</li>`:''}
    <li>平均値ではなく<b>中央値</b>を使っています。平均値は、ごく一部の高い取引（広い土地や高級物件など）に引っぱられて高めに出やすいためです</li>
    <li>年ごとの価格の動きは、いちばん新しい年の水準にそろえています</li></ul></section>
   <section class="lpbridge"><b>この価格で売ると、手元にいくら残る？</b><p>中央値（約${fmt(mid)}万円）を売却シミュレーターに入れて、仲介手数料・税金・ローンの残りを引いた手取りを確かめられます。</p><button class="btn small primary" data-act="sb2sell" data-p="${mid}">売却シミュレーターで計算する</button></section>
   <p class="unit sbcredit">このサービスは、国土交通省の不動産情報ライブラリのAPI機能を使用していますが、提供情報の最新性、正確性、完全性等が保証されたものではありません。正確な価格は、物件を見たうえでの不動産会社の査定で確かめてください。</p>`;
  const d=document.getElementById('dockin');if(d){d.innerHTML=`<div class="v"><span>相場の目安（中央値）<b>${fmt(mid)} 万円</b></span></div><button class="btn primary" data-act="sbres">結果を見る</button>`}
}
document.addEventListener('input',e=>{const t=e.target;if(!t.id||!/^sb_(area|age)$/.test(t.id))return;SB[t.id.slice(3)]=t.value===''?'':parseFloat(t.value);SB.example=false;sbSave();
  if(t.id==='sb_area'){const h=t.closest('.fld').querySelector('.hint');if(h)h.textContent=SBK[SB.k].ah+'。1坪＝約3.3㎡（'+fmt(n(SB.area)/3.3058)+'坪）'}sbRender()});
document.addEventListener('change',e=>{const t=e.target;
  if(t.id==='sb_pref'){SB.pref=t.value;SB.city='';SB.town='';sbSave();const f=document.getElementById('sbform');sbLoad(SB.pref).then(()=>{f.innerHTML=sbFields(SBD[SB.pref]);sbRender()}).catch(()=>{})}
  else if(t.id==='sb_city'){SB.city=t.value;SB.town='';sbSave();sbRender();sbTowns(SB.pref,SB.city).then(()=>{const f=document.getElementById('sbform');if(f){f.innerHTML=sbFields(SBD[SB.pref]);sbRender()}})}
  });
document.addEventListener('input',e=>{const id=e.target.id;if(id==='sb_prefq'){const b=document.getElementById('sb_psug');if(b)b.innerHTML=sbPrefSug(e.target.value);return}if(id==='sb_cityq'){const b=document.getElementById('sb_csug'),A=SBD[SB.pref];if(b&&A)b.innerHTML=sbCitySug(A,e.target.value);return}if(id!=='sb_townq')return;const T=SBT[SB.pref+'/'+SB.city],b=document.getElementById('sb_tsug');if(T&&b)b.innerHTML=sbSugHTML(T,e.target.value)});
document.addEventListener('click',e=>{if(e.target.closest('[data-act="sbres"]')){const r=document.getElementById('sbresult');if(r)r.scrollIntoView({behavior:'smooth'});return}
  const pb=e.target.closest('[data-act="sbpref"],[data-act="sbcity"],[data-act="sbedit"]');
  if(pb){const f=document.getElementById('sbform'),re=()=>{f.innerHTML=sbFields(SBD[SB.pref]);sbRender()},act=pb.dataset.act;
    if(act==='sbedit'){if(pb.dataset.w==='pref')SBED.pref=true;else{SB.city='';SB.town=''}re();const q=document.getElementById(pb.dataset.w==='pref'?'sb_prefq':'sb_cityq');if(q)q.focus()}
    else if(act==='sbpref'){SB.pref=pb.dataset.c;SB.city='';SB.town='';SBED.pref=false;sbSave();re();sbLoad(SB.pref).then(re).catch(()=>{})}
    else{SB.city=pb.dataset.c;SB.town='';sbSave();re();Promise.all([sbTowns(SB.pref,SB.city),sbChika(SB.pref,SB.city)]).then(re)}
    return}
  const tb=e.target.closest('[data-act="sbtown"],[data-act="sbtownclr"]');
  if(tb){SB.town=tb.dataset.act==='sbtown'?tb.dataset.t:'';sbSave();const f=document.getElementById('sbform');f.innerHTML=sbFields(SBD[SB.pref]);sbRender();if(!SB.town){const q=document.getElementById('sb_townq');if(q)q.focus()}return}
  const b=e.target.closest('[data-act="sbk"],[data-act="sb2sell"]');if(!b)return;
  if(b.dataset.act==='sbk'){SB.k=b.dataset.k;if(SB.k==='m'&&n(SB.area)>150)SB.area=65;if(SB.k!=='m'&&n(SB.area)<80)SB.area=165;sbSave();document.getElementById('sbform').innerHTML=sbFields(SBD[SB.pref]);sbRender()}
  else{try{const s=JSON.parse(localStorage.getItem('sainomado-sell-v2')||'null')||sellBase();s.price=+b.dataset.p;s.example=false;localStorage.setItem('sainomado-sell-v2',JSON.stringify(s));if(typeof SV!=='undefined'&&SV)SV.price=+b.dataset.p}catch(x){}
    location.href=window.PAGE?'sell.html':'#sell'}});
