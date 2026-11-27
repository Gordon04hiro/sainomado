/* ---------- ライフプラン診断：質問に答えて入力（はじめての方向け） ----------
   1問ずつ聞いて、答えをそのまま診断の入力欄（LP.plans[...]）に入れていく。
   入力欄は data-k（ふつうの項目）・data-a/data-ak（資産）を使うので、計算と保存はふだんの入力と同じ仕組みで動く。 */
const wzSp=S=>S.spouse==='yes';
const wzNum=(k,u,l,h,st)=>`<label class="fld"><span class="lab">${l||''}</span><span class="inp"><input id="w_${k}" data-k="${k}" type="number" inputmode="decimal" step="${st||1}" value="${esc(LP.plans[U.plan][k])}"><span class="u">${u}</span></span>${h?`<span class="hint">${h}</span>`:''}</label>`;
const wzAcc=(a,k,u,l,h,st)=>`<label class="fld"><span class="lab">${l}</span><span class="inp"><input id="w_a_${a}_${k}" data-a="${a}" data-ak="${k}" type="number" inputmode="decimal" step="${st||1}" value="${esc(LP.plans[U.plan].assets[a][k])}"><span class="u">${u}</span></span>${h?`<span class="hint">${h}</span>`:''}</label>`;
const wzChoice=(k,opts,cur)=>`<div class="wzc" role="group">${opts.map(([v,l,s])=>`<button type="button" class="wzb" data-act="wzset" data-k="${k}" data-v="${v}" aria-pressed="${String(cur)===String(v)}"><b>${l}</b>${s?`<small>${s}</small>`:''}</button>`).join('')}</div>`;
const wzIns=(who)=>{const S=LP.plans[U.plan];const x=(S.insl||[]).find(i=>(i.who||'self')===who)||{};return x};
/* 退職金（額面→手取り）の入力用 */
const WZSV={gross:'',yrs:''};

/* 子ども1人ぶん：生まれ年と進路。選ぶと、これからかかる教育費の目安を出す */
function eduLeft(c){const now=Math.max(0,Y0-n(c.by));let t=0;for(let k=Math.max(3,now);k<=21;k++)t+=eduCost(k,c);return Math.round(t/10)*10}
function wzKid(c,i){const sl=(k,o)=>`<select id="w_k${i}_${k}" data-kid="${i}" data-kk="${k}" data-wzre="1">${o.map(x=>`<option value="${x[0]}"${c[k]===x[0]?' selected':''}>${x[1]}</option>`).join('')}</select>`;
  return `<div class="wzkid"><b>第${i+1}子</b><div class="fields">
   <label class="fld"><span class="lab">生まれ年</span><span class="inp"><input id="w_k${i}_by" data-kid="${i}" data-kk="by" type="number" inputmode="numeric" value="${esc(c.by)}"><span class="u">年</span></span></label>
   <label class="fld"><span class="lab">小・中・高</span>${sl('sch',[['pub','すべて公立'],['pri_hs','高校から私立'],['pri_jh','中学から私立'],['pri_all','小学校から私立']])}</label>
   <label class="fld"><span class="lab">大学</span>${sl('uni',[['pub','国公立'],['pri_b','私立文系'],['pri_r','私立理系'],['none','進学しない']])}</label>
   <label class="chk"${c.uni==='none'?' hidden':''}><input type="checkbox" data-kid="${i}" data-kk="away" data-wzre="1"${c.away?' checked':''}> 大学は一人暮らし</label></div>
   <p class="unit wzedu" id="w_k${i}_edu">これからかかる教育費の目安：<b>約${fmt(eduLeft(c))}万円</b>（今の物価で。${Y0-n(c.by)>21?'もう卒業の年齢です':'幼稚園〜大学の残りの合計'}）</p></div>`}
/* この計算の前提（質問に答えて入力では聞いていない数字も、ここで見える化する） */
const EDUL={sch:{pub:'小中高は公立',pri_hs:'高校から私立',pri_jh:'中学から私立',pri_all:'小学校から私立'},uni:{pub:'大学は国公立',pri_b:'大学は私立文系',pri_r:'大学は私立理系',none:'大学には進学しない'}};
function lpAssumeHTML(S,open,noBtn){
  const pct=v=>(Math.round(n(v)*10)/10).toLocaleString('ja-JP')+'%',sp=S.spouse==='yes',A=S.assets||{};
  const rows=[
   ['計算する期間','あなたが95歳になる年まで'],
   ['物価の上がり方',`年${pct(S.infl)}（生活費・教育費が毎年この割合で上がる）`],
   ['給料の上がり方',`年${pct(S.raise)}${sp?`（配偶者 年${pct(S.sraise)}）`:''}`],
   ['退職後の生活費',`今の生活費の${fmt(n(S.retRatio))}%`],
   ['年金',`${fmt(n(S.penAge))}歳から${sp?`（配偶者 ${fmt(n(S.spenAge))}歳から）`:''}・物価に合わせて年${pct(S.penRev)}ずつ増える`],
   ['教育費',S.kids&&S.kids.length?S.kids.map((c,i)=>`第${i+1}子：${c.kg==='pub'?'幼稚園は公立':'幼稚園は私立'}・${EDUL.sch[c.sch]||''}・${EDUL.uni[c.uni]||''}${c.away&&c.uni!=='none'?'（一人暮らし）':''}`).join('<br>'):'お子さまなし'],
   ['住まい',S.house==='rent'?`家賃 月${fmt(n(S.rent))}万円を、95歳まで払い続ける`:S.house==='own'?`ローン返済 月${fmt(n(S.loanPay))}万円を${fmt(n(S.loanEnd))}歳まで・固定資産税や修繕 年${fmt(n(S.hcost))}万円`:`${fmt(n(S.buyAge))}歳で${n(S.price)>0?fmt(n(S.price))+'万円の':''}家を買う（金利${pct(S.rate)}・${fmt(n(S.term))}年返済）・買ったあとの固定資産税や修繕 年${fmt(n(S.hcost))}万円・買うまでは家賃 月${fmt(n(S.rent))}万円`],
   ['車',carOn(S)?`${fmt(n(S.carEvery))}年ごとに${fmt(n(S.car))}万円で買い替え（${fmt(n(S.carLast))}歳まで）`:'車の買い替えは入れていない'],
   ['お金の増え方',`預貯金 年${pct(A.cash&&A.cash.rate)}・NISA 年${pct(A.nisa&&A.nisa.rate)}・iDeCo 年${pct(A.ideco&&A.ideco.rate)}（残高や積立があるときだけ）`],
   ['入っていないもの','税金・社会保険料（手取りで計算するため）、住宅ローン控除、介護や大きな病気などの予定外の出費']];
  return `<details class="assume"${open?' open':''}><summary>この計算の前提</summary><div class="body"><dl>${rows.map(r=>`<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl>
   <p class="unit" style="margin:8px 0 0">どれも「くわしく入力」で変えられます。旅行・リフォーム・車・お子さまの進路などの予定を足すと、より実際に近くなります。</p>${LP.mode!=='detail'&&!noBtn?`<button type="button" class="btn small" data-act="mode2" data-m="detail">くわしく入力で変える</button>`:''}</div></details>`;
}
const WZ=[
 {id:'age',t:'あなたの年齢を教えてください',h:'今年の誕生日を迎えた時点の年齢です。',body:S=>`<div class="fields">${wzNum('age','歳','あなたの年齢')}</div>`},
 {id:'spouse',t:'配偶者（夫・妻）はいますか？',h:'結婚の予定がある場合は「いる」にして、お相手の年齢を入れてください。',
  body:S=>wzChoice('spouse',[['yes','いる'],['no','いない']],S.spouse)+(wzSp(S)?`<div class="fields" style="margin-top:12px">${wzNum('sage','歳','配偶者の年齢')}</div>`:'')},
 {id:'kids',t:'お子さまはいますか？',h:'これから生まれる予定のお子さまも入れてください（生まれ年は予定の西暦で）。進路を選ぶと、その教育費で計算します。決まっていなければ、そのまま（小中高は公立・大学は国公立）で大丈夫です。',
  body:S=>wzChoice('wkids',[[0,'いない'],[1,'1人'],[2,'2人'],[3,'3人'],[4,'4人']],S.kids.length)+(S.kids.length?`<div class="wzkids">${S.kids.map((c,i)=>wzKid(c,i)).join('')}</div><p class="unit" style="margin:8px 0 0">教育費は、文部科学省「子供の学習費調査」などの平均です（幼稚園・保育園は私立で計算。「くわしく入力」で変えられます）。</p>`:'')},
 {id:'work',t:'あなたの働き方は？',body:S=>wzChoice('wwork',[['emp','会社員・公務員'],['self','自営業・フリーランス'],['exec','会社の役員'],['none','働いていない']],S.wwork)},
 {id:'inc',show:S=>S.wwork!=='none',t:'あなたの手取りの年収は？',h:'会社員なら、源泉徴収票の「支払金額」が額面（税金などを引く前）です。手取りはその約8割が目安。自営業・役員なら、売上や報酬から経費・税金・社会保険料を引いて、手元に残る額です。',
  body:S=>`<div class="fields">${wzNum('inc','万円/年','手取りの年収')}<label class="fld"><span class="lab">額面しかわからないとき</span><span class="inp"><input id="w_gross_inc" data-wgross="inc" type="number" inputmode="decimal" placeholder="額面を入力"><span class="u">万円/年</span></span><span class="hint">入れると、その約8割（0.78倍）を「手取りの年収」に入れます</span></label></div>`},
 {id:'retire',show:S=>S.wwork!=='none',t:'何歳まで働く予定ですか？',
  body:S=>S.wwork==='emp'
   ?`<p class="wzq">定年の年齢</p>${wzChoice('ret',[[60,'60歳'],[65,'65歳'],[70,'70歳']],S.ret)}<p class="wzq">定年のあとは？</p>${wzChoice('wafter',[['65','65歳まで再雇用などで働く'],['70','70歳まで働く'],['0','定年で仕事を辞める']],S.wafter)}${S.wafter&&S.wafter!=='0'?`<div class="fields" style="margin-top:12px">${wzNum('reinc','万円/年','定年後の手取り年収','再雇用では、定年前の6割前後になることが多いです')}</div>`:''}`
   :`<div class="fields">${wzNum('workEnd','歳','仕事を辞める年齢','自営業・役員は定年がないので、引退する予定の年齢を')}</div>`},
 {id:'sev',show:S=>S.wwork==='emp'||S.wwork==='exec',t:'退職金はもらえそうですか？',h:'会社の退職金規程や、人事・総務で確認できます。わからなければ「ない・わからない」で大丈夫です（少なめに見積もる方が安心です）。',
  body:S=>wzChoice('wsev',[['no','ない・わからない'],['yes','ある']],S.wsev)+(S.wsev==='yes'?`<div class="fields" style="margin-top:12px"><label class="fld"><span class="lab">退職金の額面</span><span class="inp"><input id="w_sv_gross" data-wsv="gross" type="number" inputmode="decimal" value="${esc(WZSV.gross)}"><span class="u">万円</span></span></label><label class="fld"><span class="lab">退職するときの勤続年数</span><span class="inp"><input id="w_sv_yrs" data-wsv="yrs" type="number" inputmode="numeric" value="${esc(WZSV.yrs||Math.max(1,Math.round(n(S.ret)-22)))}"><span class="u">年</span></span></label></div><p class="unit" id="wzsvout" style="margin:8px 0 0">${wzSevText(S)}</p>`:'')},
 {id:'swork',show:wzSp,t:'配偶者の働き方は？',body:S=>wzChoice('swwork',[['emp','会社員・公務員'],['part','パート・アルバイト'],['self','自営業・フリーランス'],['none','働いていない','専業主婦・主夫']],S.swwork)},
 {id:'sinc',show:S=>wzSp(S)&&S.swwork&&S.swwork!=='none',t:'配偶者の手取りの年収と、働く年齢は？',h:'パートなら、月の手取り×12が目安です。',
  body:S=>`<div class="fields">${wzNum('sinc','万円/年','配偶者の手取り年収')}${S.swwork==='emp'?wzNum('sret','歳','配偶者の定年の年齢'):''}${wzNum('sworkEnd','歳','配偶者が仕事を辞める年齢')}${S.swwork==='emp'?wzNum('sreinc','万円/年','定年後の手取り年収','再雇用・パートなど。定年で辞めるなら0'):''}</div>`},
 {id:'house',t:'住まいはどうしていますか？',
  body:S=>wzChoice('house',[['rent','賃貸'],['own','持ち家'],['buy','これから家を買う']],S.house)+`<div class="fields" style="margin-top:12px">${S.house==='own'?wzNum('loanPay','万円/月','住宅ローンの返済（月）','完済していれば0。ボーナス払いがあれば、年間の合計÷12')+wzNum('loanEnd','歳','返済が終わる年齢'):wzNum('rent','万円/月',S.house==='buy'?'買うまでの家賃（月）':'家賃（月）','管理費・駐車場代も含めて')}${S.house==='buy'?wzNum('buyAge','歳','買う年齢')+wzNum('price','万円','物件価格の予定')+wzNum('down','万円','頭金'):''}</div>`},
 {id:'live',t:'毎月の生活費はどれくらいですか？',h:'食費・光熱費・通信費・日用品・お小遣いなどの合計です。家賃・住宅ローン・保険料は入れません。わからなければ「手取りの月収 − 貯金 − 家賃（ローン） − 保険料」が目安です。',
  body:S=>`<div class="fields">${wzNum('live','万円/月','生活費（月）')}</div>`},
 {id:'ins',t:'保険料はいくら払っていますか？',h:'生命保険・医療保険・がん保険・積立型の保険などの合計です。保険証券や「ご契約内容のお知らせ」、口座やカードの引き落としで確認できます。年払いなら12で割った額を。',
  body:S=>{const a=wzIns('self'),b=wzIns('sp');const F=(w,k,l,u,v,h)=>`<label class="fld"><span class="lab">${l}</span><span class="inp"><input id="w_ins_${w}_${k}" data-wins="${w}" data-wk="${k}" type="number" inputmode="decimal" step="${k==='mon'?.1:1}" value="${esc(v==null?'':v)}"><span class="u">${u}</span></span>${h?`<span class="hint">${h}</span>`:''}</label>`;
   return `<div class="pairrow"><div class="plab">保険料（月）と払い終える年齢</div><div class="pcols${wzSp(S)?'':' one'}"><div>${F('self','mon','あなた','万円/月',a.mon)}${F('self','end','払い終える年齢','歳',a.end==null?60:a.end,'終身払いなら90など')}</div>${wzSp(S)?`<div>${F('sp','mon','配偶者','万円/月',b.mon)}${F('sp','end','払い終える年齢','歳',b.end==null?60:b.end,'配偶者の年齢で')}</div>`:''}</div></div>${(S.insl||[]).length>2?`<p class="unit" style="margin:8px 0 0">「くわしく入力」で入れた保険が${S.insl.length}件あります。ここでは1件目だけを直します。</p>`:''}`}},
 {id:'cash',t:'今の預貯金はいくらありますか？',h:'普通預金・定期預金などの合計です（夫婦の分を合わせて）。',body:S=>`<div class="fields">${wzAcc('cash','bal','万円','預貯金')}</div>`},
 {id:'inv',t:'NISA・iDeCoなどで、投資や積立をしていますか？',h:'証券会社のアプリやサイトで、今の残高と毎月の積立額を確認できます。していなければ0のままで大丈夫です。',
  body:S=>{const col=(p,l)=>`<div><p class="wzq" style="margin-top:0">${l}</p><div class="fields">${wzAcc(p+'nisa','bal','万円','NISAの残高')}${wzAcc(p+'nisa','mon','万円/月','NISAの積立（月）','',.1)}${wzAcc(p+'ideco','bal','万円','iDeCoの残高')}${wzAcc(p+'ideco','mon','万円/月','iDeCoの掛金（月）','',.1)}</div></div>`;
   return `<div class="wzcols">${col('','あなた')}${wzSp(S)?col('s','配偶者'):''}</div><p class="unit" style="margin:8px 0 0">株や投資信託（NISA以外）、小規模企業共済などは「くわしく入力」で入れられます。</p>`}},
 {id:'pen',t:'年金の見込みを入れましょう',h:'「ねんきん定期便」（毎年、誕生月に届くハガキ）や「ねんきんネット」で確認できます。ねんきん定期便のQRコードを、厚生労働省の「公的年金シミュレーター」で読み込むと、これからの働き方も入れて試算できます。手元になければ、ここまでの答えから出した目安を使ってください。',
  body:S=>{const e=wzPenEst(S);return `<div class="pcres" style="margin-bottom:12px"><span>ここまでの答えから出した目安（手取り）</span><b>あなた 月約${e.self}<small>万円</small>${wzSp(S)?`　配偶者 月約${e.sp}<small>万円</small>`:''}</b><span class="unit">今の働き方を続けた場合の、ざっくりした目安です。</span><div class="macts" style="margin-top:8px"><button class="btn small primary" data-act="wzpen">この目安を入れる</button></div></div>
   <div class="fields">${wzNum('pen','万円/月','あなたの年金（手取り・月）','ねんきん定期便の年額 ÷12 × 0.9 が目安')}${wzSp(S)?wzNum('spen','万円/月','配偶者の年金（手取り・月）'):''}</div>`}},
 {id:'done',t:'おつかれさまでした！',h:'答えた内容で、95歳までのお金の流れを計算しました。下の結果を見てみましょう。数字はあとからいつでも直せます。',
  body:S=>lpAssumeHTML(S,true,true)+`<div class="macts" style="margin-top:12px"><button class="btn primary" data-act="toresult">結果を見る</button><button class="btn" data-act="mode2" data-m="detail">くわしく入力で見直す</button></div><p class="unit" style="margin:10px 0 0">「くわしく入力」では、車の買い替え、物価上昇率、運用の利回り、旅行やリフォームなどの予定も入れられます。</p>`}
];
const wzSteps=S=>WZ.filter(s=>!s.show||s.show(S));
function wzSevText(S){const g=n(WZSV.gross);if(!(g>0))return '額面を入れると、税金を引いた手取りの目安を退職金として入れます。';const r=retireTax(g,WZSV.yrs||Math.max(1,Math.round(n(S.ret)-22)));return `手取りの目安：約${fmt(Math.floor(r.net))}万円（税金 約${(Math.round(r.tax*10)/10).toLocaleString('ja-JP')}万円）を退職金として入れました。`}
function wzPenEst(S){
  const keep=U.pc, end=w=>Math.min(65,w);
  const one=(work,net,age,workEnd)=>{
    const w=work==='emp'||work==='exec'?'emp':(work==='self'||work==='none'?'self':'dep');
    U.pc={who:'self',work:w,nen:40,yrs:Math.max(0,Math.min(43,Math.round(end(n(workEnd)||65)-22))),inc:Math.round(n(net)/0.78*0.9)};
    const v=penEst();return v.take};
  const r={self:one(S.wwork||'emp',S.inc,S.age,S.workEnd),sp:wzSp(S)?one(S.swwork==='emp'?'emp':(S.swwork==='self'?'self':'dep'),S.sinc,S.sage,S.sworkEnd):0};
  U.pc=keep;return r;
}
function guideHTML(S){
  const st=wzSteps(S);LP.wz=Math.min(Math.max(0,LP.wz||0),st.length-1);const s=st[LP.wz];
  if(s.id==='done'&&!LP.wzDone){LP.wzDone=true;saveLP();setTimeout(()=>{const r=document.getElementById('result');if(r)r.hidden=false;updateDock()},0)}
  return `<section class="wz" id="wz" aria-live="polite"><div class="wzhead"><span>質問 ${LP.wz+1} / ${st.length}</span><div class="wzbar"><i style="width:${((LP.wz+1)/st.length*100).toFixed(1)}%"></i></div></div>
   <h2>${esc(s.t)}</h2>${s.h?`<p class="wzh">${esc(s.h)}</p>`:''}<div class="wzbody">${s.body(S)}</div>
   <div class="wznav">${LP.wz>0?'<button class="btn" data-act="wzprev">← 戻る</button>':'<span></span>'}${s.id!=='done'?`<button class="btn primary" data-act="wznext">次へ →</button>`:''}</div></section>`;
}
function wzRender(focus){const S=LP.plans[U.plan],el=document.getElementById('wz');if(!el)return;el.outerHTML=guideHTML(S);if(focus){const w=document.getElementById('wz');w.scrollIntoView({block:'start',behavior:'smooth'});const i=w.querySelector('input');if(i&&focus==='input')try{i.focus({preventScroll:true})}catch(e){}}}
function wzSet(S,k,v){
  if(k==='spouse'){S.spouse=v;syncVis(S)}
  else if(k==='wkids'){const c=+v;while(S.kids.length>c)S.kids.pop();while(S.kids.length<c)S.kids.push({by:Y0-(S.kids.length?0:0),kg:'pri',sch:'pub',uni:'pub',away:false})}
  else if(k==='wwork'){S.wwork=v;
    if(v==='none'){S.inc=0;S.sev=0;S.reinc=0;S.ret=Math.round(n(S.age));S.workEnd=Math.round(n(S.age))}
    else if(v==='self'||v==='exec'){S.workEnd=n(S.workEnd)>n(S.age)?S.workEnd:70;S.ret=S.workEnd;S.reinc=0;if(v==='self')S.sev=0}}
  else if(k==='ret'){S.ret=+v;if(S.wafter==='0')S.workEnd=+v;else if(S.wafter)S.workEnd=Math.max(+v,+S.wafter)}
  else if(k==='wafter'){S.wafter=v;if(v==='0'){S.workEnd=n(S.ret);S.reinc=0}else{S.workEnd=Math.max(n(S.ret),+v);if(!(n(S.reinc)>0))S.reinc=Math.round(n(S.inc)*0.6)}}
  else if(k==='wsev'){S.wsev=v;if(v==='no')S.sev=0}
  else if(k==='swwork'){S.swwork=v;
    if(v==='none'){S.sinc=0;S.sreinc=0;S.ssev=0;S.sworkEnd=Math.round(n(S.sage));S.sret=S.sworkEnd}
    else if(v==='emp'){if(!(n(S.sret)>n(S.sage)))S.sret=60;if(!(n(S.sworkEnd)>n(S.sage)))S.sworkEnd=65}
    else{if(!(n(S.sworkEnd)>n(S.sage)))S.sworkEnd=65;S.sret=S.sworkEnd;S.sreinc=0;S.ssev=0}}
  else if(k==='house'){S.house=v;syncVis(S)}
  else S[k]=v;
}
function wzInsSet(S,who,k,v){
  if(!insOn(S)){S.insl=n(S.ins)>0?[{name:'ご本人の保険',who:'self',mon:n(S.ins),end:n(S.insEnd)||60}]:[]}
  let x=S.insl.find(i=>(i.who||'self')===who);
  if(!x){x={name:who==='sp'?'配偶者の保険':'ご本人の保険',who,mon:0,end:60};S.insl.push(x)}
  x[k]=v===''?'':parseFloat(v);
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;if(!/^wz/.test(a))return;
  const S=LP.plans[U.plan];
  if(a==='wzset'){wzSet(S,b.dataset.k,b.dataset.v);changed();wzRender()}
  else if(a==='wznext'){LP.wz=(LP.wz||0)+1;saveLP();wzRender('input')}
  else if(a==='wzprev'){LP.wz=Math.max(0,(LP.wz||0)-1);saveLP();wzRender('input')}
  else if(a==='wzpen'){const r=wzPenEst(S);S.pen=r.self;if(wzSp(S))S.spen=r.sp;changed();wzRender();toast('年金の目安を入れました')}
});
document.addEventListener('input',e=>{
  const t=e.target,S=LP.plans[U.plan];if(!S)return;
  if(t.dataset.wgross){const v=parseFloat(t.value);if(v>0){S[t.dataset.wgross]=Math.round(v*0.78);const o=document.getElementById('w_'+t.dataset.wgross);if(o)o.value=S[t.dataset.wgross];changed()}}
  else if(t.dataset.wsv){WZSV[t.dataset.wsv]=t.value;const g=n(WZSV.gross);if(g>0){S.sev=Math.floor(retireTax(g,WZSV.yrs||Math.max(1,Math.round(n(S.ret)-22))).net);changed()}const o=document.getElementById('wzsvout');if(o)o.textContent=wzSevText(S)}
  else if(t.dataset.wins){wzInsSet(S,t.dataset.wins,t.dataset.wk,t.value);changed()}
  else if(t.closest&&t.closest('#wz')&&t.dataset.k){const v=parseFloat(t.value);
    if(t.dataset.k==='workEnd'&&(S.wwork==='self'||S.wwork==='exec')&&v>0)S.ret=v;
    if(t.dataset.k==='sworkEnd'&&S.swwork&&S.swwork!=='emp'&&v>0)S.sret=v}
});
/* 進路を変えたら、教育費の目安を出し直す（選んだ値は 90-events.js の入力処理で保存される） */
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.wzre&&t.closest('#wz'))setTimeout(()=>wzRender(),0)});
document.addEventListener('input',e=>{const t=e.target;if(t.dataset&&t.dataset.kk==='by'&&t.closest&&t.closest('#wz'))setTimeout(()=>{const i=+t.dataset.kid,c=LP.plans[U.plan].kids[i],o=document.getElementById('w_k'+i+'_edu');if(c&&o)o.innerHTML=`これからかかる教育費の目安：<b>約${fmt(eduLeft(c))}万円</b>（今の物価で。${Y0-n(c.by)>21?'もう卒業の年齢です':'幼稚園〜大学の残りの合計'}）`},0)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.closest&&e.target.closest('#wz')&&e.target.tagName==='INPUT'){e.preventDefault();const nb=document.querySelector('#wz [data-act="wznext"]');if(nb)nb.click()}});

/* 質問の途中は、結果と下の帯を「答え終わると出ます」にする（入力途中の数字で驚かせないため） */
const wzHold=()=>LP.mode==='guide'&&!LP.wzDone;
