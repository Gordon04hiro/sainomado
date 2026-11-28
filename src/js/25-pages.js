/* ---------- 記事・お知らせ・データ ---------- */
const pubArticles=()=>ARTICLES.filter(a=>!a.sub).sort((a,b)=>b.date.localeCompare(a.date));
const toolName=h=>{const t=TOOLS.find(x=>x.href===h);return t?t.t:''};
function artCard(a){return `<a class="tool art" href="#a-${a.slug}">${illust(a,true)}<span class="chip muted" style="justify-self:start">${esc(a.cat)}</span><h3>${esc(a.title)}${a.draft?' <span class="chip warn">下書き</span>':''}</h3><p>${esc(a.lead)}</p><span class="unit">${jd(a.date)}</span></a>`}
/* ---------- テーマごとのまとめページ（ガイド） ---------- */
const hubOf=cat=>HUBS.find(h=>h.cat===cat);
function hubCard(h){return `<a class="tool art hubcard" href="#g-${h.slug}">${illust({title:h.title,cat:h.cat,il:h.il},true)}<h3>${esc(h.title)}</h3><p>${esc(h.lead)}</p><span class="unit">${h.steps.length}つのステップ →</span></a>`}
function vHub(v,slug){
  const h=HUBS.find(x=>x.slug===slug);if(!h){v404(v);return}
  document.title=h.stitle+'｜サイのまど';
  const art=s=>ARTICLES.find(a=>a.slug===s&&!a.draft);
  v.innerHTML=`<div class="wrap doc art-doc hub"><div class="crumb"><a href="#home">サイのまど</a> › ${esc(h.title)}</div>
   ${illust({title:h.title,cat:h.cat,il:h.il})}<h1>${esc(h.title)}</h1><p class="lead">${esc(h.lead)}</p>${h.body.length?`<div class="hubbody">${h.body.map(t=>`<p>${esc(t)}</p>`).join('')}</div>`:''}
   <ol class="hsteps">${h.steps.map((st,i)=>`<li><div class="hs-h"><span class="hn">${i+1}</span><h2>${esc(st.h)}</h2></div><p>${esc(st.d)}</p>
    ${st.tools.length?`<div class="hs-tools">${st.tools.map(t=>`<a class="btn small primary" href="#${t}">${esc(TITLES[t]||t)}で計算する</a>`).join('')}</div>`:''}
    ${st.arts.map(art).filter(Boolean).length?`<ul class="hs-arts">${st.arts.map(art).filter(Boolean).map(a=>`<li><a href="#a-${a.slug}">${esc(a.title)}</a></li>`).join('')}</ul>`:''}</li>`).join('')}</ol>
   ${houseFor('ガイド',h.slug,'guide_'+h.slug)}
   ${legalHTML(LEGAL_MAP[h.cat]||['fin'])}</div>`;
}
/* ---------- 用語集 ---------- */
function vGlossary(v){
  const cats=[...new Set(GLOSSARY.map(g=>g.c))];
  const rel=r=>!r?'':(TITLES[r]?`<a href="#${r}">${esc(TITLES[r])}で計算する →</a>`:(a=>a?`<a href="#a-${a.slug}">記事：${esc(a.title)} →</a>`:'')(ARTICLES.find(x=>x.slug===r&&!x.draft)));
  v.innerHTML=`<div class="wrap doc gloss"><div class="crumb"><a href="#home">サイのまど</a> › 用語集</div><h1>住まいとお金の用語集</h1>
   <p class="lead">家を買う・売る・相続するときに出てくる言葉を、短くやさしく説明します。</p>
   <nav class="toc" aria-label="分野"><p class="toc-t">分野から探す</p><ol>${cats.map((c,i)=>`<li><button type="button" data-act="toc" data-to="gc${i}">${esc(c)}（${GLOSSARY.filter(g=>g.c===c).length}語）</button></li>`).join('')}</ol></nav>
   ${cats.map((c,ci)=>`<section><h2 id="gc${ci}">${esc(c)}</h2><dl class="terms">${GLOSSARY.map((g,i)=>g.c!==c?'':`<div id="t${i+1}"><dt>${esc(g.w)}${g.r?`<small>${esc(g.r)}</small>`:''}</dt><dd><p>${esc(g.d)}</p>${rel(g.rel)?`<p class="trel">${rel(g.rel)}</p>`:''}</dd></div>`).join('')}</dl></section>`).join('')}
   ${legalHTML(['tax','law'])}</div>`;
}
function v404(v){
  document.title='ページが見つかりません｜サイのまど';
  v.innerHTML=`<div class="wrap doc"><h1>ページが見つかりません</h1><p>お探しのページは、移動したか削除された可能性があります。下のテーマやツールからお探しください。</p>
   <div class="tools hubs">${HUBS.map(hubCard).join('')}</div>
   <p style="margin-top:18px"><a class="btn primary" href="#home">トップページへ</a>　<a class="btn" href="#articles">記事の一覧</a></p></div>`;
}
function vArticles(v){
  const cats=[...new Set(ARTICLES.map(a=>a.cat))];const c=U.acat&&cats.includes(U.acat)?U.acat:'';
  const list=pubArticles().filter(a=>!c||a.cat===c);
  v.innerHTML=`<div class="wrap"><div class="crumb"><a href="#home">サイのまど</a> › 記事</div>
  <div class="thead"><h1>記事</h1><p>家を買う・売る・相続する前に知っておきたい、住まいとお金の基本をまとめています。</p></div>
  <p class="unit" style="margin:-6px 0 12px">テーマごとのまとめは <a href="#g-buy">家を買う</a>・<a href="#g-sell">家を売る</a>・<a href="#g-souzoku">相続</a>・<a href="#g-money">これからのお金</a>、言葉の意味は <a href="#glossary">用語集</a> へ。</p>
  <div class="seg" style="margin-bottom:14px"><button data-act="acat" data-c="" aria-pressed="${!c}">すべて</button>${cats.map(x=>`<button data-act="acat" data-c="${esc(x)}" aria-pressed="${c===x}">${esc(x)}</button>`).join('')}</div>
  <div class="tools">${list.slice(0,6).map(artCard).join('')||'<p class="unit">まだ記事がありません。</p>'}</div>${list.length>6?adUnit('一覧の中')+`<div class="tools" style="margin-top:14px">${list.slice(6).map(artCard).join('')}</div>`:''}</div>`;
}
function vArticle(v,slug){
  const a=ARTICLES.find(x=>x.slug===slug);
  if(!a&&v.querySelector('.art-body'))return; // 前もって書き出した本文があれば、そのまま見せる（古いプログラムで記事の一覧にない場合など）
  if(!a){v.innerHTML=`<div class="wrap doc"><h1>記事が見つかりません</h1><p><a href="#articles">記事の一覧へ</a></p></div>`;return}
  document.title=a.title+'｜サイのまど';
  const rel=pubArticles().filter(x=>x.slug!==a.slug).slice(0,3);
  v.innerHTML=`<div class="wrap doc art-doc"><div class="crumb"><a href="#home">サイのまど</a> › <a href="#articles">記事</a> › ${(h=>h?`<a href="#g-${h.slug}">${esc(a.cat)}</a>`:esc(a.cat))(HUBS.find(h=>h.cat===a.cat))}</div>
  ${a.sub&&ARTICLES.find(x=>x.slug===a.sub)?`<p class="subnote">一覧で比べたいときは「<a href="#a-${a.sub}">${esc(ARTICLES.find(x=>x.slug===a.sub).title)}</a>」へ。</p>`:''}
  ${a.draft?'<div class="draft">下書きです。内容を確認してから公開してください（articles の draft を false にすると、この表示は消えます）。</div>':''}
  ${illust(a)}
  <span class="chip muted">${esc(a.cat)}</span><h1 style="margin-top:8px">${esc(a.title)}</h1>
  ${bylineHTML()}${hubOf(a.cat)?`<p class="hublink">このテーマのまとめ：<a href="#g-${hubOf(a.cat).slug}">${esc(hubOf(a.cat).title)} →</a></p>`:''}<p class="unit">公開 ${jd(a.date)}${a.updated&&a.updated!==a.date?'　更新 '+jd(a.updated):''}${a.mins?'　・　約'+a.mins+'分で読めます':''}</p>
  ${a.pr?'<p class="pr-note">当サイトはアフィリエイト広告を利用しています。記事内の「PR」と表示したリンクから申し込みがあると、当サイトが報酬を受け取ることがあります。</p>':''}
  <p class="lead">${esc(a.lead)}</p>
  ${adUnit('記事の上')}
  ${(a.toc||[]).length>2?`<nav class="toc" aria-label="この記事の内容"><p class="toc-t">この記事の内容</p><ol>${a.toc.map((t,i)=>`<li><button type="button" data-act="toc" data-to="s${i+1}">${esc(t)}</button></li>`).join('')}</ol></nav>`:''}
  <div class="art-body">${withMidAds(a.body||(window.ARTB&&window.ARTB[a.slug])||'')}</div>
  ${a.tool?`<div class="consult" style="margin-top:22px"><div><h2>数字で確かめてみる</h2><p>${esc(toolName(a.tool))}で、ご自分の場合を計算できます。登録不要・入力内容は送信されません。</p></div><div class="ways"><a class="btn primary" href="${a.tool}">${esc(toolName(a.tool))}を使う</a></div></div>`:''}
  ${(a.refs||[]).length?`<section class="refs"><h2>参考にした資料</h2><ul>${a.refs.map(r=>`<li><a href="${esc(r.u)}" target="_blank" rel="noopener">${esc(r.t)}</a></li>`).join('')}</ul></section>`:''}
  ${pageShareHTML('article')}
  ${authorBoxHTML()}
  ${legalHTML(LEGAL_MAP[a.cat]||['fin'])}
  ${houseFor('記事カテゴリ',a.cat,'article_'+a.slug)}
  ${adUnit('記事の下')}
  ${rel.length?`<h2>ほかの記事</h2><div class="tools">${rel.map(artCard).join('')}</div>`:''}</div>`;
}
function vNews(v){
  v.innerHTML=`<div class="wrap doc"><div class="crumb"><a href="#home">サイのまど</a> › お知らせ</div><h1>お知らせ</h1>
  <ul class="news">${NEWS.map(x=>`<li><span class="num">${x.d.replace(/-/g,'.')}</span><span>${esc(x.t)}</span></li>`).join('')}</ul></div>`;
}
function vData(v){
  const cats=[...new Set(DATA_ITEMS.map(x=>x.cat))];
  v.innerHTML=`<div class="wrap doc" style="max-width:900px"><div class="crumb"><a href="#home">サイのまど</a> › 使っているデータ</div><h1>使っているデータ</h1>
  <p>ツールの計算に使っている制度や数値と、その出典です。制度の改正や新しい調査結果に合わせて、年に1回以上見直しています。</p>
  <div class="kpis" style="margin:12px 0 16px"><div class="kpi"><span>最後に確認した日</span><b style="font-size:17px">${jd(CFG.checked)}</b></div><div class="kpi"><span>次の見直し予定</span><b style="font-size:17px">${jd(CFG.next)}</b></div></div>
  ${cats.map(c=>`<h2>${esc(c)}</h2><div class="cfwrap"><table class="cf dtab"><tbody><tr class="hd"><th>項目</th><td>使っている値</td><td>出典</td><td>期限</td></tr>
   ${DATA_ITEMS.filter(x=>x.cat===c).map(x=>{const u=x.until?CFG[x.until]:null;const st=u?(isPast(u)?'<span class="chip bad">期限切れ</span>':`<span class="chip muted">${jd(u)}まで</span>`):'—';
    return `<tr><th>${esc(x.name)}<br><span class="unit">${esc(x.tool)}</span></th><td>${esc(x.val)}</td><td>${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.src)}</a>`:esc(x.src)}</td><td>${st}</td></tr>`}).join('')}</tbody></table></div>`).join('')}
  <p class="unit" style="margin-top:14px">計算結果は、入力された条件と上の前提にもとづく目安です。税金の表示は一般的な計算方法による計算例で、個別の税務相談には応じていません。</p></div>`;
}

