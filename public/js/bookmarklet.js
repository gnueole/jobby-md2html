/**
 * Jobby Markdown Editor - bookmarklet.js
 * LinkedIn to Notion clipper bookmarklet builder.
 */

export function compileBookmarkletCode(url, token) {
    const editorOrigin = window.location.origin;
    return `javascript:(function(){const token="${token}";const webhookUrl="${url}";const editorOrigin="${editorOrigin}";const getTxt=(s)=>{const el=document.querySelector(s);return el?el.innerText.trim():"";};const getFirst=(arr)=>{for(let s of arr){let t=getTxt(s);if(t&&t.length>10)return t;}return "";};let sel=(window.getSelection()?window.getSelection().toString():"").trim();let description=sel.length>20?sel:getFirst(['#job-details','.jobs-description__content','.jobs-description-content','.jobs-description','.jobs-box__html-content','.jobs-search__job-details','.job-details-about-the-job-module','[class*="jobs-description"]','[class*="job-details"]','article']);if(!description||description.length<20){description=prompt("Jobby : Impossible d'extraire la description du poste automatiquement.\\n\\nVeuillez coller le texte de l'offre ci-dessous :","")||"";description=description.trim();}if(!description){alert("Jobby : Analyse annulée car aucune description n'a été fournie.");return;}const title=encodeURIComponent(getFirst(['.job-details-jobs-unified-top-card__job-title','.jobs-unified-top-card__job-title','[class*="top-card__job-title"]','.jobs-search__job-details h1','h1'])||document.title);const company=encodeURIComponent(getFirst(['.job-details-jobs-unified-top-card__company-name','.jobs-unified-top-card__company-name','[class*="top-card__company-name"]','[class*="primary-description"]'])||"");const jobUrl=encodeURIComponent(window.location.href);const shortDesc=encodeURIComponent(description.substring(0,1800));const helperUrl=\`${editorOrigin}/bookmarklet-helper.html?webhookUrl=\${encodeURIComponent(webhookUrl)}&token=\${encodeURIComponent(token)}&job_title=\${title}&company=\${company}&job_url=\${jobUrl}&job_description=\${shortDesc}\`;window.open(helperUrl,'_blank');})();`;
}

export function updateBookmarkletLinks(prodUrlVal, prodTokenVal, devUrlVal, devTokenVal, bookmarkletDragLinkProd, bookmarkletDragLinkDev) {
    if (bookmarkletDragLinkProd) {
        const url = prodUrlVal.trim() || 'https://n8n.eole.me/webhook/cv-factory';
        const token = prodTokenVal.trim();
        bookmarkletDragLinkProd.setAttribute('href', compileBookmarkletCode(url, token));
    }
    if (bookmarkletDragLinkDev) {
        const url = devUrlVal.trim() || 'http://localhost:5678/webhook-test/cv-factory';
        const token = devTokenVal.trim();
        bookmarkletDragLinkDev.setAttribute('href', compileBookmarkletCode(url, token));
    }
}
