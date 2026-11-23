/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]'); if(!b) return;
  const a=b.dataset.act, S=LP.plans[U.plan];
  if(a==='plan'){U.plan=b.dataset.p;U.cf=b.dataset.p;vLife(document.getElementById('view'))}
  else if(a==='addplan'){const k=PK.find(x=>!LP.plans[x]);if(!k)return;LP.plans[k]=JSON.parse(JSON.stringify(S));LP.names[k]=k==='B'?'比べたい案':'もう一つの案';U.plan=k;U.cf=k;changed();vLife(document.getElementById('view'));toast('パターン'+k+'を作りました。変えたいところだけ書き換えてください');const p=document.getElementById('pname');if(p){p.focus();p.select()}}
  else if(a==='delplan'){delete LP.plans[U.plan];delete LP.names[U.plan];U.plan='A';U.cf='A';changed();vLife(document.getElementById('view'))}
  else if(a==='clear'){lpReplace(blankLP(),'入力を空にしました')}
  else if(a==='cf'){U.cf=b.dataset.p;renderResult()}
  else if(a==='acat'){U.acat=b.dataset.c;vArticles(document.getElementById('view'))}
  else if(a==='pdf'){printReport()}
  else if(a==='xlsx'){exportExcel()}
  else if(a==='mode2'){if(b.dataset.m==='guide'&&LP.example){const nx=blankLP();nx.mode='guide';nx.wz=0;lpReplace(nx,'入力例を消して、質問をはじめます');return}LP.mode=b.dataset.m;saveLP();vLife(document.getElementById('view'));if(b.dataset.m==='guide'){const w=document.getElementById('wz');if(w)w.scrollIntoView({block:'start'})}}
  else if(a==='rtab'){U.rtab=b.dataset.t;renderResult()}
  else if(a==='lever'){const L=LEVERS[b.dataset.k];const k=PK.find(x=>!LP.plans[x]);if(!k)return;const T=clone(LP.plans[U.plan]);L.apply(T,+b.dataset.x);LP.plans[k]=T;LP.names[k]=L.t;U.plan=k;U.cf=k;U.rtab='overview';changed();vLife(document.getElementById('view'));toast('パターン'+k+'「'+L.t+'」を作りました')}
  else if(a==='reflect'){const key=U.plan in LP.plans?U.plan:'A';reflect(key,U.yjy);vLife(document.getElementById('view'));const r=document.getElementById('result');if(r)r.scrollIntoView()}
  else if(a==='savebudget'){const ks=keys();const key=U.plan in LP.plans?U.plan:'A';saveBudget({S:LP.plans[key],key});renderResult()}
  else if(a==='step'){U.step=+b.dataset.s;renderResult()}
  else if(a==='toresult'){document.getElementById('result').scrollIntoView({behavior:'smooth'})}
  else if(a==='addkid'){S.kids.push({by:Y0+1,kg:'pri',sch:'pub',uni:'pub',away:false});changed();vLife(document.getElementById('view'))}
  else if(a==='delkid'){S.kids.splice(+b.dataset.i,1);changed();vLife(document.getElementById('view'))}
  else if(a==='addprop'){S.props.push(newProp(S));changed();vLife(document.getElementById('view'))}
  else if(a==='delprop'){S.props.splice(+b.dataset.i,1);changed();vLife(document.getElementById('view'))}
  else if(a==='addev'){S.events.push({name:'',age:Math.round(n(S.age))+5,amt:100,kind:'out'});changed();vLife(document.getElementById('view'))}
  else if(a==='addoth'){S.assets.others.push(newOther('gold'));changed();vLife(document.getElementById('view'))}
  else if(a==='deloth'){S.assets.others.splice(+b.dataset.i,1);changed();vLife(document.getElementById('view'))}
  else if(a==='pcset'){const v=penEst();const k=U.pc.who==='sp'?'spen':'pen';const el=document.getElementById('f_'+k);if(el){el.value=v.take;el.dispatchEvent(new Event('input',{bubbles:true}))}toast((U.pc.who==='sp'?'配偶者':'ご本人')+'の年金に月'+v.take+'万円を入れました')}
  else if(a==='pcfill'){penFill(b.dataset.w)}
  else if(a==='sell2lp'){const s=sellCalc(SV,n(SV.price));lpAddPattern(SV.plan==='buy'?'売って住み替える':'家を売る',T=>{const age=Math.round(n(T.age));T.events=(T.events||[]).concat([{name:'自宅の売却（売却シミュレーターより）',age,amt:Math.round(Math.abs(s.net)),kind:s.net>=0?'in':'out'}]);if(SV.plan==='buy'){T.house='buy';T.buyAge=age;T.price=n(SV.newPrice);T.down=Math.max(0,Math.round(s.net))+n(SV.cash);T.rate=n(SV.rate);T.term=n(SV.term)}else{T.house='rent';if(!(n(T.rent)>0))T.rent=8}})}
  else if(a==='loan2lp'){const V=gtState(LOANDEF),R=LOANDEF.calc(V);lpAddPattern('この予算で家を買う',T=>{T.house='buy';T.buyAge=Math.max(Math.round(n(T.age)),Math.round(n(V.age)));T.price=Math.round(R.priceOk);T.down=n(V.down);T.rate=n(V.rate);T.term=R.term||n(V.term);if(!(n(T.rent)>0))T.rent=8})}
  else if(a==='akiya2lp'){const V=gtState(AKIYADEF),R=AKIYADEF.calc(V);lpAddPattern('相続した家を売る',T=>{T.events=(T.events||[]).concat([{name:'相続した家の売却（空き家の診断より）',age:Math.round(n(T.age)),amt:Math.max(0,Math.round(R.sellNet)),kind:'in'}])})}
  else if(a==='svset'){const v=Math.floor(retireTax(U.sv.gross,U.sv.yrs).net);const k=U.sv.who==='sp'?'ssev':'sev';const el=document.getElementById('f_'+k);if(el){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))}toast((U.sv.who==='sp'?'配偶者':'ご本人')+'の退職金に'+v.toLocaleString('ja-JP')+'万円を入れました')}
  else if(a==='nextempty'){nextEmpty()}
  else if(a==='addins'){if(!insOn(S)){S.insl=n(S.ins)>0?[{name:'',who:'self',mon:n(S.ins),end:n(S.insEnd)||60}]:[]}S.insl.push({name:'',who:S.spouse==='yes'&&S.insl.length?'sp':'self',mon:1,end:60});changed();vLife(document.getElementById('view'));toast(S.insl.length===2&&n(S.ins)>0?'今の保険料を1件目に入れました。2件目を入力してください':'保険を追加しました')}
  else if(a==='delins'){S.insl.splice(+b.dataset.i,1);changed();vLife(document.getElementById('view'))}
  else if(a==='delev'){S.events.splice(+b.dataset.i,1);changed();vLife(document.getElementById('view'))}
});
document.addEventListener('input',e=>{
  const t=e.target, S=LP.plans[U.plan];
  if(t.dataset.goal){LP.goal=LP.goal||{type:'fin95',target:1000};LP.goal[t.dataset.goal]=t.dataset.goal==='type'?t.value:parseFloat(t.value);saveLP();clearTimeout(rT);rT=setTimeout(()=>{const f=document.activeElement&&document.activeElement.id;renderResult();if(f){const x=document.getElementById(f);if(x)x.focus()}},400);return}
  if(t.dataset.yjy){U.yjy=+t.value;renderResult();return}
  if(t.dataset.yj){LP.actuals=LP.actuals||{};const y=U.yjy;LP.actuals[y]=LP.actuals[y]||{};LP.actuals[y][t.dataset.yj]=t.value===''?'':parseFloat(t.value);saveLP();clearTimeout(rT);rT=setTimeout(()=>{const f=document.activeElement&&document.activeElement.id;renderResult();if(f){const x=document.getElementById(f);if(x){x.focus();try{x.setSelectionRange(x.value.length,x.value.length)}catch(err){}}}},600);return}
  if(t.dataset.sv){U.sv[t.dataset.sv]=t.tagName==='SELECT'?t.value:t.value;const o=document.getElementById('svout');if(o)o.innerHTML=sevOut();return}
  if(t.dataset.pc){U.pc[t.dataset.pc]=t.tagName==='SELECT'?t.value:t.value;if(t.dataset.pc==='work'){document.querySelectorAll('[data-pcemp]').forEach(x=>x.hidden=t.value!=='emp');if(t.value==='dep'&&n(U.pc.nen)<1){U.pc.nen=40}}const o=document.getElementById('pcout');if(o)o.innerHTML=penOut();return}
  if(S&&applyAssetInput(S,t)){changed();return}
  if(t.dataset.k){const f=ALLF.find(x=>x.id===t.dataset.k);S[t.dataset.k]=f&&f.type==='sel'?t.value:(t.value===''?'':parseFloat(t.value));syncVis(S);changed()}
  else if(t.dataset.kid!=null){const k=S.kids[+t.dataset.kid],kk=t.dataset.kk;k[kk]=kk==='away'?t.checked:(kk==='by'?parseFloat(t.value):t.value);changed()}
  else if(t.dataset.il!=null){const x=S.insl[+t.dataset.il],k=t.dataset.ik;x[k]=(k==='name'||k==='who')?t.value:(t.value===''?'':parseFloat(t.value));changed()}
  else if(t.dataset.ev!=null){const ev=S.events[+t.dataset.ev],ek=t.dataset.ek;ev[ek]=(ek==='age'||ek==='amt')?parseFloat(t.value):t.value;changed()}
  else if(t.dataset.pname){LP.names[U.plan]=t.value;saveLP();document.querySelectorAll('.seg [data-act="plan"]').forEach(btn=>{if(btn.dataset.p===U.plan)btn.lastChild.textContent=U.plan+'：'+t.value});clearTimeout(rT);rT=setTimeout(renderResult,300)}
});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.kid!=null&&t.dataset.kk==='away'){LP.plans[U.plan].kids[+t.dataset.kid].away=t.checked;changed()}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="toc"]');if(!b)return;const el=document.getElementById(b.dataset.to);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})});
/* 言葉で選ぶボタン（押すと入力欄に数字が入る） */
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="pre"]');if(!b)return;e.preventDefault();const el=document.getElementById(b.dataset.for);if(!el)return;el.value=b.dataset.v;el.dispatchEvent(new Event('input',{bubbles:true}))});
document.addEventListener('input',e=>{const t=e.target;if(!t.id)return;document.querySelectorAll(`[data-act="pre"][data-for="${t.id}"]`).forEach(b=>b.setAttribute('aria-pressed',String(t.value!==''&&+t.value===+b.dataset.v)))});
go();loadShared().then(ok=>{if(ok){go();toast('共有された結果を表示しています')}});

