/* 家賃の水準：総務省「住宅・土地統計調査（令和5年）」表130-2「民営借家＜専用住宅＞の状況」から、市区ごとの平均家賃を取り込む
   使い方（GitHub Actions から）：ESTAT_APPID=… node scripts/yachin.js
   出力：content/yachin/<都道府県コード>.json = {name, C:{市区コード:{name, all, k:{建て方:平均}, a:{延べ面積:平均}}}}（円/月・家賃0円を含まない平均）
   ※ この作業用の環境からは e-Stat につながらないため、取得は GitHub Actions で行う。表の中身（分類の名前）はメタ情報から読み取る */
const fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'..','content','yachin');
const ID=process.env.ESTAT_STATSID||'0004021532';
const API='https://api.e-stat.go.jp/rest/3.0/app/json/';
async function get(name,params){const u=API+name+'?'+new URLSearchParams(Object.assign({appId:process.env.ESTAT_APPID,lang:'J'},params));
  for(let i=0;i<4;i++){const r=await fetch(u);if(r.ok)return r.json();await new Promise(s=>setTimeout(s,3000*(i+1)))}throw new Error('取得に失敗しました：'+name)}
const arr=x=>x==null?[]:Array.isArray(x)?x:[x];
async function main(){
  if(!process.env.ESTAT_APPID){console.error('ESTAT_APPID がありません');process.exit(1)}
  const meta=await get('getMetaInfo',{statsDataId:ID});
  const objs=arr(meta.GET_META_INFO.METADATA_INF.CLASS_INF.CLASS_OBJ);
  console.log('分類：',objs.map(o=>o['@id']+'='+o['@name']+'('+arr(o.CLASS).length+')').join(' / '));
  const find=re=>objs.find(o=>re.test(o['@name']));
  const oArea=objs.find(o=>o['@id']==='area'),oKind=find(/建て方/),oSize=find(/延べ面積/);
  const names={};objs.forEach(o=>{names[o['@id']]={};arr(o.CLASS).forEach(c=>names[o['@id']][c['@code']]={name:c['@name'],level:c['@level'],parent:c['@parentCode']}) });
  // 「家賃０円を含まない」平均を使う（その分類があれば）
  const oZero=objs.find(o=>arr(o.CLASS).some(c=>/含まない/.test(c['@name'])));
  const zeroCode=oZero?arr(oZero.CLASS).find(c=>/含まない/.test(c['@name']))['@code']:null;
  let start=1,vals=[];
  for(;;){const d=await get('getStatsData',{statsDataId:ID,startPosition:start,limit:100000,metaGetFlg:'N',cntGetFlg:'N'});
    const S=d.GET_STATS_DATA.STATISTICAL_DATA;vals=vals.concat(arr(S.DATA_INF.VALUE));
    const nx=S.RESULT_INF&&S.RESULT_INF.NEXT_KEY;if(!nx)break;start=nx;await new Promise(s=>setTimeout(s,1000))}
  console.log('件数',vals.length);
  // ほかの分類（構造など）は「総数」だけを使う
  const others=objs.filter(o=>!['area','tab'].includes(o['@id'])&&o!==oKind&&o!==oSize&&o!==oZero).map(o=>[o['@id'],(arr(o.CLASS).find(c=>/総数/.test(c['@name']))||arr(o.CLASS)[0])['@code']]);
  const kAll=oKind&&arr(oKind.CLASS).find(c=>/総数/.test(c['@name'])), sAll=oSize&&arr(oSize.CLASS).find(c=>/総数/.test(c['@name']));
  const P={};
  vals.forEach(v=>{
    if(oZero&&v['@'+oZero['@id']]!==zeroCode)return;
    if(others.some(([id,c])=>v['@'+id]!=null&&v['@'+id]!==c))return;
    const num=+v['$'];if(!(num>0))return;
    const area=v['@area'];if(!/^\d{5}$/.test(area)||area.endsWith('000'))return; // 市区だけ（全国・都道府県は除く）
    const kc=oKind?v['@'+oKind['@id']]:null, sc=oSize?v['@'+oSize['@id']]:null;
    const pref=area.slice(0,2),C=((P[pref]=P[pref]||{C:{}}).C[area]=P[pref].C[area]||{name:names.area[area]?names.area[area].name:'',k:{},a:{}});
    const isK=!kAll||kc===kAll['@code'], isS=!sAll||sc===sAll['@code'];
    if(isK&&isS)C.all=num;
    else if(isS&&!isK)C.k[names[oKind['@id']][kc].name]=num;
    else if(isK&&!isS)C.a[names[oSize['@id']][sc].name]=num;
  });
  fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
  Object.entries(P).forEach(([p,o])=>{o.C=Object.fromEntries(Object.entries(o.C).filter(([,c])=>c.all));fs.writeFileSync(path.join(OUT,p+'.json'),JSON.stringify(o));console.log(p,Object.keys(o.C).length,'市区')});
  fs.writeFileSync(path.join(OUT,'_meta.json'),JSON.stringify({id:ID,got:new Date().toISOString().slice(0,10),kinds:oKind?arr(oKind.CLASS).map(c=>c['@name']):[],sizes:oSize?arr(oSize.CLASS).map(c=>c['@name']):[]}));
}
main().catch(e=>{console.error(e.message);process.exit(1)});
