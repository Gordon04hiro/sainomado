/* ---------- ご利用にあたっての注意（各ページの下に自動で表示） ----------
   ページの内容に合わせて、関係する注意だけを出します。文言はここで一括管理します。 */
const LEGAL={
 tax:'表示している税金は、一般的な計算式にもとづく<b>計算例</b>です。個別の税額の計算・申告書の作成・税務相談は行っていません（税理士法）。実際の税額や特例が使えるかは、税務署または税理士にご確認ください。',
 law:'個別の法律相談、遺産分割などの交渉・代理は行っていません（弁護士法）。相続人どうしで意見が分かれる場合などは、弁護士にご相談ください。',
 doc:'登記の申請や、遺言書・遺産分割協議書などの書類の作成は行っていません（司法書士法・行政書士法）。手続きは司法書士・行政書士などの専門家にご相談ください。',
 fin:'特定の金融商品の勧誘や、投資の助言は行っていません（金融商品取引法）。利回りや金利は入力された前提による仮定で、将来の運用成果を示すものではありません。',
 re:'当サイトでは、不動産の売買・賃貸の仲介や、価格の査定は行っていません（広告の掲載先の会社とは別の取り扱いです）。表示する金額は入力された条件による目安で、実際に売れる価格や取引条件を示すものではありません。',
 pen:'年金の金額は、制度の一般的な計算式による目安です。正確な見込額は「ねんきん定期便」「ねんきんネット」でご確認ください。',
 ins:'保険の募集・勧誘は行っていません。'
};
const LEGAL_MAP={
 hoshou:['pen','ins'],
 iryou:['ins'],
 chuko:['re'],
 souba:['re'], koujo:['tax','fin'], furusato:['tax'], chukai:['re'], zoyo:['tax'], souzokubun:['law','doc','tax'],
 lifeplan:['fin','pen','tax'], loan:['fin'], vs:['fin','re'], rent2buy:['fin'], prepay:['fin','tax'],
 sell:['tax','re'], akiya:['tax','re'], souzoku:['law','doc','tax'], souzoku2:['law','doc','tax'], souzokuzei:['tax','law'],
 '家を買う':['fin','re'], '家を売る':['tax','re'], '相続':['tax','law','doc'], 'ライフプラン':['fin','pen']
};
function legalHTML(keys){
  if(!keys||!keys.length) return '';
  return `<div class="legal-box"><p class="legal-t">ご利用にあたって</p><ul>${keys.map(k=>`<li>${LEGAL[k]}</li>`).join('')}<li>制度・数値は${jd(CFG.checked)}時点の内容で、毎年見直しています（次回の予定：${jd(CFG.next)}ごろ）。法改正などで変わることがあります。</li><li>計算や記事は一般的な情報の提供を目的としたもので、個別の事情にもとづく判断は、必ず専門家にご相談ください。</li></ul></div>`;
}
function legalTail(r){const box=document.getElementById('legal');if(!box)return;const h=legalHTML(LEGAL_MAP[r]);box.innerHTML=h;box.hidden=!h}
