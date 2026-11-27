/* ---------- 貸す・売る 比べる診断 ----------
   住み替えや相続で空く家を「今売る」か「何年か貸してから売る」かを、手取りで比べる。
   ・貸す：家賃 −（管理委託料・空室・管理費・修繕・固定資産税・保険）− ローンの返済 − 不動産所得の税金（減価償却・利息を引いて計算）
   ・売る：売却・住み替えシミュレーターと同じ計算（仲介手数料・印紙・譲渡所得の税金・3,000万円特別控除）
   ・3,000万円特別控除は、住まなくなってから3年目の年末までに売る場合だけ使う
   ・家賃の目安は、国の住宅・土地統計調査（市区ごとの民営借家の平均家賃）を、データがあれば出す（KASUD） */
const KSLIFE={wood:[22,0.046],light:[27,0.038],steel:[34,0.030],rc:[47,0.022]}; // 法定耐用年数と定額法の償却率（貸してからの減価償却）
/* 本業の年収（額面）から、所得税＋住民税の税率の目安（追加の所得にかかる率） */
function ksRate(g){g=n(g);const ky=g<=190?65:g<=360?g*0.3+8:g<=660?g*0.2+44:g<=850?g*0.1+110:195;
  const t=Math.max(0,g-ky-g*0.15-58);const r=t<=195?0.05:t<=330?0.10:t<=695?0.20:t<=900?0.23:t<=1800?0.33:t<=4000?0.40:0.45;return r*1.021+0.10}
/* 住宅ローン：毎月の返済額と、t年後の残り */
function ksLoan(P,rate,yrs){const i=n(rate)/100/12,N=Math.max(1,Math.round(n(yrs)*12));const m=P>0?(i>0?P*i/(1-Math.pow(1+i,-N)):P/N):0;
  const bal=k=>{if(P<=0||k>=N)return 0;return i>0?P*Math.pow(1+i,k)-m*(Math.pow(1+i,k)-1)/i:P-m*k};return{m,N,bal}}
function ksSellV(V,o){return Object.assign(sellBase(),{price:n(V.price),loan:n(V.loan),buyYear:n(V.buyYear),buyPrice:n(V.buyPrice),bldPrice:n(V.bldPrice),struct:V.struct,feeMode:'std',other:n(V.other),move:0,plan:'none',example:false},o||{})}
function ksCalc(V){
  const N=Math.max(1,Math.min(30,Math.round(n(V.years)))), r=ksRate(V.income), L=ksLoan(n(V.loan),V.rate,V.loanYrs);
  const life=KSLIFE[V.struct]||KSLIFE.wood, st=STRUCT[V.struct]||STRUCT.wood;
  const bld=Math.min(n(V.bldPrice),n(V.buyPrice)), lived=Math.max(0,Y0-n(V.buyYear));
  const left0=Math.max(0,bld-Math.min(bld*0.9*st[1]*lived,bld*0.95)); // 貸し始めるときの未償却残高（住んでいた間は非業務用の償却）
  const ddl=n(V.moveOut)+3; // 3,000万円特別控除が使える最後の年（住まなくなってから3年目の年末）
  const sellAt=(t,dep)=>{const y=Y0+t,tok=y<=ddl?'3000':'none';
    // 貸した年数分は、住んでいたときの償却（非業務用）のかわりに、貸してからの償却を引く
    const V2=ksSellV(V,{buyYear:n(V.buyYear)-t,price:Math.round(n(V.price)*Math.pow(1-n(V.dec)/100,t)),loan:L.bal(t*12),tokurei:tok,
      buyPrice:n(V.buyPrice)-Math.max(0,dep-Math.min(bld*0.9*st[1]*t,bld*0.95))});
    const c=sellCalc(V2);return{c,tok,price:V2.price,loan:V2.loan}};
  const now=sellAt(0,0), grow=x=>x*Math.pow(1+n(V.yield)/100,1);
  const rows=[],A=[{a:0,bal:Math.round(now.c.net)}],B=[{a:0,bal:Math.round(now.c.net)}];
  let cum=0,dep=0,left=left0,aVal=now.c.net,T={rent:0,cost:0,loan:0,tax:0,cash:0,dep:0};
  for(let t=1;t<=N;t++){
    const rent=n(V.rent)*12*Math.pow(1-n(V.rentDec)/100,t-1), eff=rent*(12-Math.min(12,n(V.vacancy)))/12;
    const cost=eff*n(V.kanri)/100+n(V.mc)*12+n(V.repair)+n(V.ptax)+n(V.fire);
    const k0=(t-1)*12,k1=t*12, paid=k0<L.N?Math.min(12,L.N-k0)*L.m:0, prin=L.bal(k0)-L.bal(k1), intr=Math.max(0,paid-prin);
    const d=Math.min(left,bld*life[1]);left-=d;dep+=d;
    const inc=eff-cost-intr-d, tax=inc*r; // 赤字なら、本業の税金が減る（土地の借入の利息の分の制限などは省略）
    const cash=eff-cost-paid-tax; cum+=cash;
    T.rent+=eff;T.cost+=cost;T.loan+=paid;T.tax+=tax;T.cash+=cash;T.dep+=d;
    const s=sellAt(t,dep); aVal=grow(aVal);
    rows.push({t,y:Y0+t,eff,cost,paid,intr,d,inc,tax,cash,cum,sale:s.c.net,tok:s.tok,price:s.price});
    A.push({a:t,bal:Math.round(aVal)});B.push({a:t,bal:Math.round(cum+s.c.net)});
  }
  const last=rows[rows.length-1];
  return{N,r,now,rows,A,B,T,last,diff:last.cum+last.sale-aVal,aVal,ddl,m:L.m,first:rows[0]};
}
const KSBASE=()=>({sqm:70,price:2800,loan:1500,rate:0.8,loanYrs:25,buyYear:Y0-10,buyPrice:3500,bldPrice:1800,struct:'rc',moveOut:Y0,other:20,
  rent:11,kanri:5,vacancy:1,mc:2.5,repair:10,ptax:12,fire:1.5,rentDec:0.5,years:10,dec:1.5,income:600,yield:0});
const KSDEF={id:'kasu',title:'貸す・売る 比べる診断',example:'築10年のマンション・今売ると2,800万円・家賃11万円で10年貸す場合',
  lead:'住み替えや相続で空く家を、<b>今売るか、何年か貸してから売るか</b>を、税金まで引いた手取りで比べます。家賃から管理委託料・空室・修繕・固定資産税・ローンの返済・不動産所得の税金を引き、貸したあとに売る場合の手取りまで計算します。',
  base:KSBASE,
  groups:[
   {g:'家と住宅ローン',f:[
    {id:'price',l:'今売れそうな価格',u:'万円',h:'「売却相場の目安」で調べた額や、査定額が目安'},
    {id:'loan',l:'住宅ローンの残り',u:'万円',h:'なければ0'},
    {id:'rate',l:'ローンの金利',u:'%',st:.01,show:V=>n(V.loan)>0},
    {id:'loanYrs',l:'返済の残り年数',u:'年',show:V=>n(V.loan)>0},
    {id:'sqm',l:'広さ（延べ面積・専有面積）',u:'㎡',h:'家賃の目安（国の統計）を、近い広さの平均で出すのに使います'},
    {id:'moveOut',l:'住まなくなる（なった）年',u:'年',h:'自宅を売るときの3,000万円特別控除は、住まなくなってから3年目の年末までに売る場合だけ使えます'}]},
   {g:'買ったときのこと',s:'売るときの税金と、貸したときの減価償却に使います',f:[
    {id:'buyYear',l:'買った年',u:'年'},{id:'buyPrice',l:'買った価格（土地＋建物）',u:'万円'},
    {id:'bldPrice',l:'うち建物の価格',u:'万円',h:'契約書に内訳がなければ、マンションは6割・戸建ては半分ほどが目安'},
    {id:'struct',l:'建物の構造',type:'sel',o:Object.entries(STRUCT).map(([k,v])=>[k,v[0]]),h:'マンションの多くは鉄筋コンクリート'}]},
   {g:'貸すときの条件',f:[
    {id:'rent',l:'家賃（共益費込み）',u:'万円/月',h:'近くの似た物件の募集家賃が目安。下の「家賃の目安」も参考に'},
    {id:'kanri',l:'管理会社への管理委託料',u:'%',h:'家賃の3〜8%ほど。自分で管理するなら0'},
    {id:'vacancy',l:'空室（年に平均何か月）',u:'か月',st:.5,h:'入居者が入れ替わるときに、次が決まるまでの期間の平均'},
    {id:'mc',l:'管理費・修繕積立金（マンション）',u:'万円/月',h:'戸建てなら0'},
    {id:'repair',l:'修繕・入退去の費用（年平均）',u:'万円/年',h:'設備の交換・原状回復・入居者募集の広告料など'},
    {id:'ptax',l:'固定資産税・都市計画税',u:'万円/年'},
    {id:'fire',l:'火災保険など',u:'万円/年'},
    {id:'rentDec',l:'家賃の下がり方',u:'%/年',st:.1,h:'建物が古くなるにつれて、家賃は少しずつ下がるのがふつう'}]},
   {g:'比べ方',f:[
    {id:'years',l:'貸す期間',u:'年',h:'この年数だけ貸して、そのあと売る前提です'},
    {id:'dec',l:'家の価格の下がり方',u:'%/年',st:.1,h:'築年数とともに下がる分。売却相場の目安の「この10年の推移」も参考に'},
    {id:'income',l:'本業の年収（額面）',u:'万円',h:'家賃の所得にかかる税金の率の目安に使います'},
    {id:'other',l:'売るときのその他の費用',u:'万円',h:'片付け・リフォーム・測量など'},
    {id:'yield',l:'今売ったお金を運用する利回り',u:'%/年',st:.1,h:'預金のままなら0。比べやすいよう、最初は0にしています'}]}
  ],
  calc:V=>ksCalc(V),
  result(V,R){
    const f1=v=>(Math.round(v*10)/10).toLocaleString('ja-JP'),sg=v=>(v<0?'▲':'')+f1(Math.abs(v)),sgI=v=>(v<0?'▲':'')+fmt(Math.abs(v)),y1=R.first,L=R.last,good=R.diff>=0;
    const KR=typeof ksRentHTML==='function'?ksRentHTML(V):'';
    return `<h2>計算結果</h2><p class="unit">入力するたびに自動で更新されます（単位：万円）。</p>
     <div class="panels">
      <section class="panel"><div class="ph"><span class="nm">今売る</span><span class="chip ${R.now.tok==='3000'?'good':'warn'}">${R.now.tok==='3000'?'3,000万円控除あり':'特例なし'}</span></div>
       <div class="kv">${kvRow('売れそうな価格',fmt(n(V.price))+'<small>万円</small>')}${kvRow('税金',fmt(R.now.c.tax)+'<small>万円</small>')}${kvRow('ローンを返したあとの手取り',sgI(R.now.c.net)+'<small>万円</small>',R.now.c.net<0)}${kvRow(R.N+'年後（運用'+n(V.yield)+'%）',fmt(R.aVal)+'<small>万円</small>')}</div></section>
      <section class="panel"><div class="ph"><span class="nm">${R.N}年貸してから売る</span><span class="chip ${good?'good':'bad'}">${good?'今売るより多い':'今売るより少ない'}</span></div>
       <div class="kv">${kvRow('1年目の手残り（税引き後）',sg(y1.cash)+'<small>万円</small>',y1.cash<0)}${kvRow(R.N+'年間の手残りの合計',sgI(L.cum)+'<small>万円</small>',L.cum<0)}${kvRow(R.N+'年後に売ったときの手取り',sgI(L.sale)+'<small>万円</small>')}${kvRow('合計',sgI(L.cum+L.sale)+'<small>万円</small>')}</div></section></div>
     <section class="advice"><h3>入力した条件で計算すると</h3><ul>
      <li>${R.N}年貸してから売ると、今売って${n(V.yield)?'運用'+n(V.yield)+'%で':'そのまま持って'}いる場合より、<b>${fmt(Math.abs(R.diff))}万円${good?'多く':'少なく'}</b>手元に残る計算です。</li>
      <li>1年目の家賃収入（空室を引いた後）は${f1(y1.eff)}万円、管理費・修繕・税金などの費用が${f1(y1.cost)}万円、ローンの返済が${f1(y1.paid)}万円、不動産所得の税金が${y1.tax<0?'▲'+f1(-y1.tax)+'万円（赤字で本業の税金が減る分）':f1(y1.tax)+'万円'}で、手残りは<b>月${sg(y1.cash/12)}万円</b>${y1.cash<0?'（毎月の持ち出し）':''}です。${y1.cash<0&&L.sale>R.now.c.net?'毎月は持ち出しでも、ローンの残りが減る分、売るときの手取りが増えています。':''}</li>
      ${R.now.tok==='3000'&&L.tok!=='3000'?`<li><b>3,000万円特別控除は、${R.ddl}年の年末までに売らないと使えません。</b>${(t=>t>0?`${R.N}年貸してから売ると特例が使えず、今の価格で売るなら税金が${fmt(t)}万円ほどかかる計算です。`:'今の価格なら、特例がなくても売るときの税金はかからない計算です。')(sellCalc(ksSellV(V,{tokurei:'none'})).tax)}</li>`:''}
      <li>住宅ローンを借りたまま貸すのは、原則として借りた銀行の承諾が必要です（転勤などで認められることもあります）。住宅ローン控除も、住まなくなると受けられません。</li></ul></section>
     <section class="chartcard"><div class="legend"><b style="color:var(--ink);font-size:14px">貸してから売ると、今売るのと比べていくら違うか</b></div>
      ${chartSVG([{rows:R.B.map((r,i)=>({a:r.a,bal:r.bal-R.A[i].bal})),color:PCOL.B}],null,'kschart','年後',5)}
      <p class="unit" style="margin:6px 0 0">横軸は貸す年数。0より上なら貸してから売る方が多く、下なら今売る方が多く手元に残ります。「貸してから売る」は、それまでの手残りの合計に、その年に売ったときの手取りを足した額です。${R.ddl>=Y0?R.ddl+'年の年末を過ぎると3,000万円特別控除が使えなくなるため、その年で線が下がることがあります。':''}</p></section>
     ${KR}
     <details class="grp"><summary>年ごとの内訳</summary><div class="body"><div class="tscroll"><table class="cf hs ks"><tbody><tr class="hd"><th>年</th><td>家賃収入</td><td>費用</td><td>ローン返済</td><td>税金</td><td>手残り</td><td>その年に売ると</td></tr>
      ${R.rows.map(x=>`<tr><th>${x.y}年</th><td>${f1(x.eff)}</td><td>${f1(x.cost)}</td><td>${f1(x.paid)}</td><td>${x.tax<0?'▲':''}${f1(Math.abs(x.tax))}</td><td>${x.cash<0?'▲':''}${f1(Math.abs(x.cash))}</td><td>${fmt(x.sale)}${x.tok==='3000'?'＊':''}</td></tr>`).join('')}</tbody></table></div>
      <p class="unit">＊は3,000万円特別控除を使って計算。税金は、家賃から費用・ローンの利息・減価償却費（${f1(R.T.dep/R.N)}万円/年）を引いた不動産所得に、本業の年収から見た税率（約${Math.round(R.r*100)}%）をかけた目安です。</p></div></details>
     <div class="taxnote">計算は<b>目安</b>です。不動産所得の税金は、本業の所得に足した分にかかる税率の目安で計算しています（赤字の場合の損益通算の制限、事業的規模の判定、青色申告の特典などは省略）。減価償却は、住んでいた期間を非業務用の償却、貸してからを法定耐用年数の定額法で計算しています。売るときの税金は、売却・住み替えシミュレーターと同じ計算です。実際の申告は税務署や税理士に確かめてください。</div>`;
  },
  dock:(V,R)=>[R.N+'年貸してから売ると',(R.diff>=0?'+':'▲')+fmt(Math.abs(R.diff))+' 万円',R.diff<0],
  related:['souba','sell','akiya']
};
GDEF.kasu=KSDEF;
SHARE.kasu={get:()=>gtState(KSDEF),set:d=>{GT.kasu=d}};
/* 売却シミュレーターに自分の数字が入っていれば、最初の値に使う */
const KSBASE0=KSDEF.base;KSDEF.base=()=>{const b=KSBASE0();try{if(SV&&!SV.example)Object.assign(b,{price:n(SV.price),loan:n(SV.loan),buyYear:n(SV.buyYear),buyPrice:n(SV.buyPrice),bldPrice:n(SV.bldPrice),struct:SV.struct||b.struct})}catch(e){}return b};
/* 家賃の目安：国の統計（住宅・土地統計調査の市区別の平均家賃。データがあれば）と、ポータルサイトで調べる案内 */
const KSY={},KSYM={st:0,meta:null}; // 都道府県ごとのデータ、メタ情報（st 0:未確認 1:読込中 2:あり 3:なし）
function ksyMeta(){if(KSYM.st||typeof fetch!=='function')return;KSYM.st=1;fetch('assets/yachin/_meta.json').then(r=>{if(!r.ok)throw 0;return r.json()}).then(j=>{KSYM.meta=j;KSYM.st=2;gtRender(KSDEF)}).catch(()=>{KSYM.st=3})}
function ksyLoad(p){if(KSY[p]||typeof fetch!=='function')return;KSY[p]='loading';fetch('assets/yachin/'+p+'.json').then(r=>{if(!r.ok)throw 0;return r.json()}).then(j=>{KSY[p]=j;gtRender(KSDEF)}).catch(()=>{KSY[p]='none';gtRender(KSDEF)})}
function ksRentHTML(V){
  ksyMeta();
  const portal=`<p class="unit" style="margin:0 0 6px">実際に貸すときの家賃は、近くの似た広さ・築年数の物件の<b>募集家賃</b>が目安です。SUUMO・アットホーム・LIFULL HOME'Sなどのポータルサイトで、同じ駅・広さ・築年数の物件をいくつか見て入れてください。地元の不動産会社に聞くのも確実です。</p>`;
  let stat='';
  if(KSYM.st===2){
    const p=V.ypref||((typeof SB!=='undefined'&&SB&&SB.pref)||''),c=V.ycity||((typeof SB!=='undefined'&&SB&&SB.pref===p&&SB.city)||'');
    if(p&&!KSY[p])ksyLoad(p);
    const D=KSY[p]&&typeof KSY[p]==='object'?KSY[p]:null,C=D&&c&&D.C[c]?D.C[c]:null;
    const nm=k=>{const v=D.C[k],par=D.C[k.slice(0,4)+'0'];return par&&par!==v&&/市$/.test(par.name)?par.name+' '+v.name:v.name};
    const opts=D?Object.keys(D.C).sort().map(k=>`<option value="${k}"${k===c?' selected':''}>${esc(nm(k))}</option>`).join(''):'';
    const yen=v=>(Math.round(v/1000)/10).toLocaleString('ja-JP')+'万円';
    const q=n(V.sqm),sz=C?Object.entries(C.a).find(([k])=>{const t=k.replace(/ｍ2|m2|㎡/g,''),nums=(t.match(/\d+/g)||[]).map(Number);if(/以下/.test(t))return q<=nums[0]+0.99;if(/以上/.test(t))return q>=nums[0];return nums.length===2&&q>=nums[0]&&q<nums[1]+1}):null;
    const kind=sz||(C?(V.struct==='rc'||V.struct==='steel'?Object.entries(C.k).find(([k])=>/非木造/.test(k)):Object.entries(C.k).find(([k])=>/一戸建/.test(k))):null);
    stat=`<div class="ksy"><p style="margin:0 0 6px"><b>地域の家賃の水準（国の統計）</b></p>
      <div class="ksysel"><select id="ksy_pref" aria-label="都道府県"><option value="">都道府県を選ぶ</option>${SBPREF.map((n2,i)=>{const k=String(i+1).padStart(2,'0');return `<option value="${k}"${k===p?' selected':''}>${n2}</option>`}).join('')}</select>
      <select id="ksy_city" aria-label="市区"${D?'':' disabled'}><option value="">${p&&!D?(KSY[p]==='none'?'データがありません':'読み込み中…'):'市区を選ぶ'}</option>${opts}</select></div>
      ${C?`<table class="cf hs"><tbody><tr><th>民営の借家の平均家賃（${esc(nm(c))}）</th><td>月${yen(C.all)}</td></tr>${Object.entries(C.k).filter(([k])=>k!=='その他').map(([k,v])=>`<tr><th>　${esc(k)}</th><td>月${yen(v)}</td></tr>`).join('')}${Object.entries(C.a).map(([k,v])=>`<tr><th>　延べ面積 ${esc(k.replace(/ｍ2/g,'㎡'))}</th><td>月${yen(v)}</td></tr>`).join('')}</tbody></table>
       ${kind?`<p style="margin:6px 0"><button type="button" class="btn small" data-act="ksyuse" data-v="${Math.round(kind[1]/1000)/10}">${sz?'延べ面積 '+esc(kind[0].replace(/ｍ2/g,'㎡')):esc(kind[0])}の平均（月${yen(kind[1])}）を家賃に入れる</button></p>`:''}
       <p class="unit" style="margin:0">今住んでいる人が払っている家賃の平均です（共益費・管理費は含まない。区は2023年の調査時点の区分）。古くからの契約も含むため、これから募集する家賃は、これより高めになりやすいです。出典：総務省「令和5年住宅・土地統計調査」をもとにサイのまどが加工して作成。このサービスは、政府統計総合窓口(e-Stat)のAPI機能を使用していますが、サービスの内容は国によって保証されたものではありません。</p>`:''}</div>`;
  }
  return `<section class="handoff"><h3>家賃の目安を調べる</h3>${stat}${portal}<p class="unit" style="margin:0">家賃を変えた案は「名前を付けて保存」で残しておくと比べやすくなります。</p></section>`;
}
document.addEventListener('change',e=>{const t=e.target;if(t.id!=='ksy_pref'&&t.id!=='ksy_city')return;const V=gtState(KSDEF);
  if(t.id==='ksy_pref'){V.ypref=t.value;V.ycity=''}else V.ycity=t.value;GT.kasu=V;gtSave(KSDEF);gtRender(KSDEF)});
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="ksyuse"]');if(!b)return;const V=gtState(KSDEF);V.rent=+b.dataset.v;V.example=false;GT.kasu=V;gtSave(KSDEF);
  const i=document.getElementById('g_kasu_rent');if(i)i.value=V.rent;gtRender(KSDEF)});
