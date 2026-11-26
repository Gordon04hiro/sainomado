/* ---------- 目標から逆算・シナリオ・予算と実績 ---------- */
const RTABS=[['overview','概要','貯蓄の推移と見どころ','M3 17l5-5 4 4 8-8M14 8h6v6'],['bs','家計の決算書','財産と1年のもうけ（BS・PL）','M4 4h16v16H4zM12 4v16M4 12h16'],['goal','目標から逆算','目標に届く積立・働き方','M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],['scen','シナリオ','景気が良い・悪いと確率','M4 18c4-10 8 4 16-12M4 6c4 8 10 6 16 12'],['month','月ごとに見る','決断の前後2年の預貯金の動き','M4 6h16M4 6v14h16V6M8 3v6M16 3v6M4 11h16'],['yj','予算と実績','計画と実際を比べて見直す','M5 20V10M12 20V4M19 20v-7'],['cf','キャッシュフロー表','毎年の収入・支出の一覧','M4 5h16M4 10h16M4 15h16M4 20h16']];
function search(lo,hi,ok,step,iters){ // ok(x) が true になる最小の x（単調な前提）
  if(!ok(hi)) return null; if(ok(lo)) return lo;
  for(let k=0;k<(iters||30);k++){const m=(lo+hi)/2;if(ok(m))hi=m;else lo=m}
  return step?Math.ceil(hi/step)*step:hi;
}
function goalOK(S,g){const r=sim(clone(S)),s=summarize(r,S);return !s.neg&&(g.type==='noshort'||s.last.bal>=n(g.target))}
const LEVERS={
 save:{t:'毎月の積立を増やす',u:'万円/月',apply:(S,x)=>{S.assets.nisa.mon=n(S.assets.nisa.mon)+x;S.assets.nisa.until=Math.max(n(S.assets.nisa.until),60)},lo:0,hi:30,step:0.1,
  say:x=>`NISAの積立を毎月あと${x.toFixed(1)}万円増やす（60歳まで）`},
 work:{t:'働く期間を延ばす',u:'歳',apply:(S,x)=>{S.workEnd=Math.round(x);if(!n(S.reinc))S.reinc=Math.round(n(S.inc)*0.5)},lo:null,hi:80,step:1,
  say:x=>`${Math.round(x)}歳まで働く（定年後の収入で）`},
 live:{t:'生活費を見直す',u:'万円/月',apply:(S,x)=>{S.live=Math.max(0,n(S.live)-x)},lo:0,hi:null,step:0.1,
  say:x=>`生活費を毎月${x.toFixed(1)}万円下げる`},
 yld:{t:'運用の利回りを上げる',u:'%',apply:(S,x)=>{normPlan(S);['nisa','tax','ideco','snisa','sideco'].forEach(k=>S.assets[k].rate=n(S.assets[k].rate)+x)},lo:0,hi:6,step:0.1,
  say:x=>`投資の利回りの見込みを${x.toFixed(1)}%上げる`},
 price:{t:'家の価格を下げる',u:'万円',when:S=>S.house==='buy'&&n(S.buyAge)>=Math.round(n(S.age)),apply:(S,x)=>{S.price=Math.max(0,n(S.price)-x)},lo:0,hi:null,step:10,
  say:(x,S)=>`物件価格を${fmt(x)}万円下げる（${fmt(Math.max(0,n(S.price)-x))}万円の家にする）`}
};
/* 家計全体で見た物件価格の上限：S の住まいを「buyAge 歳でこの条件で買う」に置き換えて、95歳までお金が足りなくならない最大の価格（10万円単位）。
   価格0でも足りない場合は null。住宅ローン診断とライフプラン診断をつなぐ計算 */
function lpMaxPrice(S0,o){
  const base=clone(S0);normPlan(base);base.house='buy';base.buyAge=Math.max(Math.round(n(base.age)),Math.round(n(o.buyAge)||0));base.down=n(o.down);base.rate=n(o.rate);base.term=n(o.term)||35;
  if(!(n(base.rent)>0))base.rent=8;if(!(n(base.hcost)>0))base.hcost=12;
  const ok=p=>{const T=clone(base);T.price=p;T.down=Math.min(n(base.down),p);const r=sim(T);return !summarize(r,T).neg};
  if(!ok(0))return null;let lo=0,hi=30000;if(ok(hi))return hi;
  for(let k=0;k<22;k++){const m=(lo+hi)/2;if(ok(m))lo=m;else hi=m}
  return Math.floor(lo/10)*10;
}
function goalCalc(S,g){
  const out={};
  const base=goalOK(S,g);
  Object.entries(LEVERS).forEach(([k,L])=>{
    if(L.when&&!L.when(S))return;
    if(base){out[k]={x:0,ok:true};return}
    const lo=k==='work'?n(S.workEnd):L.lo, hi=k==='live'?n(S.live):k==='price'?n(S.price):L.hi;
    const x=search(lo,hi,v=>{const T=clone(S);L.apply(T,v);return goalOK(T,g)},L.step,k==='work'?12:24);
    out[k]={x,ok:x!=null};
  });
  return{base,out};
}
function goalTab(cur){
  const g=LP.goal||(LP.goal={type:'fin95',target:1000});
  const G=goalCalc(cur.S,g);
  const cards=Object.entries(LEVERS).filter(([k])=>G.out[k]).map(([k,L])=>{const o=G.out[k];
    const v=G.base?'<span class="chip good" style="font-size:13px">達成</span>':k==='work'?(o.ok?Math.round(o.x)+'<small>歳まで</small>':'—'):(o.ok?(k==='yld'?'+':'')+(k==='price'?fmt(o.x):(Math.round(o.x*10)/10).toLocaleString('ja-JP'))+'<small>'+L.u+'</small>':'—');
    return `<div class="lever"><span>${L.t}</span><b>${v}</b><em>${G.base?'今のままで達成できます':o.ok?esc(L.say(o.x,cur.S)):'この方法だけでは届きません'}</em>${!G.base&&o.ok&&keys().length<3?`<button class="btn small" data-act="lever" data-k="${k}" data-x="${o.x}">このやり方でパターンを作る</button>`:''}</div>`}).join('');
  return `<section class="chartcard"><h3 style="font-size:16px;margin-bottom:4px">目標から逆算する（パターン${cur.key}）</h3>
   <p class="unit" style="margin:0 0 10px">目標を決めると、それを達成するために「何を・どれだけ」変えればいいかを、1つずつ計算します。会社でいう目標利益からの逆算です。</p>
   <div class="fields" style="margin-bottom:12px"><label class="fld"><span class="lab">目標</span><select id="g_type" data-goal="type"><option value="fin95"${g.type==='fin95'?' selected':''}>95歳時点で金融資産を残す</option><option value="noshort"${g.type==='noshort'?' selected':''}>最後までお金が足りなくならない</option></select></label>
   <label class="fld"${g.type==='noshort'?' hidden':''}><span class="lab">残したい金額</span><span class="inp"><input id="g_target" data-goal="target" type="number" inputmode="decimal" value="${esc(g.target)}"><span class="u">万円</span></span></label></div>
   <div class="levers">${cards}</div>
   <p class="unit" style="margin:10px 0 0">それぞれ、ほかの条件は今のままで1つだけ変えた場合の計算です。実際には、いくつかを少しずつ組み合わせるのが現実的です。利回りを上げると、そのぶん値動きのブレも大きくなります。</p></section>`;
}
/* シナリオ */
const SCEN=[['opt','楽観',{rate:1,infl:-0.5,raise:0.3},'var(--good)'],['base','標準',{rate:0,infl:0,raise:0},'var(--accent)'],['pess','悲観',{rate:-1.5,infl:0.8,raise:-0.3},'var(--bad)']];
function scenPlan(S,d){const T=clone(S);normPlan(T);['nisa','tax','ideco','snisa','sideco'].forEach(k=>T.assets[k].rate=Math.max(0,n(T.assets[k].rate)+d.rate));T.assets.others.forEach(o=>o.rate=n(o.rate)+d.rate);T.assets.cash.rate=Math.max(0,n(T.assets.cash.rate)+Math.min(0,d.rate)/4);T.infl=n(T.infl)+d.infl;T.raise=n(T.raise)+d.raise;T.sraise=n(T.sraise)+d.raise;return T}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function monte(S,N){
  const R=rng(20261115),len=Math.max(Math.round(n(S.age)),95)-Math.round(n(S.age))+1;
  const gauss=()=>{let u=0,v=0;while(!u)u=R();while(!v)v=R();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  let okN=0;const paths=[];
  for(let k=0;k<N;k++){const z=Array.from({length:len},gauss);const r=sim(clone(S),{z});if(!r.some(x=>x.cash<-0.5))okN++;paths.push(r.map(x=>x.bal))}
  const q=p=>paths[0].map((_,i)=>{const col=paths.map(x=>x[i]).sort((a,b)=>a-b);return col[Math.floor(p*(col.length-1))]});
  return{prob:okN/N,p10:q(0.1),p50:q(0.5),p90:q(0.9)};
}
function bandSVG(r,mc){
  const W=680,H=240,L=58,Rr=14,T=14,B=30,nn=r.length;
  const lo=Math.min(0,...mc.p10),hi=Math.max(...mc.p90);
  const tk=niceTicks(lo,hi,5),y0=tk[0],y1=tk[tk.length-1];
  const X=i=>L+i*(W-L-Rr)/Math.max(1,nn-1),Y=v=>T+(y1-v)*(H-T-B)/((y1-y0)||1);
  let g='';tk.forEach(v=>{g+=`<line x1="${L}" x2="${W-Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="${v===0?1.6:1}"${v===0?'':' stroke-dasharray="2 3"'}/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${v<0?'▲':''}${Math.abs(v).toLocaleString('ja-JP')}</text>`});
  r.forEach((x,i)=>{if(x.a%10===0||i===0)g+=`<text x="${X(i)}" y="${H-10}" text-anchor="middle">${x.a}歳</text>`});
  g+=`<polygon points="${mc.p90.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ')} ${mc.p10.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).reverse().join(' ')}" fill="var(--accent)" fill-opacity=".16"/>`;
  g+=`<polyline points="${mc.p50.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.4"/>`;
  g+=`<text x="${L-8}" y="${T-2}" text-anchor="end" style="font-size:10px">万円</text>`;
  return `<div class="legend" style="margin-bottom:6px"><span><span class="dot a"></span>真ん中の結果</span><span><span class="dot" style="background:var(--accent);opacity:.35"></span>10回中8回がこの幅に入る</span></div><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="運用のブレを考えた金融資産の幅">${g}</svg>`;
}
function scenTab(cur){
  const rs=SCEN.map(([k,l,d,c])=>{const T=scenPlan(cur.S,d),r=sim(T);return{k,l,d,c,r,s:summarize(r,T)}});
  const mc=monte(cur.S,600);
  const pr=Math.round(mc.prob*100);const pc=pr>=80?'good':pr>=50?'warn':'bad';
  return `<section class="chartcard"><h3 style="font-size:16px;margin-bottom:4px">楽観・標準・悲観で比べる（パターン${cur.key}）</h3>
   <p class="unit" style="margin:0 0 10px">運用利回り・物価・昇給がずれたときに、結果がどれくらい変わるかを見ます。標準は今の入力のままです。</p>
   <div class="panels">${rs.map(x=>`<section class="panel"><div class="ph"><span class="dot" style="background:${x.c}"></span><span class="nm">${x.l}</span><span class="chip ${x.s.st.c}">${x.s.st.t}</span></div><div class="kv"><span>95歳時点の金融資産</span><b class="${x.s.last.bal<0?'neg':''}">${fmt(x.s.last.bal)}<small>万円</small></b><span>前提</span><b style="font-size:12.5px;font-family:var(--f-body);font-weight:400">利回り${x.d.rate>=0?'+':''}${x.d.rate}%・物価${x.d.infl>=0?'+':''}${x.d.infl}%・昇給${x.d.raise>=0?'+':''}${x.d.raise}%</b></div></section>`).join('')}</div>
   ${chartSVG(rs.map(x=>({rows:x.r,color:x.c,dash:x.k==='base'?'':x.k==='opt'?'6 4':'2 3'})),null,'sc1')}</section>
  <section class="chartcard"><h3 style="font-size:16px;margin-bottom:4px">運用のブレを考える</h3>
   <p class="unit" style="margin:0 0 10px">投資の成績は毎年ばらつきます。良い年・悪い年がランダムに来る場合を600回試して、最後まで足りる確率と、金融資産の幅を出しました。物価や収入は標準のままで、運用成績だけを変えています。</p>
   <div class="kpis"><div class="kpi ${pc==='good'?'':pc}"><span>95歳まで足りる確率</span><b>${pr}<small>%</small></b><em>600回中${Math.round(mc.prob*600)}回</em></div><div class="kpi"><span>95歳時点（真ん中）</span><b>${fmt(mc.p50[mc.p50.length-1])}<small>万円</small></b></div><div class="kpi"><span>95歳時点（悪いほうから1割）</span><b class="${mc.p10[mc.p10.length-1]<0?'neg':''}">${fmt(mc.p10[mc.p10.length-1])}<small>万円</small></b></div></div>
   ${bandSVG(cur.r,mc)}
   <p class="unit" style="margin:8px 0 0">値動きの大きさは、利回りの見込みが高い口座ほど大きくなる前提です（利回り4%なら年14%程度）。株価の動きは口座どうしで連動するとしています。値動きがあると、平均の利回りが同じでも増え方は鈍るため、「真ん中の結果」は標準シナリオより低めに出ます。過去の実績や将来を保証するものではありません。</p></section>`;
}
/* 予算と実績 */
/* 実績の残高を、ご本人と配偶者の口座に、見込みの割合で分ける */
const SPL={nisa:['snisa','nisaS','nisa'],ideco:['sideco','idecoS','ideco'],kyosai:['skyosai','kyoS','kyo']};
function splitSp(S,k,tot,row){const m=SPL[k];if(!m||S.spouse!=='yes'){S.assets[k].bal=Math.round(tot);return}
  const all=row?row[m[2]]:n(S.assets[k].bal)+n(S.assets[m[0]].bal),spv=row?row[m[1]]:n(S.assets[m[0]].bal),r=all>0?spv/all:0;
  S.assets[m[0]].bal=Math.round(tot*r);S.assets[k].bal=Math.round(tot)-S.assets[m[0]].bal}
const YJA=[['cash','預貯金'],['nisa','NISA'],['tax','課税口座'],['ideco','iDeCo'],['kyosai','小規模企業共済']];
const YJK={cash:'cash',nisa:'nisa',tax:'taxa',ideco:'ideco',kyosai:'kyo'};
function yjFin(v,br){if(!v)return null;const given=YJA.filter(([k])=>v[k]!==''&&v[k]!=null);
  if(given.length) return YJA.reduce((s,[k])=>s+(v[k]!==''&&v[k]!=null?n(v[k]):(br&&br[YJK[k]]!=null?Math.max(0,br[YJK[k]]):0)),0);
  return v.fin!==''&&v.fin!=null?n(v.fin):null}
function yjChart(B,fr,AC){
  const W=680,H=240,L=58,Rr=14,T=14,Bm=30;
  const y0=B.rows[0].y,y1=Math.max(B.rows[B.rows.length-1].y,fr[fr.length-1].y);
  const pts=B.rows.map(x=>[x.y,x.fin]),fp=fr.map(x=>[x.y,x.bal]),ap=Object.keys(AC).map(Number).map(y=>[y,yjFin(AC[y],B.rows.find(r=>r.y===y))]).filter(x=>x[1]!=null);
  const all=[...pts,...fp,...ap].map(x=>x[1]);const tk=niceTicks(Math.min(0,...all),Math.max(...all),5),v0=tk[0],v1=tk[tk.length-1];
  const X=y=>L+(y-y0)/Math.max(1,y1-y0)*(W-L-Rr),Y=v=>T+(v1-v)*(H-T-Bm)/((v1-v0)||1);
  let g='';tk.forEach(v=>{g+=`<line x1="${L}" x2="${W-Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="${v===0?1.6:1}"${v===0?'':' stroke-dasharray="2 3"'}/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${v<0?'▲':''}${Math.abs(v).toLocaleString('ja-JP')}</text>`});
  for(let y=Math.ceil(y0/10)*10;y<=y1;y+=10)g+=`<text x="${X(y)}" y="${H-10}" text-anchor="middle">${y}</text>`;
  const pl=(p,c,d)=>`<polyline points="${p.map(x=>X(x[0]).toFixed(1)+','+Y(x[1]).toFixed(1)).join(' ')}" fill="none" stroke="${c}" stroke-width="2.2"${d?` stroke-dasharray="${d}"`:''}/>`;
  g+=pl(pts,'var(--muted)','5 4')+pl(fp,'var(--accent)','');
  ap.forEach(x=>{g+=`<circle cx="${X(x[0])}" cy="${Y(x[1])}" r="5" fill="var(--coin, var(--warn))" stroke="var(--surface)" stroke-width="1.5"/>`});
  g+=`<text x="${L-8}" y="${T-2}" text-anchor="end" style="font-size:10px">万円</text>`;
  return `<div class="legend" style="margin-bottom:6px"><span><span class="dot" style="background:var(--muted)"></span>予算（点線）</span><span><span class="dot a"></span>今の見込み</span><span><span class="dot" style="background:var(--coin, var(--warn))"></span>実績</span></div><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="金融資産の予算・実績・見込み">${g}</svg>`;
}
function yjTab(cur){
  const B=LP.budget, AC=LP.actuals||(LP.actuals={});
  const head=`<section class="chartcard"><h3 style="font-size:16px;margin-bottom:4px">予算と実績（家計の予実管理）</h3>
   <p class="unit" style="margin:0 0 10px">①今の計画を「予算」として保存 → ②毎年の終わりに実績を入れる → ③ズレの原因を確かめる → ④実績から計画を引き直す。会社の予実管理と同じ流れです。データはこの端末の中だけに保存されます。</p>
   <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn${B?'':' primary'} small" data-act="savebudget">パターン${cur.key}を予算として保存${B?'し直す':''}</button>${B?`<span class="unit">保存した予算：${esc(B.name)}（${esc(B.at)}）</span>`:'<span class="unit">まだ予算がありません</span>'}</div></section>`;
  if(!B) return head;
  const sel=B.rows.filter(x=>x.y<=Y0+1);
  const yy=U.yjy&&sel.find(x=>x.y===U.yjy)?U.yjy:(sel.find(x=>x.y===Y0)?Y0:sel[0].y);U.yjy=yy;
  const a=AC[yy]||{}, br=B.rows.find(x=>x.y===yy);
  const fld=(k,l,h)=>`<label class="fld"><span class="lab">${l}</span><span class="inp"><input id="yj_${k}" data-yj="${k}" type="number" inputmode="decimal" value="${esc(a[k]??'')}"><span class="u">万円</span></span>${h?`<span class="hint">${h}</span>`:''}</label>`;
  const finA=yjFin(a,br);
  const input=`<section class="chartcard"><h3 style="font-size:15px;margin-bottom:8px">② 実績を入れる</h3><div class="fields">
   <label class="fld"><span class="lab">年</span><select id="yj_y" data-yjy="1">${sel.map(x=>`<option value="${x.y}"${x.y===yy?' selected':''}>${x.y}年（${x.a}歳）</option>`).join('')}</select></label>
   ${fld('inc','1年間の手取り収入')}${fld('exp','1年間の支出','積立・ローンの元本も含めた、出ていったお金の合計')}</div>
   ${LP.mode!=='detail'?`<div class="fields" style="margin-top:10px">${fld('fin','年末の金融資産の合計','預貯金・NISA・iDeCoなどを全部足した額')}</div><p class="unit" style="margin:6px 0 0">口座ごとに入れたいときは「くわしく入力」に切り替えてください。</p>`:`<h4 style="font-size:13.5px;margin:12px 0 6px">年末の残高 <span class="unit">（分かる口座だけで大丈夫です。入れていない口座は予算の値で計算します）</span></h4>
   <div class="fields">${YJA.map(([k,l])=>fld(k,l)).join('')}</div>`}
   <div class="unit" style="margin-top:8px">年末の金融資産の合計：<b class="num" style="font-size:16px;color:var(--ink)">${finA==null?'—':fmt(finA)+' 万円'}</b>（予算 ${fmt(br.fin)} 万円）</div></section>`;
  // ③ 差異分析
  let ana='';
  if(finA!=null){
    const dInc=a.inc!==''&&a.inc!=null?n(a.inc)-br.inc:0, dExp=a.exp!==''&&a.exp!=null?-(n(a.exp)-br.exp):0, dAll=finA-br.fin, dOth=dAll-dInc-dExp;
    const it=[['収入の差',dInc],['支出の差（使いすぎはマイナス）',dExp],['運用・その他の差',dOth]];
    const mx=Math.max(1,...it.map(x=>Math.abs(x[1])));
    ana=`<section class="chartcard"><h3 style="font-size:15px;margin-bottom:8px">③ ズレの原因（${yy}年）</h3>
     <div class="wf"><div class="wfr tot"><span>予算の金融資産</span><b>${fmt(br.fin)}</b></div>
     ${it.map(([l,v])=>`<div class="wfr"><span>${l}</span><span class="wfb"><i style="${v<0?'right:50%':'left:50%'};width:${(Math.abs(v)/mx*50).toFixed(1)}%;background:${v<0?'var(--bad)':'var(--good)'}"></i></span><b class="${v<-0.5?'neg':''}">${v>=0?'+':''}${fmt(v)}</b></div>`).join('')}
     <div class="wfr tot"><span>実績の金融資産</span><b>${fmt(finA)}</b></div></div>
     <p class="unit" style="margin:8px 0 0">${Math.abs(dAll)<1?'予算どおりでした。':`予算より${fmt(Math.abs(dAll))}万円${dAll>0?'多い':'少ない'}結果です。いちばん大きな原因は「${it.slice().sort((x,y)=>Math.abs(y[1])-Math.abs(x[1]))[0][0].replace(/（.*/,'')}」です。`}${a.inc===''||a.inc==null||a.exp===''||a.exp==null?'収入と支出も入れると、原因をもっと細かく分けられます。':''}</p></section>`;
  }
  // ④ 引き直し
  const S=cur.S, st=n(S.startY)||Y0;
  const re=`<section class="chartcard"><h3 style="font-size:15px;margin-bottom:8px">④ 実績から計画を引き直す</h3>
   <p class="unit" style="margin:0 0 10px">${yy}年末の実績の残高を出発点にして、${yy+1}年から95歳までの見込みを計算し直します。年齢も${yy+1}年に合わせて進めます（パターン${cur.key}が書き換わります）。予算はそのまま残るので、予算と見込みの差がわかります。</p>
   <button class="btn primary small" data-act="reflect"${finA==null?' disabled':''}>${yy}年の実績で引き直す</button>${finA==null?'<span class="unit">　年末の残高を入れると押せます</span>':''}
   ${st>Y0?`<p class="unit" style="margin:8px 0 0">今の計画は${st}年からの見込みです。</p>`:''}</section>`;
  const fr=sim(clone(S));
  const chart=`<section class="chartcard"><h3 style="font-size:15px;margin-bottom:8px">予算・実績・見込み</h3>${yjChart(B,fr,AC)}
   <div class="kpis" style="margin-top:10px"><div class="kpi"><span>95歳時点（予算）</span><b>${fmt(B.rows[B.rows.length-1].fin)}<small>万円</small></b></div><div class="kpi"><span>95歳時点（今の見込み）</span><b class="${fr[fr.length-1].bal<0?'neg':''}">${fmt(fr[fr.length-1].bal)}<small>万円</small></b></div><div class="kpi ${fr[fr.length-1].bal-B.rows[B.rows.length-1].fin<0?'warn':''}"><span>予算との差</span><b>${fr[fr.length-1].bal-B.rows[B.rows.length-1].fin>=0?'+':''}${fmt(fr[fr.length-1].bal-B.rows[B.rows.length-1].fin)}<small>万円</small></b></div></div></section>`;
  const done=B.rows.filter(x=>yjFin(AC[x.y],x)!=null||(AC[x.y]&&AC[x.y].inc!=null&&AC[x.y].inc!==''));
  const d=(p,v)=>v==null||v===''?'<td>—</td><td>—</td>':`<td>${fmt(n(v))}</td><td class="${n(v)-p<-0.5?'neg':''}">${n(v)-p>=0?'+':''}${fmt(n(v)-p)}</td>`;
  const table=done.length?`<section class="chartcard"><h3 style="font-size:15px;margin-bottom:8px">年ごとの予算と実績</h3><div class="cfwrap"><table class="cf"><tbody><tr class="hd"><th>年</th><td>収入 予算</td><td>実績</td><td>差</td><td>支出 予算</td><td>実績</td><td>差</td><td>金融資産 予算</td><td>実績</td><td>差</td></tr>
   ${done.map(x=>{const v=AC[x.y];return `<tr><th>${x.y}年（${x.a}歳）</th><td>${fmt(x.inc)}</td>${d(x.inc,v.inc)}<td>${fmt(x.exp)}</td>${d(x.exp,v.exp)}<td>${fmt(x.fin)}</td>${d(x.fin,yjFin(v,x))}</tr>`}).join('')}</tbody></table></div></section>`:'';
  const H=LP.history||[];
  const hist=H.length?`<section class="chartcard"><h3 style="font-size:15px;margin-bottom:8px">計画の改訂履歴</h3><div class="cfwrap"><table class="cf"><tbody><tr class="hd"><th>引き直した日</th><td>使った実績</td><td>95歳時点 引き直す前</td><td>引き直した後</td><td>変化</td></tr>
   ${H.slice().reverse().map(h=>`<tr><th>${esc(h.at)}</th><td>${h.y}年末</td><td>${fmt(h.before)}</td><td>${fmt(h.after)}</td><td class="${h.after-h.before<-0.5?'neg':''}">${h.after-h.before>=0?'+':''}${fmt(h.after-h.before)}</td></tr>`).join('')}</tbody></table></div></section>`:'';
  return head+input+ana+re+chart+table+hist;
}
function saveBudget(cur){
  const r=sim(clone(cur.S));const d=new Date();
  LP.budget={name:'パターン'+cur.key+'：'+(LP.names[cur.key]||''),at:`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`,rows:r.map(x=>({y:x.y,a:x.a,inc:x.iTot,exp:x.eTot,fin:x.bal,nw:x.bs.nw,cash:x.cash,nisa:x.nisa,taxa:x.taxa,ideco:x.ideco,kyo:x.kyo}))};
  saveLP();toast('予算として保存しました');
}
function reflect(key,y){
  const S=LP.plans[key], v=(LP.actuals||{})[y]; if(!S||!v) return;
  normPlan(S);
  const before=sim(clone(S)); const b95=before[before.length-1].bal;
  const brow=LP.budget&&LP.budget.rows.find(x=>x.y===y);const tot=yjFin(v,brow); if(tot==null) return;
  const given=YJA.filter(([k])=>v[k]!==''&&v[k]!=null);
  if(given.length){
    // 入っていない口座は、見込みの残高を使う
    const row=before.find(x=>x.y===y);
    const est={cash:row?Math.max(0,row.cash):n(S.assets.cash.bal),nisa:row?row.nisa:n(S.assets.nisa.bal)+(S.spouse==='yes'?n(S.assets.snisa.bal):0),tax:row?row.taxa:n(S.assets.tax.bal),ideco:row?row.ideco:n(S.assets.ideco.bal),kyosai:row?row.kyo:n(S.assets.kyosai.bal)};
    if(row)S.assets.others.forEach((o,i)=>{const nb=Math.round(row.othL[i]||0),ob=n(o.bal);o.basis=Math.round((o.basis===''||o.basis==null?ob:n(o.basis))*(ob>0?nb/ob:1));o.bal=nb});
    YJA.forEach(([k])=>{const nv=v[k]!==''&&v[k]!=null?n(v[k]):est[k];if(k==='tax'){const o=n(S.assets.tax.bal);S.assets.tax.basis=o>0?Math.round(n(S.assets.tax.basis)/o*nv):nv}splitSp(S,k,nv,row)});
  }else{
    const row=before.find(x=>x.y===y)||before[0];const sum=Math.max(1,Math.max(0,row.cash)+row.nisa+row.taxa+row.ideco+row.kyo+row.oth);
    S.assets.others.forEach((o,i)=>{const nb=Math.round(tot*(row.othL[i]||0)/sum),ob=n(o.bal);o.basis=Math.round((o.basis===''||o.basis==null?ob:n(o.basis))*(ob>0?nb/ob:1));o.bal=nb});
    [['cash',Math.max(0,row.cash)],['nisa',row.nisa],['tax',row.taxa],['ideco',row.ideco],['kyosai',row.kyo]].forEach(([k,x])=>{splitSp(S,k,tot*x/sum,row)});
  }
  const ns=y+1, d=ns-(n(S.startY)||Y0);
  S.age=n(S.age)+d; if(S.spouse==='yes') S.sage=n(S.sage)+d; S.startY=ns;
  const after=sim(clone(S)); const a95=after[after.length-1].bal;
  const dt=new Date();
  (LP.history=LP.history||[]).push({at:`${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}`,y,before:b95,after:a95,key});
  LP.example=false; saveLP();
  toast(`${y}年の実績で引き直しました（95歳時点 ${fmt(b95)} → ${fmt(a95)}万円）`);
}


/* ---------- 月ごとに見る：決断の前後2年（24か月）の預貯金の動き ----------
   年の計算結果を12か月に分けて、毎月の収入・支出は均等に、一時的なお金（住宅の頭金・諸費用、車、予定、退職金など）は選んだ月に置く。
   運用益と、足りないときの投資の取り崩しは含めない（その分、年の表とは少しずれる） */
function monthRows(S,r,startIdx,lumpMon){
  const out=[];let cash=startIdx>0?r[startIdx-1].cash:n(S.assets.cash.bal);
  for(let k=startIdx;k<Math.min(r.length,startIdx+2);k++){
    const x=r[k];
    const inReg=(x.iSelf+x.iSp+x.iPen+x.iAl+x.iProp)/12, outReg=(x.eLive+x.eHouse+x.eEdu+x.eIns+x.eProp+x.eSave)/12;
    const inLump=x.iOne+x.iAsset+x.iSale, outLump=x.eCar+x.eOne;
    for(let m=1;m<=12;m++){
      const li=m===lumpMon?inLump:0, lo=m===lumpMon?outLump:0;
      cash+=inReg+li-outReg-lo;
      out.push({y:x.y,m,a:x.a,inc:inReg+li,exp:outReg+lo,lump:m===lumpMon&&(li||lo)?(x.ev||[]).join('・'):'',cash});
    }
  }
  return out;
}
function monthTab(cur){
  const S=cur.S,r=cur.r;
  const auto=()=>{const i=r.findIndex((x,i)=>i<20&&(x.eOne>0.5||x.iOne>0.5||x.iAsset>0.5||x.eCar>0.5));return i<0?0:Math.max(0,i-1)};
  if(U.mstart==null||U.mstart>=r.length-1) U.mstart=auto();
  const lm=U.mmon||4, rows=monthRows(S,r,U.mstart,lm);
  let min=rows[0];rows.forEach(x=>{if(x.cash<min.cash)min=x});
  const opts=r.slice(0,Math.min(r.length-1,40)).map((x,i)=>`<option value="${i}"${i===U.mstart?' selected':''}>${x.y}年（${x.a}歳）から</option>`).join('');
  const mopts=Array.from({length:12},(_,i)=>`<option value="${i+1}"${i+1===lm?' selected':''}>${i+1}月</option>`).join('');
  const f1=v=>(Math.round(v*10)/10).toLocaleString('ja-JP');
  return `<section class="chartcard"><h3 style="font-size:16px;margin-bottom:4px">月ごとに見る（パターン${cur.key}）</h3>
   <p class="unit" style="margin:0 0 10px">家を買う年、子どもが生まれる年、仕事を辞める年など、大きな決断の前後2年を、月ごとの預貯金の動きで確かめます。1年の合計では大丈夫でも、途中の月に預貯金が足りなくならないかを見られます。</p>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
    <label class="fld" style="min-width:180px"><span class="lab">見る期間</span><select id="mstart">${opts}</select></label>
    <label class="fld" style="min-width:180px"><span class="lab">大きなお金が動く月</span><select id="mmon">${mopts}</select></label></div>
   <div class="kpis"><div class="kpi ${min.cash<0?'bad':''}"><span>預貯金がいちばん少ない月</span><b>${f1(min.cash)}<small>万円</small></b><em>${min.y}年${min.m}月（${min.a}歳）</em></div></div>
   ${min.cash<0?`<p class="unit" style="color:var(--bad)">この月に、預貯金が${f1(-min.cash)}万円足りなくなる計算です。年の表では投資の取り崩しで埋めていますが、すぐに現金にできるお金を、前もって確かめておきましょう。</p>`:''}
   <div class="cfwrap"><table class="cf"><thead><tr><th>年月</th><th>入るお金</th><th>出るお金</th><th>月末の預貯金</th></tr></thead><tbody>
   ${rows.map(x=>`<tr${x.lump?' class="tot"':''}><th>${x.y}年${x.m}月<small style="display:block;font-weight:400">${x.a}歳${x.lump?'・'+esc(x.lump):''}</small></th><td>${f1(x.inc)}</td><td>${f1(x.exp)}</td><td class="${x.cash<0?'neg':''}">${f1(x.cash)}</td></tr>`).join('')}
   </tbody></table></div>
   <p class="unit" style="margin-top:8px">毎月の収入・支出は、1年分を12で割った額です。住宅の頭金・諸費用、車の買い替え、退職金、予定に入れた出費などは、選んだ月にまとめて計算しています。運用益と投資の取り崩しは含みません（単位：万円）。</p></section>`;
}

/* 概要に出す「次の一手」：これから家を買うパターンで手元のお金が足りなくなるとき、物件価格をいくら下げれば95歳まで足りるか（10万円単位で切り上げ） */
function lpPriceFix(S){
  if(!(S.house==='buy'&&n(S.buyAge)>=Math.round(n(S.age))))return null;
  const neg0=summarize(sim(S),S).neg;if(!neg0)return null;
  const P=n(S.price),ok=x=>{const T=clone(S);T.price=Math.max(0,P-x);T.down=Math.min(n(T.down),T.price);return !summarize(sim(T),T).neg};
  if(!ok(P))return{none:true,age:neg0.a};
  let lo=0,hi=P;for(let i=0;i<20;i++){const m=(lo+hi)/2;if(ok(m))hi=m;else lo=m}
  const x=Math.min(P,Math.ceil(hi/10)*10);return{x,price:P-x,age:neg0.a};
}
/* 生活費（月額）をいくら見直せば95歳まで足りるか（0.1万円単位で切り上げ）。足りないときだけ */
function lpLiveFix(S){const neg0=summarize(sim(S),S).neg;if(!neg0)return null;const L=n(S.live),ok=x=>{const T=clone(S);T.live=Math.max(0,L-x);return !summarize(sim(T),T).neg};
  if(!ok(L*0.5))return{none:true,age:neg0.a};let lo=0,hi=L*0.5;for(let i=0;i<20;i++){const m=(lo+hi)/2;if(ok(m))hi=m;else lo=m}return{x:Math.ceil(hi*10)/10,age:neg0.a}}
function lpFixHTML(S){const f=lpPriceFix(S),g=lpLiveFix(S);if(!f&&!g)return '';
  const age=(f||g).age,live=g&&!g.none?`<li>生活費を<b>月${g.x.toLocaleString('ja-JP')}万円</b>見直す <button class="btn small" data-act="lever" data-k="live" data-x="${g.x}">このパターンを作る</button></li>`:'';
  if(!f||f.none)return `<section class="fixbox"><p class="ft">${age}歳で手元のお金が足りなくなります</p>${live?`<p>たとえば、次のように変えると95歳まで足りなくなりません（ほかの条件はそのまま）。</p><ul class="fixl">${live}</ul>`:'<p>生活費を半分にしても足りない計算です。</p>'}<p>働く年数・積立・保険・車など、ほかの手は「目標から逆算」でまとめて確かめられます。</p><button class="btn small" data-act="rtab" data-t="goal">目標から逆算を見る</button></section>`;
  return `<section class="fixbox"><p class="ft">${age}歳で手元のお金が足りなくなります</p><p>たとえば、次のどれかで95歳まで足りなくなりません（ほかの条件はそのまま）。</p><ul class="fixl"><li>物件価格を<b>約${fmt(f.x)}万円下げて${fmt(f.price)}万円</b>にする <button class="btn small primary" data-act="lever" data-k="price" data-x="${f.x}">このパターンを作る</button></li>${live}</ul><p class="unit" style="margin:0">ほかの手（働く年数・積立・運用など）は「目標から逆算」で確かめられます。</p></section>`}
function lpFixHTML_old(S){const f=lpPriceFix(S);if(!f)return '';
  if(f.none)return `<section class="fixbox"><p class="ft">${f.age}歳で手元のお金が足りなくなります</p><p>家の価格を下げるだけでは95歳まで足りない計算です。「目標から逆算」タブで、生活費や働く年数など、ほかの手も一緒に確かめてみてください。</p><button class="btn small" data-act="rtab" data-t="goal">目標から逆算を見る</button></section>`;
  return `<section class="fixbox"><p class="ft">${f.age}歳で手元のお金が足りなくなります</p><p>物件価格を<b>約${fmt(f.x)}万円下げて${fmt(f.price)}万円</b>にすると、95歳まで足りなくなりません（ほかの条件はそのまま）。</p><button class="btn small primary" data-act="lever" data-k="price" data-x="${f.x}">${fmt(f.price)}万円の家で比べるパターンを作る</button></section>`}
