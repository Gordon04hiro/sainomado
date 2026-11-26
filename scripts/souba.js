/* 売却相場の目安：国土交通省「不動産情報ライブラリ」の取引価格・成約価格から、都道府県ごとの集計ファイルを作る
   使い方（GitHub Actions から）：REINFOLIB_KEY=… node scripts/souba.js [都道府県コード…]
   出力：content/souba/<都道府県コード>.json（市区町村 × 種類ごとの、1㎡あたり価格の幅と、築年数による補正）
   ※ この作業用の環境からは国交省のサイトにつながらないため、取得は GitHub Actions で行う */
const fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'..','content','souba');
const API='https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001';
const PREF=['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const TYPES={'中古マンション等':'m','宅地(土地と建物)':'h','宅地(土地)':'l'};
const BANDS=[0,5,10,15,20,25,30,35,40,50]; // 築年数の区切り（50年以上は最後の区分）
const YEARS=5; // 相場の幅に使う期間（直近何年分）
const TREND_FROM=2010; // 年ごとの推移はこの年から（取引価格情報だけで見る。成約価格情報は2021年からなので混ぜると途中で段差ができる）
const EXCLUDE=/関係者|親族|特殊な事情|調停|競売|隣地/;

const num=s=>{const x=String(s==null?'':s).replace(/[,，\s]/g,'');return /^\d+(\.\d+)?$/.test(x)?+x:NaN};
const ERA={'明治':1867,'大正':1911,'昭和':1925,'平成':1988,'令和':2018};
function builtYear(s){s=String(s||'');let m=/^(\d{4})年?$/.exec(s);if(m)return +m[1];m=/^(明治|大正|昭和|平成|令和)(元|\d+)年$/.exec(s);if(m)return ERA[m[1]]+(m[2]==='元'?1:+m[2]);return NaN}
function period(s){const m=/(\d{4})年第(\d)四半期/.exec(String(s||''));return m?{y:+m[1],q:+m[2],t:+m[1]+(+m[2]-1)/4}:null}
const band=age=>{let b=0;BANDS.forEach((x,i)=>{if(age>=x)b=i});return b};
function quant(a,p){if(!a.length)return NaN;const s=a.slice().sort((x,y)=>x-y),i=(s.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return s[lo]+(s[hi]-s[lo])*(i-lo)}
const r100=v=>Math.round(v/100)*100, r3=v=>Math.round(v*1000)/1000;

/* APIの1行を、集計に使う形にする。使えない行は null */
function clean(d){
  const k=TYPES[d.Type];if(!k)return null;
  if(EXCLUDE.test(d.Remarks||''))return null;
  const price=num(d.TradePrice),area=num(d.Area),p=period(d.Period);
  if(!(price>=1e5)||!(area>=10)||!p)return null;
  let age=null;
  if(k!=='l'){const by=builtYear(d.BuildingYear);if(!isFinite(by))return null;age=Math.max(0,p.y-by);if(age>80)return null}
  return{k,city:String(d.MunicipalityCode||''),cname:d.Municipality||'',town:String(d.DistrictName||'').trim(),seiyaku:/成約/.test(d.PriceCategory||''),price,area,unit:price/area,age,t:p.t,lab:`${p.y}年第${p.q}四半期`};
}

/* 都道府県1つ分の行（clean 済み）から、集計ファイルを作る */
function aggregate(code,rows){
  if(!rows.length)return null;
  let tMax=-Infinity;for(const r of rows)if(r.t>tMax)tMax=r.t;const tMin=tMax-YEARS+0.25;
  const all=rows;rows=rows.filter(r=>r.t>=tMin);
  const labs=rows.map(r=>[r.t,r.lab]).sort((a,b)=>a[0]-b[0]);
  const out={pref:code,name:PREF[+code-1]||'',from:labs[0][1],to:labs[labs.length-1][1],bands:BANDS,curve:{},idx:{},P:{},C:{},D:{},TR:{P:{},C:{},last:labs[labs.length-1][1]}};
  for(const k of ['m','h','l']){
    const R=rows.filter(r=>r.k===k);if(R.length<20)continue;
    // 1) 時点の補正：年ごとの1㎡単価の中央値を、いちばん新しい年にそろえる
    const yrs={};R.forEach(r=>{const y=Math.floor(r.t);(yrs[y]=yrs[y]||[]).push(r.unit)});
    const yl=Math.max(...Object.keys(yrs).map(Number)),base=quant(yrs[yl],.5),idx={};
    Object.keys(yrs).forEach(y=>{idx[y]=yrs[y].length>=30?base/quant(yrs[y],.5):1});
    out.idx[k]=Object.fromEntries(Object.entries(idx).map(([y,v])=>[y,r3(v)]));
    R.forEach(r=>r.adj=r.unit*idx[Math.floor(r.t)]);
    // 2) 築年数の補正（マンション・戸建て）：築年数の区分ごとの中央値 ÷ 全体の中央値
    let curve=null;
    if(k!=='l'){
      const all=quant(R.map(r=>r.adj),.5);
      curve=BANDS.map((_,b)=>{const a=R.filter(r=>band(r.age)===b).map(r=>r.adj);return a.length>=15?quant(a,.5)/all:NaN});
      for(let b=0;b<curve.length;b++)if(!isFinite(curve[b])){const near=curve.map((v,i)=>[Math.abs(i-b),v]).filter(x=>isFinite(x[1])).sort((x,y)=>x[0]-y[0])[0];curve[b]=near?near[1]:1}
      // 新しいほど高い、の順を守る（データの少ない区分で逆転しないように）
      for(let b=1;b<curve.length;b++)curve[b]=Math.min(curve[b],curve[b-1]);
      out.curve[k]=curve.map(r3);
    }
    // 3) 築年数の補正を外した「基準の1㎡単価」の幅（25%・50%・75%）
    R.forEach(r=>r.x=curve?r.adj/curve[band(r.age)]:r.adj);
    const st=a=>({n:a.length,q:[.25,.5,.75].map(p=>r100(quant(a,p)))});
    out.P[k]=st(R.map(r=>r.x));
    const by={};R.forEach(r=>{if(!r.city)return;(by[r.city]=by[r.city]||{name:r.cname,a:[]}).a.push(r.x)});
    Object.entries(by).forEach(([c,v])=>{if(v.a.length<5)return;out.C[c]=out.C[c]||{name:v.name};out.C[c][k]=st(v.a)});
    // 年ごとの推移：取引価格情報だけで、築年数の補正をかけた1㎡単価の中央値（都道府県は20件以上、市区町村は10件以上の年だけ）
    {const T=all.filter(r=>r.k===k&&!r.seiyaku),xo=r=>curve?r.unit/curve[band(r.age)]:r.unit,yr=(arr,min)=>{const g={};arr.forEach(r=>{const y=Math.floor(r.t);(g[y]=g[y]||[]).push(xo(r))});
       return Object.keys(g).map(Number).sort((a,b)=>a-b).filter(y=>g[y].length>=min).map(y=>[y,r100(quant(g[y],.5)),g[y].length])};
     const pp=yr(T,20);if(pp.length>=3)out.TR.P[k]=pp;
     const bc={};T.forEach(r=>{if(r.city)(bc[r.city]=bc[r.city]||[]).push(r)});
     Object.entries(bc).forEach(([c,a])=>{const v=yr(a,10);if(v.length>=3)(out.TR.C[c]=out.TR.C[c]||{})[k]=v});}
    // 町名（地区名）ごと：5件以上ある町名だけ。市区町村ごとの別ファイルにする（D は書き出しのときに分ける）
    const bt={};R.forEach(r=>{if(!r.city||!r.town)return;const c=(bt[r.city]=bt[r.city]||{});(c[r.town]=c[r.town]||[]).push(r.x)});
    Object.entries(bt).forEach(([c,T])=>Object.entries(T).forEach(([t,a])=>{if(a.length<5)return;const D=(out.D[c]=out.D[c]||{});(D[t]=D[t]||{})[k]=st(a)}));
  }
  return Object.keys(out.P).length?out:null;
}

async function get(params,key,tries=4){
  const u=API+'?'+new URLSearchParams(params);
  for(let i=0;i<tries;i++){
    const r=await fetch(u,{headers:{'Ocp-Apim-Subscription-Key':key,'Accept-Encoding':'gzip'}});
    if(r.status===404)return[];
    if(r.ok){const j=await r.json();return Array.isArray(j.data)?j.data:[]}
    if(r.status===401||r.status===403)throw new Error('APIキーが使えません（'+r.status+'）。GitHub の Secrets の REINFOLIB_KEY を確認してください');
    await new Promise(s=>setTimeout(s,2000*(i+1)));
  }
  throw new Error('取得に失敗しました：'+u);
}

async function main(){
  const key=process.env.REINFOLIB_KEY;if(!key){console.error('REINFOLIB_KEY がありません');process.exit(1)}
  const codes=process.argv.slice(2).length?process.argv.slice(2):PREF.map((_,i)=>String(i+1).padStart(2,'0'));
  fs.mkdirSync(OUT,{recursive:true});
  const Y=new Date().getFullYear();let shown=false;
  for(const code of codes){
    let rows=[];
    for(let y=TREND_FROM;y<=Y;y++)for(let q=1;q<=4;q++){
      const d=await get({year:y,quarter:q,area:code,language:'ja'},key);
      if(!shown&&d.length){console.log('項目の例：',JSON.stringify(d[0]));shown=true}
      rows=rows.concat(d.map(clean).filter(Boolean));
      await new Promise(s=>setTimeout(s,250));
    }
    const a=aggregate(code,rows);
    if(a){const D=a.D;delete a.D;Object.keys(a.C).forEach(c=>{a.C[c].towns=D[c]?Object.keys(D[c]).length:0});
      fs.writeFileSync(path.join(OUT,code+'.json'),JSON.stringify(a));
      const dir=path.join(OUT,code);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
      Object.entries(D).forEach(([c,T])=>fs.writeFileSync(path.join(dir,c+'.json'),JSON.stringify(T)));
      const st=rows.reduce((o,r)=>{o[r.seiyaku?'s':'t'][r.town?1:0]++;return o},{s:[0,0],t:[0,0]});
      console.log('  町名あり：取引価格',st.t[1]+'/'+(st.t[0]+st.t[1]),'成約価格',st.s[1]+'/'+(st.s[0]+st.s[1]),'町名のある市区町村',Object.keys(D).length);console.log(code,PREF[+code-1],a.from+'〜'+a.to,'市区町村',Object.keys(a.C).length,'件数',['m','h','l'].map(k=>k+':'+(a.P[k]?a.P[k].n:0)).join(' '))}
    else console.log(code,PREF[+code-1],'データなし');
  }
}
module.exports={clean,aggregate,builtYear,period,band,BANDS};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exit(1)});
