/**
 * Jobby Markdown Editor - bookmarklet.js
 * LinkedIn to Notion clipper bookmarklet builder.
 */

export function compileBookmarkletCode(url, token) {
    return `javascript:(function(){const token="${token}";const webhookUrl="${url}";const getTxt=(s)=>document.querySelector(s)?.innerText?.trim()||"";let description=getTxt('#job-details')||getTxt('.jobs-description')||getTxt('.jobs-box__html-content')||"";if(description.length<50){description=window.getSelection().toString();}const title=encodeURIComponent(getTxt('.job-details-jobs-unified-top-card__job-title')||document.title);const company=encodeURIComponent(getTxt('.job-details-jobs-unified-top-card__company-name')||"");const url=encodeURIComponent(window.location.href);const shortDesc=encodeURIComponent(description.substring(0,1800));const n8nUrl=\`\${webhookUrl}?token=\${token}&job_title=\${title}&company=\${company}&job_url=\${url}&job_description=\${shortDesc}\`;window.open(n8nUrl,'_blank');})();`;
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
