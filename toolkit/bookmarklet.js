/**
 * Jobby LinkedIn Job Sync Webhook Bookmarklet
 * 
 * To use this bookmarklet:
 * 1. Open Jobby Developer Tools modal.
 * 2. Configure your n8n Webhook URL and Token.
 * 3. Drag the compiled bookmarklet link to your bookmarks bar.
 */
(function(){
    const token = "{{TOKEN}}";
    const webhookUrl = "{{WEBHOOK_URL}}";
    const editorOrigin = "{{EDITOR_ORIGIN}}";

    /* 1. Extraction chirurgicale */
    const getTxt = (s) => document.querySelector(s)?.innerText?.trim() || "";
    let description = getTxt('#job-details') || getTxt('.jobs-description') || getTxt('.jobs-box__html-content') || "";
    if (description.length < 50) {
        description = window.getSelection().toString();
    }

    /* 2. Encodage et préparation du payload */
    const title = encodeURIComponent(getTxt('.job-details-jobs-unified-top-card__job-title') || document.title);
    const company = encodeURIComponent(getTxt('.job-details-jobs-unified-top-card__company-name') || "");
    const jobUrl = encodeURIComponent(window.location.href);
    const shortDesc = encodeURIComponent(description.substring(0, 1800));

    /* 3. Routage vers le helper de synchronisation Jobby */
    const helperUrl = `${editorOrigin}/bookmarklet-helper.html?webhookUrl=${encodeURIComponent(webhookUrl)}&token=${encodeURIComponent(token)}&job_title=${title}&company=${company}&job_url=${jobUrl}&job_description=${shortDesc}`;
    
    window.open(helperUrl, '_blank');
})();
