/* 地価公示・都道府県地価調査（国土数値情報 L01・L02）から、市区町村ごとの地点データを作る
   使い方：node scripts/chika.js <L01のgeojson> <L02のgeojson>
   出力：content/chika/<都道府県コード>/<市区町村コード>.json
     [{t:'公'|'調', no:'浜松中央-3', addr:'浜松市中央区上島５丁目…', jk:'上島５－…', use:'住宅', st:'上島', dist:850, area:165, y:2026, p:円/㎡, chg:前年比%, h:[[年,円/㎡],…]}]
   ※ 出典表示：「国土数値情報（地価公示データ・都道府県地価調査データ）（国土交通省）を加工して作成」 */
const fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'..','content','chika');
const FROM=2005; // 価格の履歴はこの年から（1983年からあるが、画面で見やすい範囲に）

function load(file){return JSON.parse(fs.readFileSync(file,'utf8')).features}
/* 履歴の列：L01 は L01_062〜、L02 は L02_056〜 が 1983年から最新年まで1年ずつ（0 はその年は地点なし） */
function hist(p,pre,start,latest){const h=[];for(let y=1983;y<=latest;y++){const k=pre+String(start+(y-1983)).padStart(3,'0');const v=+p[k];if(v>0&&y>=FROM)h.push([y,v])}return h}
const clean=s=>String(s||'').replace(/^[^\s　]+[\s　]+/,'').trim(); // 「静岡県　浜松市…」→「浜松市…」
const name=(yb,mid,seq)=>yb+(String(mid)==='000'?'':String(+mid))+'-'+(+seq);

function rowsL01(F){return F.map(f=>{const p=f.properties,y=+p.L01_007;return{city:String(p.L01_001),t:'公',no:name(p.L01_024,p.L01_002,p.L01_003),addr:clean(p.L01_025),jk:p.L01_026&&p.L01_026!=='_'?p.L01_026:'',use:p.L01_028||'',st:p.L01_048&&p.L01_048!=='_'?p.L01_048:'',dist:+p.L01_050||null,area:+p.L01_027||null,y,p:+p.L01_008,chg:+p.L01_009,h:hist(p,'L01_',62,y)}})}
function rowsL02(F){return F.map(f=>{const p=f.properties,y=+p.L02_005;return{city:String(p.L02_020),t:'調',no:name(p.L02_021,p.L02_001,p.L02_002),addr:clean(p.L02_022),jk:p.L02_023&&p.L02_023!=='_'?p.L02_023:'',use:p.L02_025||'',st:p.L02_045&&p.L02_045!=='_'?p.L02_045:'',dist:+p.L02_046||null,area:+p.L02_024||null,y,p:+p.L02_006,chg:+p.L02_007,h:hist(p,'L02_',56,y)}})}

function write(rows){
  const by={};rows.forEach(r=>{if(!/^\d{5}$/.test(r.city)||!(r.p>0))return;(by[r.city]=by[r.city]||[]).push(r)});
  fs.rmSync(OUT,{recursive:true,force:true});let files=0;
  Object.entries(by).forEach(([c,a])=>{const dir=path.join(OUT,c.slice(0,2));fs.mkdirSync(dir,{recursive:true});
    a.sort((x,y)=>x.addr.localeCompare(y.addr,'ja'));fs.writeFileSync(path.join(dir,c+'.json'),JSON.stringify(a.map(({city,...r})=>r)));files++});
  return files;
}
function main(){
  const [a,b]=process.argv.slice(2);if(!a||!b){console.error('使い方：node scripts/chika.js <L01.geojson> <L02.geojson>');process.exit(1)}
  const r1=rowsL01(load(a)),r2=rowsL02(load(b));
  console.log('地価公示',r1.length,'地点（',r1[0]&&r1[0].y,'年）／地価調査',r2.length,'地点（',r2[0]&&r2[0].y,'年）');
  console.log('例',JSON.stringify(r1.find(r=>r.city==='22138')||r1[0]));
  console.log('市区町村のファイル',write(r1.concat(r2)));
}
module.exports={rowsL01,rowsL02,hist,name};
if(require.main===module)main();
