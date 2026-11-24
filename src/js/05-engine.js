/* サイのまど ライフプラン計算エンジン（ブラウザ内で計算・送信なし） */
const Y0=new Date().getFullYear();
function basePlan(){return{
  age:35,spouse:'yes',sage:33,
  kids:[{by:Y0-5,kg:'pri',sch:'pub',uni:'pri_b',away:false},{by:Y0-2,kg:'pri',sch:'pub',uni:'pub',away:false}],
  inc:450,raise:1.0,ret:60,sev:1500,reinc:250,workEnd:65,
  sinc:120,sraise:0.5,sret:60,ssev:0,sreinc:0,sworkEnd:60,
  pen:16,penAge:65,spen:8,spenAge:65,penRev:0.5,
  house:'buy',rent:7,loanPay:9,loanEnd:70,orate:1.0,hval:2500,hdep:-1.5,buyAge:37,price:3000,down:300,rate:CFG.loanRates.hendo,term:35,hcost:12,
  live:20,retRatio:80,ins:2,insEnd:60,
  car:250,carEvery:8,carNext:3,carLast:75,
  infl:1.5,
  assets:{cash:{bal:500,rate:0.1},nisa:{bal:150,mon:2,until:60,rate:4},tax:{bal:0,basis:0,rate:3},
    ideco:{bal:50,mon:2,until:60,recv:65,mode:'lump',yrs:10,rate:3},kyosai:{bal:0,mon:0,until:65,recv:65,rate:1},save:{amt:0,recv:65}},
  props:[],
  events:[{name:'家族旅行（記念）',age:45,amt:60,kind:'out'},{name:'自宅の修繕',age:55,amt:200,kind:'out'}]
}}
const clone=o=>JSON.parse(JSON.stringify(o));
/* 退職金・共済金（一時金）の税金の目安。数値は content/rules.yml の retire。勤続5年以下などの特例は考えない */
function retireTax(gross,yrs){
  const R=CFG.retire,y=Math.max(1,Math.ceil(n(yrs))),g=Math.max(0,n(gross));
  const ded=Math.max(R.min,y<=20?R.d1*y:R.d1*20+R.d2*(y-20));
  const base=Math.floor(Math.max(0,g-ded)/2*10)/10; // 退職所得（万円）
  const b=R.brackets.find(x=>base<=x[0])||R.brackets[R.brackets.length-1];
  const it=Math.max(0,base*b[1]/100-b[2])*(1+R.fukko/100), res=base*R.res/100, tax=it+res;
  return{ded,base,it,res,tax,net:g-tax};
}
/* 共済の加入年数を、掛金の累計と月の掛金から見積もる */
function kyoYrs(S,k){k=k||'kyosai';const A=S.assets[k],m=n(A.mon),now=k==='skyosai'?n(S.sage):n(S.age);return Math.max(1,Math.round((m>0?n(A.bal)/(m*12):0)+Math.max(0,Math.min(n(A.recv),n(A.until))-now)))}
function zeroAssets(){return{cash:{bal:0,rate:0.1},nisa:{bal:0,mon:0,until:60,rate:4},tax:{bal:0,basis:0,rate:3},ideco:{bal:0,mon:0,until:60,recv:65,mode:'lump',yrs:10,rate:3},kyosai:{bal:0,mon:0,until:65,recv:65,rate:1},save:{amt:0,recv:65},
  snisa:{bal:0,mon:0,until:60,rate:4},sideco:{bal:0,mon:0,until:60,recv:65,mode:'lump',yrs:10,rate:3},skyosai:{bal:0,mon:0,until:65,recv:65,rate:1}}}
/* 古いデータ（貯蓄の合計＋利回りだけ）を口座ごとの形に直す */
function normPlan(S){
  if(!S.assets){S.assets=zeroAssets();S.assets.cash.bal=n(S.sav);S.assets.cash.rate=S.yld!=null?n(S.yld):0.1}
  else if(S.sav!=null){S.assets.cash.bal=n(S.sav);if(S.yld!=null)S.assets.cash.rate=n(S.yld)}
  delete S.sav;delete S.yld;
  if(S.startY==null) S.startY=Y0;
  if(S.startY<Y0){const d=Y0-S.startY;S.age=n(S.age)+d;if(S.sage!=='')S.sage=n(S.sage)+d;S.startY=Y0}
  const z=zeroAssets();Object.keys(z).forEach(k=>{S.assets[k]=Object.assign(z[k],S.assets[k]||{})});
  if(!Array.isArray(S.assets.others))S.assets.others=[];
  if(!Array.isArray(S.props))S.props=[];
  if(S.hdep==null)S.hdep=-1.5; if(S.orate==null)S.orate=1.0; if(S.hval==null)S.hval=0;
  S.props.forEach(p=>{if(p.val==null)p.val=n(p.price);if(p.vdep==null)p.vdep=-1});
  return S;
}
function newProp(S){return{name:'',val:1500,vdep:-1,rent:6,vac:10,cost:15,loan:4,loanEnd:Math.round(n(S.age))+25,rate:2,sell:0,price:0}}
/* ---------- simulation ---------- */
const EDU=CFG.edu;
function eduCost(k,c){
  if(k<3||k>21) return 0;
  if(k<=5) return EDU.kg[c.kg==='pub'?'pub':'pri'];
  if(k<=11) return EDU.sho[c.sch==='pri_all'?'pri':'pub'];
  if(k<=14) return EDU.chu[(c.sch==='pri_all'||c.sch==='pri_jh')?'pri':'pub'];
  if(k<=17) return EDU.ko[c.sch!=='pub'?'pri':'pub'];
  if(!c.uni||c.uni==='none') return 0;
  let v=EDU.uni[c.uni]; if(k===18) v+=EDU.uniIn[c.uni];
  if(c.away){v+=EDU.away; if(k===18) v+=EDU.awayIn}
  return v;
}
const n=v=>{v=parseFloat(v);return isFinite(v)?v:0};
function sim(S,opt){
  normPlan(S);
  const SY=n(S.startY)||Y0;
  const sig=k=>Math.min(0.18,Math.max(0.02,n(S.assets[k].rate)/100*3.5));
  const sh=(k,t)=>opt&&opt.z?sig(k)*opt.z[t]:0;
  const rows=[], A=S.assets;
  const age=Math.round(n(S.age)), sp=S.spouse==='yes', sage=Math.round(n(S.sage));
  const infl=n(S.infl)/100, hdep=n(S.hdep)/100;
  let cash=n(A.cash.bal), nisa=n(A.nisa.bal), taxa=n(A.tax.bal), basis=Math.min(n(A.tax.basis)||n(A.tax.bal),n(A.tax.bal)), ideco=n(A.ideco.bal), kyo=n(A.kyosai.bal);
  let idecoLeft=0, idecoPay=0;
  // 配偶者の口座（年齢は配偶者の年齢で数える）。配偶者がいなければ使わない
  let nisa2=sp?n(A.snisa.bal):0, ideco2=sp?n(A.sideco.bal):0, kyo2=sp?n(A.skyosai.bal):0, ideco2Left=0;
  const OS=A.others.map(o=>{const b=Math.max(0,n(o.bal));return{o,bal:b,basis:Math.min(o.basis===''||o.basis==null?b:n(o.basis),b)}});
  const othT=()=>OS.reduce((s,x)=>s+x.bal,0);
  const kids=(S.kids||[]).slice().sort((a,b)=>n(a.by)-n(b.by));
  const P=Math.max(0,n(S.price)-n(S.down)), i=n(S.rate)/100/12, N=Math.max(1,n(S.term)*12);
  const loanM=i>0?P*i/(1-Math.pow(1+i,-N)):P/N, loanY=loanM*12;
  const end=Math.max(age,95);
  const pvL=(M,r,y)=>{const j=n(r)/100/12,m=Math.max(0,Math.round(y*12));if(M<=0||m<=0)return 0;return j>0?M*(1-Math.pow(1+j,-m))/j:M*m};
  const buyAt=Math.round(n(S.buyAge));
  // 自宅とローン（期首）
  let hv=0,hl=0;
  if(S.house==='own'){hv=n(S.hval);hl=age<n(S.loanEnd)?pvL(n(S.loanPay),S.orate,n(S.loanEnd)-age):0}
  const hlAt=a=>{ // 年末のローン残高
    if(S.house==='own') return a+1<n(S.loanEnd)?pvL(n(S.loanPay),S.orate,n(S.loanEnd)-(a+1)):0;
    if(S.house==='buy'&&a>=buyAt){const left=n(S.term)-(a-buyAt+1);return left>0?pvL(loanM,S.rate,left):0}
    return 0;
  };
  const PS=S.props.map(p=>({val:n(p.val),bal:age<n(p.loanEnd)?pvL(n(p.loan),p.rate,n(p.loanEnd)-age):0,sold:false}));
  const snap=()=>{const pvS=PS.reduce((s,x)=>s+x.val,0),plS=PS.reduce((s,x)=>s+x.bal,0);
    const oth=othT(),fin=Math.max(0,cash)+nisa+nisa2+taxa+ideco+ideco2+kyo+kyo2+oth, at=fin+hv+pvS, dt=hl+plS+Math.max(0,-cash);
    return{cashP:Math.max(0,cash),short:Math.max(0,-cash),nisa:nisa+nisa2,taxa,ideco:ideco+ideco2,kyo:kyo+kyo2,oth,fin,hv,pv:pvS,hl,pl:plS,at,dt,nw:at-dt}};
  const bs0=snap();
  for(let a=age;a<=end;a++){
    const t=a-age, y=SY+t, f=Math.pow(1+infl,t), sa=sp?sage+t:null, ev=[];
    const nw0=snap().nw;
    // income
    let iSelf=a<n(S.ret)?n(S.inc)*Math.pow(1+n(S.raise)/100,t):(a<n(S.workEnd)?n(S.reinc):0);
    const sret=(S.sret===undefined||S.sret==='')?n(S.sworkEnd):n(S.sret); // 古いデータは「辞める年齢＝定年」
    let iSp=sp&&sa<n(S.sworkEnd)?(sa<sret?n(S.sinc)*Math.pow(1+n(S.sraise)/100,t):n(S.sreinc)):0;
    const pr=Math.pow(1+n(S.penRev)/100,t);
    let iPen=(a>=n(S.penAge)?n(S.pen)*12*pr:0)+(sp&&sa>=n(S.spenAge)?n(S.spen)*12*pr:0);
    let iOne=0;
    if(a===Math.round(n(S.ret))&&n(S.sev)>0){iOne+=n(S.sev);ev.push('退職金')}
    if(sp&&sa===Math.round(sret)&&n(S.ssev)>0){iOne+=n(S.ssev);ev.push('配偶者の退職金')}
    if(a===Math.round(n(S.penAge))) ev.push('年金開始');
    let iAl=0,eEdu=0,rank=0;
    kids.forEach((c,ix)=>{
      const k=y-Math.round(n(c.by));
      if(k>=0&&k<=22) rank++;
      if(k===0) ev.push('第'+(ix+1)+'子 誕生');
      if(k===18&&c.uni&&c.uni!=='none') ev.push('第'+(ix+1)+'子 大学');
      if(k>=0&&k<=17) iAl+=rank>=3?CFG.allowance.third:(k<=2?CFG.allowance.u3:CFG.allowance.std);
      eEdu+=eduCost(k,c)*f;
    });
    let eLive=n(S.live)*12*f*(a>=n(S.workEnd)?n(S.retRatio)/100:1);
    // 住まい
    let eHouse=0,eOne=0,eRent=0,eHcost=0,eHpay=0,eBuyCost=0,eDown=0;
    if(S.house==='rent') eRent=n(S.rent)*12;
    else if(S.house==='own'){ if(a<n(S.loanEnd)) eHpay=n(S.loanPay)*12; eHcost=n(S.hcost); }
    else{
      if(a<buyAt) eRent=n(S.rent)*12;
      else{ if(a<buyAt+n(S.term)) eHpay=loanY; eHcost=n(S.hcost); }
      if(a===buyAt){eDown=n(S.down);eBuyCost=n(S.price)*0.07;hv=n(S.price);hl=P;ev.push('住宅購入')}
    }
    eHouse=eRent+eHcost+eHpay; eOne=eDown+eBuyCost;
    const hlEnd=hlAt(a), hInt=Math.max(0,eHpay-(hl-hlEnd)); hl=hlEnd;
    const hvEnd=hv*(1+hdep), hDep=hv-hvEnd; hv=hvEnd;
    let eIns=insYear(S,a,sp?sa:null);
    let eCar=0;
    const ce=Math.round(n(S.carEvery)), cn=Math.round(n(S.carNext));
    if(n(S.car)>0&&ce>0&&t>=cn&&(t-cn)%ce===0&&a<=n(S.carLast)){eCar=n(S.car);ev.push('車')}
    let eEv=0;
    (S.events||[]).forEach(e=>{ if(Math.round(n(e.age))===a&&n(e.amt)){ if(e.kind==='in') iOne+=n(e.amt); else eEv+=n(e.amt); if(e.name) ev.push(e.name);} });
    eOne+=eEv;
    // 不動産投資
    let iProp=0,eProp=0,iSale=0,pInt=0,pDep=0,pGain=0;
    S.props.forEach((p,ix)=>{
      const st=PS[ix]; if(st.sold) return;
      const sell=Math.round(n(p.sell));
      if(sell&&a===sell){const pz=n(p.price);const fee=pz>400?(pz*0.03+6)*1.1:pz*0.055;iSale+=pz-fee-st.bal;pGain+=pz-fee-st.val;st.val=0;st.bal=0;st.sold=true;ev.push((p.name||'物件'+(ix+1))+' 売却');return}
      iProp+=n(p.rent)*12*(1-n(p.vac)/100)-n(p.cost);
      const pay=a<n(p.loanEnd)?n(p.loan)*12:0; eProp+=pay;
      const bEnd=a+1<n(p.loanEnd)?pvL(n(p.loan),p.rate,n(p.loanEnd)-(a+1)):0;
      pInt+=Math.max(0,pay-(st.bal-bEnd)); st.bal=bEnd;
      const vEnd=st.val*(1+n(p.vdep)/100); pDep+=st.val-vEnd; st.val=vEnd;
    });
    // 積立・掛金
    const cN=a<n(A.nisa.until)?n(A.nisa.mon)*12:0;
    const cI=(a<n(A.ideco.until)&&a<n(A.ideco.recv))?n(A.ideco.mon)*12:0;
    const cK=(a<n(A.kyosai.until)&&a<n(A.kyosai.recv))?n(A.kyosai.mon)*12:0;
    const cO=OS.map(x=>a<n(x.o.until)?Math.max(0,n(x.o.mon))*12:0);
    const cN2=sp&&sa<n(A.snisa.until)?n(A.snisa.mon)*12:0;
    const cI2=(sp&&sa<n(A.sideco.until)&&sa<n(A.sideco.recv))?n(A.sideco.mon)*12:0;
    const cK2=(sp&&sa<n(A.skyosai.until)&&sa<n(A.skyosai.recv))?n(A.skyosai.mon)*12:0;
    const eSave=cN+cI+cK+cN2+cI2+cK2+cO.reduce((s,v)=>s+v,0);
    // iDeCo・共済・保険などの受け取り
    let iAsset=0, iSaveIns=0, rtx=0;
    if(a===Math.round(n(A.ideco.recv))&&ideco>0){
      if(A.ideco.mode==='annuity'){idecoLeft=Math.max(1,Math.round(n(A.ideco.yrs)));ev.push('iDeCo 年金受取開始')}
      else{iAsset+=ideco;ideco=0;ev.push('iDeCo 受取')}
    }
    if(idecoLeft>0&&ideco>0){idecoPay=ideco/idecoLeft;iAsset+=idecoPay;ideco-=idecoPay;idecoLeft--}
    if(a===Math.round(n(A.kyosai.recv))&&kyo>0){const ky=n(A.kyosai.yrs)>0?n(A.kyosai.yrs):kyoYrs(S);const tx=retireTax(kyo,ky).tax;rtx+=tx;iAsset+=kyo-tx;kyo=0;ev.push('共済金 受取')}
    if(sp&&sa===Math.round(n(A.sideco.recv))&&ideco2>0){
      if(A.sideco.mode==='annuity'){ideco2Left=Math.max(1,Math.round(n(A.sideco.yrs)));ev.push('配偶者のiDeCo 年金受取開始')}
      else{iAsset+=ideco2;ideco2=0;ev.push('配偶者のiDeCo 受取')}
    }
    if(ideco2Left>0&&ideco2>0){const p2=ideco2/ideco2Left;iAsset+=p2;ideco2-=p2;ideco2Left--}
    if(sp&&sa===Math.round(n(A.skyosai.recv))&&kyo2>0){const ky=n(A.skyosai.yrs)>0?n(A.skyosai.yrs):kyoYrs(S,'skyosai');const tx=retireTax(kyo2,ky).tax;rtx+=tx;iAsset+=kyo2-tx;kyo2=0;ev.push('配偶者の共済金 受取')}
    if(a===Math.round(n(A.save.recv))&&n(A.save.amt)>0){iSaveIns=n(A.save.amt);iAsset+=iSaveIns;ev.push('保険など 受取')}
    const iTot=iSelf+iSp+iPen+iAl+iOne+iProp+iAsset+iSale, eTot=eLive+eHouse+eEdu+eIns+eCar+eOne+eProp+eSave, net=iTot-eTot;
    // 運用
    const rC=cash>0?cash*n(A.cash.rate)/100:0, rN=nisa*(n(A.nisa.rate)/100+sh('nisa',t)), rT=taxa*(n(A.tax.rate)/100+sh('tax',t)), rI=ideco*(n(A.ideco.rate)/100+sh('ideco',t)), rK=kyo*n(A.kyosai.rate)/100;
    const rN2=nisa2*(n(A.snisa.rate)/100+sh('snisa',t)), rI2=ideco2*(n(A.sideco.rate)/100+sh('sideco',t)), rK2=kyo2*n(A.skyosai.rate)/100;
    let rO=0;OS.forEach((x,ix)=>{const g=Math.max(-x.bal*0.95,x.bal*(n(x.o.rate)/100+(opt&&opt.z?Math.max(0,n(x.o.vol))/100*opt.z[t]:0)));rO+=g;x.bal+=g+cO[ix];x.basis+=cO[ix]});
    cash=cash+rC+net; nisa+=rN+cN; taxa+=rT; ideco+=rI+cI; kyo+=rK+cK; nisa2+=rN2+cN2; ideco2+=rI2+cI2; kyo2+=rK2+cK2;
    // 足りない分は、課税口座 → その他の資産 → NISA の順に取り崩す
    let wd=0,wTax=0;
    if(cash<0&&taxa>0){const gr=Math.max(0,(taxa-basis)/taxa),k=1-gr*0.20315,take=Math.min(taxa,-cash/k);basis-=basis*take/taxa;taxa-=take;cash+=take*k;wd+=take;wTax+=take*(1-k)}
    OS.forEach(x=>{if(cash<0&&x.bal>0&&x.o.liquid!==false){const gr=Math.max(0,(x.bal-x.basis)/x.bal),k=1-gr*Math.min(60,Math.max(0,n(x.o.tax)))/100,take=Math.min(x.bal,-cash/k);x.basis-=x.basis*take/x.bal;x.bal-=take;cash+=take*k;wd+=take;wTax+=take*(1-k)}});
    if(cash<0&&nisa>0){const take=Math.min(nisa,-cash);nisa-=take;cash+=take;wd+=take}
    if(cash<0&&nisa2>0){const take=Math.min(nisa2,-cash);nisa2-=take;cash+=take;wd+=take}
    if(wd>0.5) ev.push('投資を取り崩し');
    const bs=snap();
    const pl={salary:iSelf+iSp,pension:iPen,allow:iAl,prop:iProp,one:iOne,ins:iSaveIns,ret:rC+rN+rT+rI+rK+rN2+rI2+rK2+rO,gain:pGain,
      live:eLive,rent:eRent,hcost:eHcost,hint:hInt,hdep:hDep,buycost:eBuyCost,edu:eEdu,insp:eIns,car:eCar,ev:eEv,pint:pInt,pdep:pDep,wtax:wTax+rtx};
    pl.rev=pl.salary+pl.pension+pl.allow+pl.prop+pl.one+pl.ins+pl.ret+Math.max(0,pl.gain);
    pl.exp=pl.live+pl.rent+pl.hcost+pl.hint+pl.hdep+pl.buycost+pl.edu+pl.insp+pl.car+pl.ev+pl.pint+pl.pdep+pl.wtax+Math.max(0,-pl.gain);
    pl.net=pl.rev-pl.exp; pl.chk=(bs.nw-nw0)-pl.net;
    const oth=othT(), othL=OS.map(x=>x.bal), bal=cash+nisa+nisa2+taxa+ideco+ideco2+kyo+kyo2+oth;
    rows.push({y,a,sa,kids:kids.map(c=>y-Math.round(n(c.by))),ev,iSelf,iSp,iPen,iAl,iOne,iProp,iAsset,iSale,iTot,eLive,eHouse,eEdu,eIns,eCar,eOne,eProp,eSave,eTot,net,wd,cash,nisa:nisa+nisa2,taxa,ideco:ideco+ideco2,kyo:kyo+kyo2,nisaS:nisa2,idecoS:ideco2,kyoS:kyo2,oth,othL,bal,bs,pl});
  }
  rows.bs0=bs0;
  return rows;
}
function summarize(rows,S){
  let min=rows[0]; rows.forEach(r=>{if(r.bal<min.bal)min=r});
  const neg=rows.find(r=>r.cash<-0.5);
  const last=rows[rows.length-1];
  const retire=rows.find(r=>r.a===Math.round(n(S.workEnd)))||last;
  const liq=r=>r.cash+r.nisa+r.taxa+(r.oth||0);let minL=rows[0];rows.forEach(r=>{if(liq(r)<liq(minL))minL=r});
  const st=neg?{c:'bad',t:neg.a+'歳で不足'}:(liq(minL)<n(S.live)*12*2?{c:'warn',t:'余裕が少ない'}:{c:'good',t:'不足なし'});
  return{min,neg,last,retire,st};
}

const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>{const r=Math.round(v);return(r<0?'▲':'')+Math.abs(r).toLocaleString('ja-JP')};
/* ---------- form schema ---------- */
const spOn=S=>S.spouse==='yes';
const GROUPS=[
 {t:'ご家族',s:'年齢は今年の誕生日を迎えた時点',f:[
  {id:'spouse',easy:1,l:'配偶者',type:'sel',o:[['yes','いる'],['no','いない']]},
  {id:'age',easy:1,l:'ご本人の年齢',u:'歳',pr:'sage',pl:'年齢'},
  {id:'sage',easy:1,l:'配偶者の年齢',u:'歳',show:spOn}],kids:true},
 {t:'お仕事の収入',s:'手取り額（額面のおよそ75〜85%）。配偶者の分も忘れずに',f:[
  {id:'inc',easy:1,l:'ご本人の手取り年収',u:'万円/年',pr:'sinc',pl:'手取り年収',ph:'源泉徴収票の「支払金額」から、税金・社会保険料を引いた額。わからなければ額面の約8割'},
  {id:'sinc',easy:1,l:'配偶者の手取り年収',u:'万円/年',show:spOn},
  {id:'raise',l:'昇給率',u:'%/年',st:.1,pre:'raise',rec:1,recNote:'パート・アルバイトなら「ほぼ上がらない」〜「少し」',pr:'sraise',pl:'昇給率'},
  {id:'sraise',l:'配偶者の昇給率',u:'%/年',st:.1,show:spOn,pre:'raise',rec:1,recNote:'パート・アルバイトなら「ほぼ上がらない」〜「少し」'},
  {id:'ret',l:'定年の年齢',u:'歳',pr:'sret',pl:'定年の年齢',ph:'パート・自営などで定年がなければ、完全に辞める年齢と同じに'},
  {id:'sret',l:'配偶者の定年の年齢',u:'歳',show:spOn},
  {id:'sev',l:'退職金（手取り）',u:'万円',pr:'ssev',pl:'退職金（手取り）',ph:'額面しかわからないときは、下の「退職金の手取りを計算する」で。自営業などで退職金がなければ「なし」を',none:'なし'},
  {id:'ssev',l:'配偶者の退職金（手取り）',u:'万円',show:spOn,none:'なし'},
  {id:'reinc',l:'定年後の手取り年収',u:'万円/年',pr:'sreinc',pl:'定年後の手取り年収',ph:'再雇用・パートなど。働かないなら0'},
  {id:'sreinc',l:'配偶者の定年後の手取り年収',u:'万円/年',show:spOn},
  {id:'workEnd',l:'完全に仕事を辞める年齢',u:'歳',pr:'sworkEnd',pl:'完全に仕事を辞める年齢'},
  {id:'sworkEnd',l:'配偶者が完全に仕事を辞める年齢',u:'歳',show:spOn}],sevcalc:1},
 {t:'年金',adv:1,pencalc:1,s:'「ねんきん定期便」の見込み額が目安。手元にない場合は下の「目安を計算」で',f:[
  {id:'pen',l:'ご本人の年金（手取り）',u:'万円/月',pr:'spen',pl:'年金（手取り）'},
  {id:'spen',l:'配偶者の年金（手取り）',u:'万円/月',show:spOn},
  {id:'penAge',l:'受け取り開始',u:'歳',pr:'spenAge',pl:'受け取り開始の年齢',ph:'原則65歳。60〜75歳の間で早めたり遅らせたりできます'},
  {id:'spenAge',l:'配偶者の受け取り開始',u:'歳',show:spOn},
  {id:'penRev',l:'年金の改定率',u:'%/年',st:.1,h:'年金は物価が上がっても、それより少し低めに増える仕組みです',pre:'penRev',rec:0.5}]},
 {t:'住まい',f:[
  {id:'house',easy:1,l:'住まいの状況',type:'sel',o:[['rent','賃貸のまま'],['own','持ち家（返済中・完済）'],['buy','これから購入する']]},
  {id:'rent',easy:1,l:'家賃',u:'万円/月',h:'購入までの家賃',show:S=>S.house!=='own'},
  {id:'loanPay',easy:1,l:'住宅ローンの返済額',u:'万円/月',h:'完済済みなら0',show:S=>S.house==='own'},
  {id:'loanEnd',easy:1,l:'返済が終わる年齢',u:'歳',show:S=>S.house==='own'},
  {id:'orate',l:'住宅ローンの金利',u:'%',st:.01,h:'ローン残高の計算に使います',show:S=>S.house==='own'},
  {id:'hval',l:'自宅の今の価値（評価額）',u:'万円',h:'売ったらいくらかの目安。家計のバランスシートに使います',show:S=>S.house==='own'},
  {id:'buyAge',easy:1,l:'購入する年齢',u:'歳',show:S=>S.house==='buy'},
  {id:'price',easy:1,l:'物件価格',u:'万円',show:S=>S.house==='buy',h:'別途、諸費用7%を購入時に計上'},
  {id:'down',easy:1,l:'頭金',u:'万円',show:S=>S.house==='buy'},
  {id:'rate',l:'借入金利',u:'%',st:.01,show:S=>S.house==='buy'},
  {id:'term',l:'返済期間',u:'年',show:S=>S.house==='buy'},
  {id:'hcost',l:'固定資産税・修繕など',u:'万円/年',show:S=>S.house!=='rent'},
  {id:'hdep',l:'家の価値の変わり方',u:'%/年',st:.1,h:'建物は年々価値が下がります。戸建て・マンションとも−1〜−2%程度で見込むことが多い',show:S=>S.house!=='rent',pre:'hdep',rec:-1.5}]},
 {t:'毎月の支出',f:[
  {id:'live',easy:1,l:'生活費（住居費・保険料以外）',u:'万円/月',h:'食費・光熱費・通信費・お小遣いなど'},
  {id:'retRatio',l:'退職後の生活費',u:'%',h:'今の生活費に対する割合',pre:'retRatio',rec:80},
  {id:'ins',l:'保険料',u:'万円/月',h:'生命保険・医療保険・がん保険など。積立型の保険も含めた、払っている額',show:S=>!insOn(S)},
  {id:'insEnd',l:'保険料を払い終える年齢',u:'歳',show:S=>!insOn(S)}],insl:1},
 {t:'車',adv:1,f:[
  {id:'car',l:'1台あたりの購入費用',u:'万円',show:S=>carOn(S)},
  {id:'carEvery',l:'買い替えの間隔',u:'年',show:S=>carOn(S)},
  {id:'carNext',l:'次の買い替えまで',u:'年後',show:S=>carOn(S)},
  {id:'carLast',l:'最後に買う年齢',u:'歳',show:S=>carOn(S)}],carsel:1},
 {t:'今の資産と積立',s:'今の貯蓄・投資と、毎月の積立',f:[
  {id:'infl',l:'物価上昇率',u:'%/年',st:.1,h:'生活費・教育費に反映',pre:'infl',rec:2}],assets:true},
 {t:'不動産投資',adv:1,s:'貸している物件がある場合',props:true},
 {t:'その他の予定',adv:1,s:'旅行・リフォーム・相続など',events:true}
];
const ALLF=GROUPS.flatMap(g=>g.f||[]);
/* 数字の代わりに言葉で選べる候補（押すと入力欄に数字が入ります。数字は自由に変えられます） */
const PRESETS={
 infl:[[1,'ゆるやか'],[1.5,'控えめ'],[2,'標準（日銀の目標）'],[3,'高め']],
 raise:[[0,'ほぼ上がらない'],[0.5,'少し'],[1,'ゆるやか'],[2,'しっかり']],
 penRev:[[0,'増えない'],[0.5,'控えめ'],[1,'やや増える']],
 retRatio:[[70,'しっかり節約'],[80,'標準'],[100,'今と同じ']],
 hdep:[[0,'変わらない'],[-1,'ゆるやか'],[-1.5,'標準'],[-2.5,'早め']],
 cash:[[0.1,'低め'],[0.3,'普通'],[0.5,'定期預金中心']],
 inv:[[0.1,'預金中心'],[1.5,'債券中心'],[3,'バランス型'],[4,'株式中心']]
};
function preHTML(key,id,cur,rec,note){
  const P=PRESETS[key];if(!P)return '';
  return `<span class="pre" role="group" aria-label="目安から選ぶ">${P.map(([v,l])=>`<button type="button" data-act="pre" data-for="${id}" data-v="${v}" aria-pressed="${cur!==''&&cur!=null&&+cur===v}">${l}<small>${v}</small></button>`).join('')}</span>${rec!=null?`<span class="hint">迷ったら「${P.find(p=>p[0]===rec)[1]}」${note?'。'+note:''}</span>`:''}`;
}

/* 夫婦で対になる項目（pr）は「ご本人｜配偶者」の2列で並べる */
function fieldsHTML(g,S){
  const F=g.f, skip=new Set(F.filter(f=>f.pr).map(f=>f.pr));
  return F.map(f=>{
    if(skip.has(f.id)) return '';
    if(!f.pr) return fieldHTML(f,S);
    const p=F.find(x=>x.id===f.pr);
    return `<div class="pairrow"${f.easy||p.easy?'':' data-adv'}><div class="plab">${esc(f.pl)}</div><div class="pcols">${fieldHTML(f,S,'ご本人')}${fieldHTML(p,S,'配偶者')}</div>${f.ph?`<span class="hint">${esc(f.ph)}</span>`:''}</div>`;
  }).join('');
}
function fieldHTML(f,S,who){
  const hint=f.h&&!who?`<span class="hint">${esc(f.h)}</span>`:'';
  const lab=who?`<span class="lab who">${who}</span>`:`<span class="lab">${esc(f.l)}</span>`;
  if(f.type==='sel') return `<label class="fld" data-f="${f.id}"${f.easy?'':' data-adv'}><span class="lab">${esc(f.l)}</span><select id="f_${f.id}" data-k="${f.id}">${f.o.map(o=>`<option value="${o[0]}"${S[f.id]===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select>${hint}</label>`;
  return `<label class="fld" data-f="${f.id}"${f.easy?'':' data-adv'}${who?` aria-label="${esc(f.l)}"`:''}>${lab}<span class="inp"><input id="f_${f.id}" data-k="${f.id}" type="number" inputmode="decimal" step="${f.st||1}" value="${esc(S[f.id])}"><span class="u">${f.u}</span></span>${f.pre?preHTML(f.pre,'f_'+f.id,S[f.id],f.rec,f.recNote):''}${f.none?`<span class="pre none" role="group"><button type="button" data-act="pre" data-for="f_${f.id}" data-v="0" aria-pressed="${S[f.id]!==''&&S[f.id]!=null&&+S[f.id]===0}">${f.none}</button></span>`:''}${hint}</label>`;
}
function kidsHTML(S){
  const sel=(i,k,opts,v)=>`<select id="k${i}_${k}" data-kid="${i}" data-kk="${k}">${opts.map(o=>`<option value="${o[0]}"${v===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select>`;
  return `<div class="sub"><div class="subhead"><span>お子さま <span class="unit">（出産予定は予定の西暦を入力）</span></span>${S.kids.length<4?`<button class="btn small" data-act="addkid">＋ 追加</button>`:''}</div>
  <div class="sublist">${S.kids.length?S.kids.map((c,i)=>`<div class="sub" style="background:var(--surface)"><div class="subhead"><span>第${i+1}子</span><button class="btn small ghost danger" data-act="delkid" data-i="${i}">削除</button></div>
   <div class="fields">
    <label class="fld"><span class="lab">生まれ年</span><span class="inp"><input id="k${i}_by" data-kid="${i}" data-kk="by" type="number" inputmode="numeric" value="${esc(c.by)}"><span class="u">年</span></span></label>
    <label class="fld" data-adv><span class="lab">幼稚園・保育園</span>${sel(i,'kg',[['pub','公立'],['pri','私立']],c.kg)}</label>
    <label class="fld" data-adv><span class="lab">小・中・高</span>${sel(i,'sch',[['pub','すべて公立'],['pri_hs','高校から私立'],['pri_jh','中学から私立'],['pri_all','小学校から私立']],c.sch)}</label>
    <label class="fld"><span class="lab">大学</span>${sel(i,'uni',[['none','進学しない'],['pub','国公立'],['pri_b','私立文系'],['pri_r','私立理系']],c.uni)}</label>
    <label class="chk" data-adv><input type="checkbox" id="k${i}_away" data-kid="${i}" data-kk="away"${c.away?' checked':''}> 大学は一人暮らし</label>
   </div></div>`).join(''):'<span class="unit">お子さまがいない場合はそのままで大丈夫です。</span>'}</div></div>`;
}
/* 保険を1件ずつ（夫婦で払い終わる時期が違うときなど）。1件でもあれば「保険料」「払い終える年齢」のかわりに使う */
const insOn=S=>Array.isArray(S.insl)&&S.insl.length>0;
function insYear(S,a,sa){
  if(!insOn(S)) return a<n(S.insEnd)?n(S.ins)*12:0;
  return S.insl.reduce((t,x)=>{const age=x.who==='sp'?sa:a;return t+(age!=null&&age<n(x.end)?n(x.mon)*12:0)},0);
}
const insNow=S=>insOn(S)?S.insl.reduce((t,x)=>t+n(x.mon),0):n(S.ins);
function inslHTML(S){
  const L=insOn(S)?S.insl:[], sp=S.spouse==='yes';
  return `<div class="sub" data-adv style="margin-top:14px"><div class="subhead"><span>保険を1件ずつ入れる</span>${L.length<10?`<button class="btn small" data-act="addins">＋ 保険を追加</button>`:''}</div>
  <p class="unit" style="margin:4px 0 8px">夫婦で払い終わる時期が違う、更新で保険料が変わるなど、保険がいくつかあるときに使います。1件でも入れると、上の「保険料」のかわりにこちらで計算します。保険料は保険証券や「ご契約内容のお知らせ」で確認できます。</p>
  <div class="sublist">${L.length?L.map((x,i)=>`<div class="fields" style="align-items:end">
    <label class="fld"><span class="lab">保険の名前</span><input class="txt" id="i${i}_name" data-il="${i}" data-ik="name" value="${esc(x.name)}" placeholder="例：夫の医療保険"></label>
    ${sp?`<label class="fld"><span class="lab">だれの保険</span><select id="i${i}_who" data-il="${i}" data-ik="who"><option value="self"${x.who!=='sp'?' selected':''}>ご本人</option><option value="sp"${x.who==='sp'?' selected':''}>配偶者</option></select></label>`:''}
    <label class="fld"><span class="lab">保険料</span><span class="inp"><input id="i${i}_mon" data-il="${i}" data-ik="mon" type="number" inputmode="decimal" step="0.1" value="${esc(x.mon)}"><span class="u">万円/月</span></span><span class="hint">年払いなら12で割った額</span></label>
    <label class="fld"><span class="lab">払い終える年齢</span><span class="inp"><input id="i${i}_end" data-il="${i}" data-ik="end" type="number" inputmode="numeric" value="${esc(x.end)}"><span class="u">歳</span></span><span class="hint">${sp?'その人の年齢で。':''}終身払いなら90など</span></label>
    <button class="btn small ghost danger" data-act="delins" data-i="${i}" style="justify-self:start">削除</button></div>`).join('')+`<p class="unit" style="margin:4px 0 0">いまの保険料の合計：月${(Math.round(insNow(S)*10)/10).toLocaleString('ja-JP')}万円</p>`:'<span class="unit">まだありません。</span>'}</div></div>`;
}
function eventsHTML(S){
  return `<div class="sub"><div class="subhead"><span>予定している大きな出費・収入</span>${S.events.length<8?`<button class="btn small" data-act="addev">＋ 追加</button>`:''}</div>
  <div class="sublist">${S.events.length?S.events.map((e,i)=>`<div class="fields" style="align-items:end">
    <label class="fld"><span class="lab">内容</span><input class="txt" id="e${i}_name" data-ev="${i}" data-ek="name" value="${esc(e.name)}" placeholder="例：リフォーム"></label>
    <label class="fld"><span class="lab">ご本人が何歳の時</span><span class="inp"><input id="e${i}_age" data-ev="${i}" data-ek="age" type="number" inputmode="numeric" value="${esc(e.age)}"><span class="u">歳</span></span></label>
    <label class="fld"><span class="lab">金額</span><span class="inp"><input id="e${i}_amt" data-ev="${i}" data-ek="amt" type="number" inputmode="decimal" value="${esc(e.amt)}"><span class="u">万円</span></span></label>
    <label class="fld"><span class="lab">種類</span><select id="e${i}_kind" data-ev="${i}" data-ek="kind"><option value="out"${e.kind!=='in'?' selected':''}>出費</option><option value="in"${e.kind==='in'?' selected':''}>収入（相続など）</option></select></label>
    <button class="btn small ghost danger" data-act="delev" data-i="${i}" style="justify-self:start">削除</button></div>`).join(''):'<span class="unit">まだありません。</span>'}</div></div>`;
}
const ACC=[
 {k:'cash',t:'預貯金',d:'普通預金・定期預金など。毎年の黒字・赤字はここで受けます。',f:[['bal','残高','万円'],['rate','利回り','%/年',.1,'',null,'cash']]},
 {k:'nisa',t:'NISA',d:'つみたて投資枠・成長投資枠。運用益は非課税。手元のお金が足りない年は、課税口座の次に取り崩します。',f:[['bal','残高','万円'],['mon','積立額','万円/月',.1],['until','積立をやめる年齢','歳'],['rate','利回りの見込み','%/年',.1,'',null,'inv']]},
 {k:'tax',t:'課税口座の投資',d:'特定口座・一般口座の株や投資信託など。取り崩すときに、利益に約20%の税金がかかる前提です。手元のお金が足りない年は、まずここから取り崩します。',f:[['bal','残高','万円'],['basis','うち元本（買った金額）','万円'],['rate','利回りの見込み','%/年',.1,'',null,'inv']]},
 {k:'ideco',t:'iDeCo（個人型確定拠出年金）',d:'原則60歳まで引き出せません。受け取り開始の年齢になるまで、足りない年の取り崩しには使いません。',f:[['bal','残高','万円'],['mon','掛金','万円/月',.1],['until','掛金を払う最後の年齢','歳'],['recv','受け取り開始','歳',1,'60〜75歳の間で選べます'],['mode','受け取り方','sel',[['lump','一時金でまとめて'],['annuity','年金で分けて']]],['yrs','年金で受け取る年数','年',1,'',x=>x.mode==='annuity'],['rate','利回りの見込み','%/年',.1,'',null,'inv']]},
 {k:'kyosai',t:'小規模企業共済',d:'個人事業主・小さな会社の役員向けの退職金の積立です。廃業・退職のときにまとめて受け取る前提で、退職金と同じ税金（退職所得）を差し引いて計算します。',f:[['bal','今の掛金の累計','万円'],['mon','掛金','万円/月',.1,'月0.1〜7万円'],['until','掛金を払う最後の年齢','歳'],['recv','受け取る年齢（廃業・退職の予定）','歳'],['yrs','受け取るまでの加入年数','年',1,'税金（退職所得）の計算に使います。空欄なら掛金から見積もります'],['rate','増え方の目安','%/年',.1,'受取額は加入年数や受け取り方で変わります。目安として1%程度']]},
 {k:'save',t:'貯蓄型の保険・その他',d:'学資保険・個人年金・終身保険の解約返戻金など、将来まとめて受け取る予定のお金。保険料は「毎月の支出」の保険料に入れてください。',f:[['amt','受け取る見込み額','万円'],['recv','受け取る年齢','歳']]}
];
/* 配偶者名義の NISA・iDeCo・小規模企業共済（ご本人の口座と同じ項目。年齢は配偶者の年齢） */
const SPACC={snisa:'nisa',sideco:'ideco',skyosai:'kyosai'}, SELFACC=['nisa','ideco','kyosai'];
Object.entries(SPACC).forEach(([sk,k])=>{const b=ACC.find(x=>x.k===k);ACC.splice(ACC.findIndex(x=>x.k==='save'),0,{k:sk,sp:1,t:b.t,d:'配偶者の名義の分。年齢は配偶者の年齢で入れてください。',f:b.f.map(f=>{const g=f.slice();if(g[2]==='歳')g[1]=g[1].replace(/（.*）$/,'')+'（配偶者の年齢）';return g})})});
/* 使っているものだけ選んで出す（預貯金はみんな入力。NISA・iDeCo・共済・車などは選んだときだけ入力欄を出す）
   S.use[k] が未設定なら、金額が入っているかどうかで判断。オフにすると金額を0にして計算から外す（同じ画面のうちはオンに戻すと元の値に戻る） */
const USEK=[['nisa','NISA'],['tax','株・投資信託（NISA以外）'],['ideco','iDeCo'],['kyosai','小規模企業共済'],['save','貯蓄型の保険'],['others','金・外貨・暗号資産など']];
const USTASH={};
function useOn(S,k){
  if(S.use&&S.use[k]===true) return true;
  const A=S.assets,sp=S.spouse==='yes',v=x=>x&&(n(x.bal)>0||n(x.mon)>0);
  if(k==='others') return A.others.length>0;
  if(k==='save') return n(A.save.amt)>0;
  if(k==='tax') return n(A.tax.bal)>0;
  return v(A[k])||(sp&&v(A['s'+k]));
}
function setUse(S,k,on){
  S.use=S.use||{};if(on)S.use[k]=true;else delete S.use[k];const A=S.assets,ks=k==='others'||k==='save'||k==='tax'?[k]:[k,'s'+k];
  if(!on){USTASH[k]=clone(k==='others'?A.others:ks.map(x=>A[x]));
    if(k==='others')A.others=[];else ks.forEach(x=>{['bal','mon','basis','amt'].forEach(f=>{if(f in A[x])A[x][f]=0})});}
  else if(USTASH[k]){if(k==='others')A.others=USTASH[k];else ks.forEach((x,i)=>A[x]=USTASH[k][i]);delete USTASH[k]}
  else if(k==='others'&&!A.others.length)A.others.push(newOther('gold'));
}
const carOn=S=>S.carUse===true||n(S.car)>0;
function setCar(S,on){if(on)S.carUse=true;else delete S.carUse;if(!on){if(n(S.car)>0)USTASH.car=S.car;S.car=0}else if(!(n(S.car)>0))S.car=USTASH.car||250}
function carSelHTML(S){const on=carOn(S);return `<div class="fields" style="margin-bottom:10px"><div class="fld"><span class="lab">車</span><span class="seg" role="group" aria-label="車"><button type="button" data-act="caruse" data-v="1" aria-pressed="${on}">持っている・買う予定</button><button type="button" data-act="caruse" data-v="0" aria-pressed="${!on}">持たない</button></span></div></div>`}
function usePickHTML(S){return `<div class="usepick" data-adv><p class="wzq" style="margin:0 0 6px">使っているもの・持っているものを選んでください</p><p class="unit" style="margin:0 0 8px">選んだものだけ入力欄が出ます。預貯金はどなたも入力してください。</p><div class="pre" role="group" aria-label="使っているもの">${USEK.map(([k,l])=>`<button type="button" data-act="use" data-k="${k}" aria-pressed="${useOn(S,k)}">${useOn(S,k)?'✓ ':'＋ '}${l}</button>`).join('')}</div></div>`}
const EASYF={}; // かんたん入力では口座ごとではなく、下の3項目（預貯金・投資・毎月の積立）だけを出す
/* かんたん入力の資産：投資と積立は、くわしく入力の口座（NISA・課税口座・iDeCo・共済・その他）の合計として扱う */
const INVK0=['nisa','tax','ideco','kyosai'];
const invK=S=>S.spouse==='yes'?INVK0.concat(Object.keys(SPACC)):INVK0;
const monK=S=>S.spouse==='yes'?['nisa','ideco','kyosai','snisa','sideco','skyosai']:['nisa','ideco','kyosai'];
function easySums(S){const A=S.assets;const inv=invK(S).reduce((s,k)=>s+Math.max(0,n(A[k].bal)),0)+A.others.reduce((s,o)=>s+Math.max(0,n(o.bal)),0);
  const mon=monK(S).reduce((s,k)=>s+n(A[k].mon),0)+A.others.reduce((s,o)=>s+Math.max(0,n(o.mon)),0);return{inv,mon}}
function setEasy(S,key,v){
  const A=S.assets;v=v===''?'':Math.max(0,parseFloat(v)||0);
  if(key==='cash'){A.cash.bal=v;return}
  const cur=easySums(S)[key],val=n(v);
  if(key==='inv'){
    if(cur>0){const r=val/cur;invK(S).forEach(k=>{A[k].bal=Math.round(n(A[k].bal)*r*10)/10});A.tax.basis=Math.round(n(A.tax.basis)*r*10)/10;A.others.forEach(o=>{o.bal=Math.round(n(o.bal)*r*10)/10;if(o.basis!==''&&o.basis!=null)o.basis=Math.round(n(o.basis)*r*10)/10})}
    else A.nisa.bal=val;
  }else{
    if(cur>0){const r=val/cur;monK(S).forEach(k=>{A[k].mon=Math.round(n(A[k].mon)*r*10)/10});A.others.forEach(o=>o.mon=Math.round(n(o.mon)*r*10)/10)}
    else A.nisa.mon=val;
  }
}
function easyAssetsHTML(S){
  const e=easySums(S);
  const F=(k,l,u,v,h)=>`<label class="fld"><span class="lab">${l}</span><span class="inp"><input id="ez_${k}" data-ez="${k}" type="number" inputmode="decimal" step="${k==='mon'?.1:1}" value="${esc(v)}"><span class="u">${u}</span></span>${h?`<span class="hint">${esc(h)}</span>`:''}</label>`;
  return `<div class="sub easyonly"><div class="fields">
   ${F('cash','預貯金','万円',S.assets.cash.bal,'普通預金・定期預金など')}
   ${F('inv','投資の残高（合計）','万円',Math.round(e.inv*10)/10,'NISA・iDeCo・株・投資信託など。なければ0')}
   ${F('mon','毎月の積立（合計）','万円/月',Math.round(e.mon*10)/10,'NISA・iDeCoなどに毎月積み立てている額')}
  </div><p class="unit" style="margin:8px 0 0">口座ごとの残高や利回りは「くわしく入力」で分けて入れられます。</p></div>`;
}
const ACCOL={cash:'var(--planB)',nisa:'var(--accent)',tax:'var(--planC)',ideco:'var(--planD)',kyosai:'var(--warn)',oth:'var(--coin)',snisa:'var(--accent)',sideco:'var(--planD)',skyosai:'var(--warn)'};
function assetSummary(S){
  normPlan(S);const A=S.assets;
  const sp=S.spouse==='yes',B=k=>n(A[k].bal)+(sp&&A['s'+k]?n(A['s'+k].bal):0);
  const parts=[['cash','預貯金',n(A.cash.bal),n(A.cash.rate)],['nisa','NISA',B('nisa'),n(A.nisa.rate)],['tax','課税口座',n(A.tax.bal),n(A.tax.rate)],['ideco','iDeCo',B('ideco'),n(A.ideco.rate)],['kyosai','共済',B('kyosai'),n(A.kyosai.rate)]];
  const ob=A.others.reduce((s,o)=>s+Math.max(0,n(o.bal)),0);if(ob>0)parts.push(['oth','その他',ob,Math.round(A.others.reduce((s,o)=>s+Math.max(0,n(o.bal))*n(o.rate),0)/ob*10)/10]);
  const tot=parts.reduce((s,p)=>s+Math.max(0,p[2]),0);
  const avg=tot>0?parts.reduce((s,p)=>s+Math.max(0,p[2])*p[3],0)/tot:0;
  const mon=monK(S).reduce((s,k)=>s+n(A[k].mon),0)+A.others.reduce((s,o)=>s+Math.max(0,n(o.mon)),0);
  return{parts,tot,avg,mon};
}
function assetBar(S){
  const s=assetSummary(S);
  const seg=s.tot>0?s.parts.filter(p=>p[2]>0).map(p=>`<i title="${p[1]}" style="width:${(p[2]/s.tot*100).toFixed(2)}%;background:${ACCOL[p[0]]}"></i>`).join(''):'';
  return `<div class="asum"><div class="asum-k"><span>今の資産の合計<b>${fmt(s.tot)}<small>万円</small></b></span><span>平均の利回り見込み<b>${s.avg.toFixed(1)}<small>%</small></b></span><span>毎月の積立・掛金<b>${(Math.round(s.mon*10)/10).toLocaleString('ja-JP')}<small>万円</small></b></span></div>
  <div class="abar">${seg||'<i style="width:100%;background:var(--line)"></i>'}</div>
  <div class="alg">${s.parts.filter(p=>p[2]>0).map(p=>`<span><span class="dot" style="background:${ACCOL[p[0]]}"></span>${p[1]} ${fmt(p[2])}万円（${p[3]}%）</span>`).join('')||'<span>残高を入れると内訳が表示されます</span>'}</div></div>`;
}
function assetsHTML(S){
  normPlan(S);
  return `${easyAssetsHTML(S)}<div id="asum" data-adv>${assetBar(S)}</div>${usePickHTML(S)}<div class="sublist" style="margin-top:12px">${ACC.map(ac=>{const o=S.assets[ac.k];const bk=SPACC[ac.k]||ac.k;if(bk!=='cash'&&!useOn(S,bk))return '';return `<div class="sub" data-acc="${ac.k}"${EASYF[ac.k]?'':' data-adv'}${ac.sp?` data-spacc${S.spouse==='yes'?'':' hidden'}`:''}><div class="subhead"><span><span class="dot" style="background:${ACCOL[ac.k]||'var(--muted)'};margin-right:6px"></span>${ac.t}${SELFACC.includes(ac.k)?`<span class="whoS chip muted" style="margin-left:6px"${S.spouse==='yes'?'':' hidden'}>ご本人</span>`:''}${ac.sp?'<span class="chip warn" style="margin-left:6px">配偶者</span>':''}</span></div><span class="unit" style="margin-top:-4px">${esc(ac.d)}</span>
   <div class="fields">${ac.f.map(f=>{const [k,l,u,st,h,show,pk]=f;const hid=(show&&!show(o)?' hidden':'')+(EASYF[ac.k]&&!EASYF[ac.k].includes(k)?' data-adv':'');const hint=h?`<span class="hint">${esc(h)}</span>`:'';
     if(u==='sel') return `<label class="fld"${hid} data-af="${ac.k}_${k}"><span class="lab">${l}</span><select id="a_${ac.k}_${k}" data-a="${ac.k}" data-ak="${k}">${st.map(x=>`<option value="${x[0]}"${o[k]===x[0]?' selected':''}>${x[1]}</option>`).join('')}</select></label>`;
     return `<label class="fld"${hid} data-af="${ac.k}_${k}"><span class="lab">${l}</span><span class="inp"><input id="a_${ac.k}_${k}" data-a="${ac.k}" data-ak="${k}" type="number" inputmode="decimal" step="${st||1}" value="${esc(o[k])}"><span class="u">${u}</span></span>${pk?preHTML(pk,`a_${ac.k}_${k}`,o[k]):''}${hint}</label>`}).join('')}</div></div>`}).join('')}${useOn(S,'others')?othersHTML(S):''}</div>`;
}
/* ---------- その他の資産（金・外貨・個別株・暗号資産など） ---------- */
const OTYPE={
 gold:{l:'金（ゴールド）',rate:2,vol:15,tax:20,note:'値動きは株式よりやや小さめ。利息や配当はありません。売った利益は譲渡所得（ここでは約20%で計算）。'},
 fx:{l:'外貨預金',rate:1,vol:10,tax:20,note:'利息に約20%の税金。為替で円に戻した額が上下します。為替の利益は雑所得になります（ここでは約20%で計算）。'},
 stock:{l:'個別株・ETF',rate:4,vol:20,tax:20.315,note:'NISAや「課税口座の投資」に入れていない株を、ここに分けて入れられます。利益に約20%の税金。'},
 crypto:{l:'暗号資産（ビットコインなど）',rate:0,vol:60,tax:30,note:'値動きがとても大きく、将来の値上がりは予想できないため、利回りは0%（増えも減りもしない）を初期値にしています。利益は雑所得で、税率は所得に応じて約15〜55%（ここでは30%で計算）。'},
 other:{l:'その他',rate:1,vol:5,tax:20,note:'貸付金・仕組み預金など。中身に合わせて利回りと税率を入れてください。'}
};
function newOther(type){const d=OTYPE[type]||OTYPE.other;return{type,name:'',bal:100,basis:'',mon:0,until:60,rate:d.rate,vol:d.vol,tax:d.tax}}
function othersHTML(S){
  const L=S.assets.others;
  const F=(i,o,k,l,u,st,h)=>`<label class="fld"><span class="lab">${l}</span><span class="inp"><input id="o${i}_${k}" data-o="${i}" data-ok="${k}" type="number" inputmode="decimal" step="${st||1}" value="${esc(o[k])}"><span class="u">${u}</span></span>${h?`<span class="hint">${esc(h)}</span>`:''}</label>`;
  return `<div class="sub" data-adv><div class="subhead"><span><span class="dot" style="background:${ACCOL.oth};margin-right:6px"></span>その他の資産 <span class="unit">（金・外貨預金・個別株・暗号資産など）</span></span>${L.length<6?`<button class="btn small" data-act="addoth">＋ 追加</button>`:''}</div>
  <span class="unit" style="margin-top:-4px">手元のお金が足りない年は、課税口座の次・NISAの前に取り崩します。値動きの大きさは「確率（モンテカルロ）」の計算に使います。</span>
  <div class="sublist">${L.length?L.map((o,i)=>{const d=OTYPE[o.type]||OTYPE.other;return `<div class="sub" style="background:var(--surface)"><div class="subhead"><span>${esc(o.name||d.l)}</span><button class="btn small ghost danger" data-act="deloth" data-i="${i}">削除</button></div>
   <div class="fields">
    <label class="fld"><span class="lab">種類</span><select id="o${i}_type" data-o="${i}" data-ok="type">${Object.entries(OTYPE).map(([k,v])=>`<option value="${k}"${o.type===k?' selected':''}>${v.l}</option>`).join('')}</select><span class="hint" id="o${i}_note">${esc(d.note)}</span></label>
    <label class="fld"><span class="lab">名前（任意）</span><input class="txt" id="o${i}_name" data-o="${i}" data-ok="name" value="${esc(o.name)}" placeholder="例：ビットコイン"></label>
    ${F(i,o,'bal','今の評価額','万円')}${F(i,o,'basis','うち元本（買った金額）','万円',1,'空欄なら評価額と同じ（利益なし）として計算')}
    ${F(i,o,'mon','積立額','万円/月',.1)}${F(i,o,'until','積立をやめる年齢','歳')}
    ${F(i,o,'rate','利回りの見込み','%/年',.1)}${F(i,o,'vol','値動きの大きさ','%',1,'1年で上下する幅の目安。金15%・株20%・暗号資産60%程度')}${F(i,o,'tax','売るときの税率（利益に対して）','%',1)}
   </div></div>`}).join(''):'<span class="unit">なければ、そのままで大丈夫です。</span>'}</div></div>`;
}
function syncAssetVis(S){ACC.forEach(ac=>ac.f.forEach(f=>{if(f[5]){const el=document.querySelector(`[data-af="${ac.k}_${f[0]}"]`);if(el)el.hidden=!f[5](S.assets[ac.k])}}));const b=document.getElementById('asum');if(b)b.innerHTML=assetBar(S)}
function propsHTML(S){
  normPlan(S);
  const F=[['name','物件名','txt'],['val','今の価値（評価額）','万円',1,'売ったらいくらかの目安'],['vdep','価値の変わり方','%/年',.1,'築年数とともに下がるのが一般的'],['rent','満室時の家賃','万円/月',.1],['vac','空室の割合','%'],['cost','経費（管理・修繕・固定資産税・保険）','万円/年'],['loan','ローン返済','万円/月',.1],['loanEnd','返済が終わる年齢','歳'],['rate','ローン金利','%',.01,'売却時のローン残高の計算に使います'],['sell','売る予定の年齢','歳',1,'売らない場合は0'],['price','売る価格の見込み','万円']];
  return `<div class="sub"><div class="subhead"><span>貸している物件 <span class="unit">（家賃の手取りから経費とローン返済を差し引いて計算）</span></span>${S.props.length<5?`<button class="btn small" data-act="addprop">＋ 物件を追加</button>`:''}</div>
  <div class="sublist">${S.props.length?S.props.map((p,i)=>`<div class="sub" style="background:var(--surface)"><div class="subhead"><span>${esc(p.name||'物件'+(i+1))}</span><button class="btn small ghost danger" data-act="delprop" data-i="${i}">削除</button></div><div class="fields">${F.map(([k,l,u,st,h])=>u==='txt'?`<label class="fld"><span class="lab">${l}</span><input class="txt" id="p${i}_${k}" data-pr="${i}" data-pk="${k}" value="${esc(p[k])}" placeholder="例：〇〇マンション 302号室"></label>`:`<label class="fld"><span class="lab">${l}</span><span class="inp"><input id="p${i}_${k}" data-pr="${i}" data-pk="${k}" type="number" inputmode="decimal" step="${st||1}" value="${esc(p[k])}"><span class="u">${u}</span></span>${h?`<span class="hint">${esc(h)}</span>`:''}</label>`).join('')}</div></div>`).join(''):'<span class="unit">貸している物件がなければ、そのままで大丈夫です。</span>'}</div></div>`;
}
/* 入力の反映（data-a / data-pr） */
function applyAssetInput(S,t){
  if(t.dataset.a){const o=S.assets[t.dataset.a];o[t.dataset.ak]=t.tagName==='SELECT'?t.value:(t.value===''?'':parseFloat(t.value));syncAssetVis(S);return true}
  if(t.dataset.ez){setEasy(S,t.dataset.ez,t.value);const b=document.getElementById('asum');if(b)b.innerHTML=assetBar(S);return true}
  if(t.dataset.o!=null){const o=S.assets.others[+t.dataset.o],k=t.dataset.ok;if(!o)return false;
    if(k==='type'){o.type=t.value;const d=OTYPE[t.value]||OTYPE.other;['rate','vol','tax'].forEach(x=>{o[x]=d[x];const el=document.getElementById(`o${t.dataset.o}_${x}`);if(el)el.value=d[x]});const h=document.getElementById(`o${t.dataset.o}_note`);if(h)h.textContent=d.note}
    else o[k]=k==='name'?t.value:(t.value===''?'':parseFloat(t.value));
    const b=document.getElementById('asum');if(b)b.innerHTML=assetBar(S);return true}
  if(t.dataset.pr!=null){const p=S.props[+t.dataset.pr];p[t.dataset.pk]=t.dataset.pk==='name'?t.value:(t.value===''?'':parseFloat(t.value));return true}
  return false;
}
function stackSVG(rows,id){
  const W=680,H=250,L=58,R=14,T=14,B=30,nn=rows.length;
  const keys=[['cash','預貯金'],['nisa','NISA'],['taxa','課税口座'],['ideco','iDeCo'],['kyo','共済'],['oth','その他']].filter(([k])=>k!=='oth'||rows.some(r=>r.oth>0.5));
  const col={cash:ACCOL.cash,nisa:ACCOL.nisa,taxa:ACCOL.tax,ideco:ACCOL.ideco,kyo:ACCOL.kyosai,oth:ACCOL.oth};
  let hv=0,lo=0;rows.forEach(r=>{const s=keys.reduce((a,[k])=>a+Math.max(0,r[k]),0);hv=Math.max(hv,s);lo=Math.min(lo,r.cash)});
  const tk=niceTicks(lo,hv,5),y0=tk[0],y1=tk[tk.length-1];
  const X=i=>L+(nn<=1?0:i*(W-L-R)/(nn-1)),Y=v=>T+(y1-v)*(H-T-B)/((y1-y0)||1);
  let g='';
  tk.forEach(v=>{g+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="${v===0?1.6:1}"${v===0?'':' stroke-dasharray="2 3"'}/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${v<0?'▲':''}${Math.abs(v).toLocaleString('ja-JP')}</text>`});
  rows.forEach((r,i)=>{if(r.a%10===0||i===0)g+=`<text x="${X(i)}" y="${H-10}" text-anchor="middle">${r.a}歳</text>`});
  const base=rows.map(()=>0);
  keys.forEach(([k])=>{
    const top=rows.map((r,i)=>base[i]+Math.max(0,r[k]));
    if(top.some((v,i)=>v>base[i]+0.5)){
      const up=top.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ');
      const dn=base.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).reverse().join(' ');
      g+=`<polygon points="${up} ${dn}" fill="${col[k]}" fill-opacity=".78"/>`;
    }
    top.forEach((v,i)=>base[i]=v);
  });
  if(lo<0){const up=rows.map((r,i)=>X(i).toFixed(1)+','+Y(Math.min(0,r.cash)).toFixed(1)).join(' ');g+=`<polygon points="${X(0)},${Y(0)} ${up} ${X(nn-1)},${Y(0)}" fill="var(--bad)" fill-opacity=".55"/>`}
  g+=`<text x="${L-8}" y="${T-2}" text-anchor="end" style="font-size:10px">万円</text>`;
  return `<div class="legend" style="margin-bottom:6px">${keys.map(([k,l])=>`<span><span class="dot" style="background:${col[k]}"></span>${l}</span>`).join('')}${lo<0?'<span><span class="dot" style="background:var(--bad)"></span>不足</span>':''}</div><svg class="chart" id="${id}" viewBox="0 0 ${W} ${H}" role="img" aria-label="資産の内訳の推移">${g}</svg>`;
}
function syncVis(S){ALLF.forEach(f=>{if(f.show){const el=document.querySelector(`[data-f="${f.id}"]`);if(el)el.hidden=!f.show(S)}});const sp=S.spouse==='yes';document.querySelectorAll('[data-spacc],.whoS').forEach(el=>el.hidden=!sp)}

/* ---------- chart ---------- */
function niceTicks(lo,hi,cnt){const span=hi-lo||1;let st=Math.pow(10,Math.floor(Math.log10(span/cnt)));const e=span/cnt/st;st*=e>=7.5?10:e>=3.5?5:e>=1.5?2:1;const a=Math.floor(lo/st)*st,b=Math.ceil(hi/st)*st;const t=[];for(let v=a;v<=b+1e-9;v+=st)t.push(Math.round(v));return t}
function chartSVG(series,hi,id){
  const W=680,H=270,L=58,R=14,T=14,B=30;
  const rows=series[0].rows, nn=rows.length;
  let lo=0,hv=0; series.forEach(s=>s.rows.forEach(r=>{lo=Math.min(lo,r.bal);hv=Math.max(hv,r.bal)}));
  const tk=niceTicks(lo,hv,5); const y0=tk[0],y1=tk[tk.length-1];
  const X=i=>L+(nn<=1?0:i*(W-L-R)/(nn-1)), Y=v=>T+(y1-v)*(H-T-B)/((y1-y0)||1);
  let g='';
  tk.forEach(v=>{g+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="${v===0?1.6:1}"${v===0?'':' stroke-dasharray="2 3"'}/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${v<0?'▲':''}${Math.abs(v).toLocaleString('ja-JP')}</text>`});
  rows.forEach((r,i)=>{if(r.a%10===0||i===0)g+=`<text x="${X(i)}" y="${H-10}" text-anchor="middle">${r.a}歳</text>`});
  // negative zone
  if(y0<0) g+=`<rect x="${L}" y="${Y(0)}" width="${W-L-R}" height="${Y(y0)-Y(0)}" fill="var(--bad)" fill-opacity=".06"/>`;
  series.slice().reverse().forEach((s,k)=>{
    const pts=s.rows.map((r,i)=>X(i).toFixed(1)+','+Y(r.bal).toFixed(1)).join(' ');
    if(k===series.length-1) g+=`<polygon points="${X(0)},${Y(Math.max(0,y0))} ${pts} ${X(s.rows.length-1)},${Y(Math.max(0,y0))}" fill="${s.color}" fill-opacity=".08"/>`;
    g+=`<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linejoin="round"${s.dash?` stroke-dasharray="${s.dash}"`:''}/>`;
  });
  if(hi!=null&&hi<nn){g+=`<line x1="${X(hi)}" x2="${X(hi)}" y1="${T}" y2="${H-B}" stroke="var(--muted)" stroke-width="1"/>`;series.forEach(s=>{const r=s.rows[hi];if(r)g+=`<circle cx="${X(hi)}" cy="${Y(r.bal)}" r="4.5" fill="var(--surface)" stroke="${s.color}" stroke-width="2.4"/>`})}
  g+=`<text x="${L-8}" y="${T-2}" text-anchor="end" style="font-size:10px">万円</text>`;
  return `<svg class="chart" id="${id}" viewBox="0 0 ${W} ${H}" role="img" aria-label="貯蓄残高の推移">${g}<rect class="hit" x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}" fill="transparent"/></svg>`;
}
function bindChart(id,len,onIdx){
  const svg=document.getElementById(id); if(!svg) return;
  const h=e=>{const b=svg.getBoundingClientRect();const x=(e.clientX-b.left)/b.width*680;const i=Math.round((x-58)/(680-58-14)*(len-1));onIdx(Math.max(0,Math.min(len-1,i)))};
  svg.addEventListener('pointermove',h); svg.addEventListener('pointerdown',h);
}

/* ---------- CF table ---------- */
function cfTable(rows,S,step){
  const cols=rows.filter((r,i)=>i===0||(r.a%step===0)||step===1);
  const kidsN=(S.kids||[]).length;
  const line=(lab,fn,cls='',numCls)=>`<tr class="${cls}"><th>${lab}</th>${cols.map(r=>{const v=fn(r);const neg=typeof v==='number'&&v<-0.5;return`<td class="${neg?'neg':''}${numCls?' '+numCls:''}">${typeof v==='number'?fmt(v):v}</td>`}).join('')}</tr>`;
  let h='<table class="cf"><tbody>';
  h+=line('西暦',r=>r.y+'年','hd');
  h+=line('ご本人',r=>r.a+'歳','hd');
  if(S.spouse==='yes') h+=line('配偶者',r=>r.sa+'歳','hd');
  for(let k=0;k<kidsN;k++) h+=line('第'+(k+1)+'子',r=>{const v=r.kids[k];return v>=0&&v<=30?v+'歳':'–'},'hd');
  h+=line('イベント',r=>esc(r.ev.join('・')),'','ev');
  h+=`<tr class="sec"><th>収入（万円）</th>${cols.map(()=>'<td></td>').join('')}</tr>`;
  h+=line('ご本人の収入',r=>r.iSelf);
  if(S.spouse==='yes') h+=line('配偶者の収入',r=>r.iSp);
  h+=line('年金',r=>r.iPen); h+=line('児童手当',r=>r.iAl);
  if((S.props||[]).length){h+=line('不動産収入（経費差引後）',r=>r.iProp);h+=line('不動産の売却（手取り）',r=>r.iSale);}
  h+=line('iDeCo・共済・保険の受取',r=>r.iAsset); h+=line('一時的な収入',r=>r.iOne);
  h+=line('収入 合計',r=>r.iTot,'tot');
  h+=`<tr class="sec"><th>支出（万円）</th>${cols.map(()=>'<td></td>').join('')}</tr>`;
  h+=line('生活費',r=>r.eLive); h+=line('住居費',r=>r.eHouse); h+=line('教育費',r=>r.eEdu); h+=line('保険料',r=>r.eIns); h+=line('車',r=>r.eCar);
  if((S.props||[]).length) h+=line('不動産ローン返済',r=>r.eProp);
  h+=line('積立・掛金（NISA・iDeCo・共済など）',r=>r.eSave); h+=line('一時的な支出',r=>r.eOne);
  h+=line('支出 合計',r=>r.eTot,'tot');
  h+=line('年間収支',r=>r.net,'tot');
  h+=`<tr class="sec"><th>資産残高（万円）</th>${cols.map(()=>'<td></td>').join('')}</tr>`;
  h+=line('預貯金',r=>r.cash); h+=line('NISA',r=>r.nisa); h+=line('課税口座',r=>r.taxa); h+=line('iDeCo',r=>r.ideco); h+=line('小規模企業共済',r=>r.kyo);if(rows.some(r=>r.oth>0.5))h+=line('その他の資産',r=>r.oth);
  h+=line('投資からの取り崩し',r=>r.wd);
  h+=line('資産の合計',r=>r.bal,'bal');
  return h+'</tbody></table>';
}


