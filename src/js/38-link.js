/* ---------- ツールどうしのつながり ----------
   1) ライフプラン診断の入力（パターンA）を、各ツールの最初の値として引き継ぐ（fromLP）
   2) 各ツールの結果を、ライフプラン診断の比べるパターンとして追加する（toLP）
   3) ライフプラン診断の結果に「次に確かめること」を出す（nextHTML） */
function lpSrc(){if(!LP||LP.example||!LP.plans||!LP.plans.A)return null;let k='A';try{const x=sessionStorage.getItem('sainomado-lp-src');if(x&&LP.plans[x])k=x}catch(e){}return LP.plans[k]}
const toGross=v=>Math.round(n(v)/0.78/10)*10; // ライフプランは手取り。額面は手取りの約1.28倍（手取り≒額面の78%）で逆算
const planBuy=S=>S.house==='buy'&&n(S.buyAge)>=Math.round(n(S.age));
const kidAges=S=>(S.kids||[]).map(k=>Y0-n(k.by));
function pvLoan(m,rate,years){const i=n(rate)/100/12,N=Math.max(1,Math.round(n(years)*12));return i>0?m*(1-Math.pow(1+i,-N))/i:m*N}

const FROMLP={
  loan(V,S){V.age=Math.round(n(S.age));V.income=toGross(S.inc);if(planBuy(S)){V.down=n(S.down);V.rate=n(S.rate);V.term=n(S.term);V.rtype='custom'}},
  rent2buy(V,S){V.age=Math.round(n(S.age));V.income=toGross(S.inc);if(S.house==='rent'&&n(S.rent)>0)V.rent=n(S.rent);if(planBuy(S)){V.down=n(S.down);V.rate=n(S.rate);V.term=n(S.term)}},
  vs(V,S){V.age=Math.round(n(S.age));if(S.house==='rent'&&n(S.rent)>0)V.rent=n(S.rent);if(planBuy(S)){V.price=n(S.price);V.down=n(S.down);V.rate=n(S.rate);V.term=n(S.term)}},
  koujo(V,S){V.how='gross';V.gross=toGross(S.inc);
    V.kids=(kidAges(S).some(a=>a<19)||n(S.age)<40||(S.spouse==='yes'&&n(S.sage)<40))?'yes':'no';
    if(planBuy(S)){V.loan=Math.max(0,n(S.price)-n(S.down));V.rate=n(S.rate);V.term=n(S.term);V.year=Y0+Math.max(0,Math.round(n(S.buyAge)-n(S.age)))}},
  furusato(V,S){V.gross=toGross(S.inc);V.sp=S.spouse==='yes'&&toGross(S.sinc)<=123?'yes':'no';
    const a=kidAges(S);V.dep=a.filter(x=>(x>=16&&x<=18)||x>=23).length;V.tok=a.filter(x=>x>=19&&x<=22).length},
  prepay(V,S){if(S.house==='own'&&n(S.loanPay)>0&&n(S.loanEnd)>n(S.age)){const y=Math.round(n(S.loanEnd)-n(S.age));V.years=y;V.rate=n(S.orate);V.bal=Math.round(pvLoan(n(S.loanPay),S.orate,y)/10)*10}}
};
Object.entries(FROMLP).forEach(([k,f])=>{if(GDEF[k])GDEF[k].fromLP=f});

const TOLP={
  prepay:{t:'繰上げ返済したあとの家計を確かめる',d:(V,R)=>`${fmt(R.A)}万円を今繰上げ返済（期間短縮型）するパターンを、ライフプラン診断に追加して、手元のお金の動きまで確かめられます。`,
    name:'繰上げ返済する',apply(T,V,R){const age=Math.round(n(T.age));T.events=(T.events||[]).concat([{name:'繰上げ返済（繰上げ返済シミュレーターより）',age,amt:Math.round(R.A),kind:'out'}]);
      if(T.house==='own'&&n(T.loanEnd)>age)T.loanEnd=Math.max(age,Math.round(n(T.loanEnd)-R.short.months/12))}},
  vs:{t:'この条件で買ったあとの家計を確かめる',d:V=>`${fmt(n(V.price))}万円の家を買うパターンを、ライフプラン診断に追加して、教育費や老後まで続けて確かめられます。`,
    name:'この条件で家を買う',apply(T,V){T.house='buy';T.buyAge=Math.max(Math.round(n(T.age)),Math.round(n(V.age)));T.price=n(V.price);T.down=n(V.down);T.rate=n(V.rate);T.term=n(V.term);if(!(n(T.rent)>0))T.rent=n(V.rent)||8}},
  rent2buy:{t:'この家を買ったあとの家計を確かめる',d:(V,R)=>`今の家賃と同じ負担で買える家（約${fmt(R.price)}万円）を買うパターンを、ライフプラン診断に追加して確かめられます。`,
    name:'家賃と同じ負担で買う',apply(T,V,R){T.house='buy';T.buyAge=Math.max(Math.round(n(T.age)),Math.round(n(V.age)));T.price=Math.round(R.price);T.down=n(V.down);T.rate=n(V.rate);T.term=R.term||n(V.term);if(!(n(T.rent)>0))T.rent=n(V.rent)||8}},
  zoyo:{t:'援助を受けたあとの家計を確かめる',d:(V,R)=>`親などから${fmt(n(V.amount))}万円の援助を受けるパターンを、ライフプラン診断に追加して確かめられます（贈与税の目安を引いた額で入れます）。`,
    name:'親から援助を受ける',apply(T,V,R){const tax=R.canHouse?Math.min(R.A,R.B,R.C):R.A;const age=planBuy(T)?Math.round(n(T.buyAge)):Math.round(n(T.age));
      T.events=(T.events||[]).concat([{name:'住宅資金などの贈与（贈与税の目安より）',age,amt:Math.max(0,Math.round(n(V.amount)-n(tax))),kind:'in'}])}}
};
Object.entries(TOLP).forEach(([k,o])=>{if(GDEF[k])GDEF[k].toLP=o});
function gtBridge(def,V,R){const o=def.toLP;return o?bridgeHTML(o.t,o.d(V,R),'gt2lp" data-id="'+def.id):''}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="gt2lp"]');if(!b)return;const def=GDEF[b.dataset.id];if(!def||!def.toLP)return;
  const V=gtState(def),R=def.calc(V);lpAddPattern(def.toLP.name,T=>def.toLP.apply(T,V,R))});

/* ライフプラン診断の「次に確かめること」：今のパターンの入力に合わせて、使うと役立つツールを最大4つ */
function nextHTML(S){
  const L=[];
  if(planBuy(S)){
    L.push(['loan','買う予算をもう一度確かめる',`${Math.round(n(S.buyAge))}歳で${fmt(n(S.price))}万円の家を買う計画です。返済の負担と、家計全体で見た上限を並べて、おすすめの予算を出します。`]);
    L.push(['koujo','住宅ローン控除で戻るお金',`借入${fmt(Math.max(0,n(S.price)-n(S.down)))}万円で、毎年いくら税金が戻るかの目安を計算します。`]);
    L.push(['zoyo','親からの援助を受けるなら','住宅資金の贈与の非課税枠と、贈与税の目安を計算します。']);
  }
  if(S.house==='own'&&n(S.loanPay)>0&&n(S.loanEnd)>n(S.age))L.push(['prepay','繰上げ返済で減る利息',`住宅ローンを${Math.round(n(S.loanEnd))}歳まで返す計画です。手元に余裕がある年に繰上げ返済すると、利息がいくら減るかを計算します。`]);
  if(S.house==='own'){L.push(['souba','今の家の相場を調べる','国の取引データから、町名ごとの売却相場の目安と、この10年の推移を確かめられます。']);
    if(n(S.loanPay)>0&&n(S.loanEnd)>n(S.age))L.push(['sell','今の家を売ったら手元にいくら残る','毎月の返済額と完済の年齢から逆算したローンの残りを入れて、売却・住み替えシミュレーターを開きます。'])}
  if(S.house==='rent')L.push(['rent2buy','今の家賃で買える家',`家賃${n(S.rent)}万円と同じ負担で、いくらの家が買えるかを計算します。`]);
  if(S.spouse==='yes'||(S.kids||[]).length)L.splice(Math.min(L.length,2),0,['hoshou','もしものときに必要な保障額',`${(S.kids||[]).length?'子ども'+(S.kids||[]).length+'人の教育費や':''}今の住まいから、家計を支える人が亡くなった場合に、遺族年金と貯蓄でどこまでまかなえるかを計算します。`]);
  if(n(S.inc)>0)L.push(['iryou','病気・けがで働けなくなったら',`入院や休職のときの医療費と収入の減り方を、高額療養費・傷病手当金を入れて計算し、貯蓄で足りるかを確かめます。`]);
  if(n(S.inc)>0)L.push(['furusato','ふるさと納税の上限','年収と家族から、自己負担2,000円ですむ上限の目安を出します。']);
  if(n(S.age)>=40)L.push(['souzoku','親の家・相続の準備','相続が起きる前に確かめておきたいことを、順番にチェックできます。']);
  const cards=L.slice(0,4).map(([id,t,d])=>{const T=TOOLS.find(x=>x.href==='#'+id);if(!T)return '';
    if(id==='sell')return `<a class="tool nextcard" href="#sell" data-act="lp2sell" data-k="${esc(U.plan in LP.plans?U.plan:'A')}"><span class="ic">${IC[T.ic]}</span><h3>${esc(t)}</h3><p>${esc(d)}</p><span class="go">ローンの残りを入れて開く →</span></a>`;
    return `<a class="tool nextcard" href="#${id}" data-lpsrc="${esc(U.plan in LP.plans?U.plan:'A')}" data-lpfresh="${id}"><span class="ic">${IC[T.ic]}</span><h3>${esc(t)}</h3><p>${esc(d)}</p><span class="go">${lpSrc()&&GDEF[id]&&GDEF[id].fromLP?'ライフプランの入力を引き継いで開く →':'使ってみる →'}</span></a>`}).join('');
  return cards?`<section class="chartcard nextbox"><h3 style="font-size:16px;margin:0 0 4px">次に確かめること</h3><p class="unit" style="margin:0 0 10px">今の入力（パターン${esc(U.plan in LP.plans?U.plan:'A')}）に合わせて、続けて使うと役立つツールです。</p><div class="tools">${cards}</div><p class="unit" style="margin:10px 0 0">使ったツールの結果は、<a href="#matome">わが家のまとめ</a>で1枚にまとめて印刷・PDFにできます。</p></section>`:'';
}
/* 「次に確かめること」から開くときは、そのパターンの入力で開き直す（前に開いたときの値が残っていても、ライフプランの値で入れ直す） */
document.addEventListener('click',e=>{const a=e.target.closest('[data-lpfresh]');if(!a)return;try{sessionStorage.setItem('sainomado-lp-src',a.dataset.lpsrc);sessionStorage.setItem('sainomado-lp-fresh',a.dataset.lpfresh)}catch(x){}},true);
