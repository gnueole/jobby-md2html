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

    /* 1. Extraction chirurgicale multi-sélecteur & sélection manuelle */
    const getTxt = (s) => document.querySelector(s)?.innerText?.trim() || "";
    const getFirst = (arr) => {
        for (let s of arr) {
            let t = getTxt(s);
            if (t && t.length > 10) return t;
        }
        return "";
    };

    let sel = (window.getSelection() ? window.getSelection().toString() : "").trim();
    let description = sel.length > 20 ? sel : getFirst([
        '#job-details',
        '.jobs-description__content',
        '.jobs-description-content',
        '.jobs-description',
        '.jobs-box__html-content',
        '.jobs-search__job-details',
        '.job-details-about-the-job-module',
        '[class*="jobs-description"]',
        '[class*="job-details"]',
        'article'
    ]);

    /* Fallback interactif si l'extraction automatique et la sélection ont échoué */
    if (!description || description.length < 20) {
        description = prompt("Jobby : Impossible d'extraire la description du poste automatiquement.\n\nVeuillez coller le texte de l'offre ci-dessous :", "") || "";
        description = description.trim();
    }

    if (!description) {
        alert("Jobby : Analyse annulée car aucune description n'a été fournie.");
        return;
    }

    /* 2. Encodage et préparation du payload */
    const title = encodeURIComponent(getFirst([
        '.job-details-jobs-unified-top-card__job-title',
        '.jobs-unified-top-card__job-title',
        '[class*="top-card__job-title"]',
        '.jobs-search__job-details h1',
        'h1'
    ]) || document.title);

    const company = encodeURIComponent(getFirst([
        '.job-details-jobs-unified-top-card__company-name',
        '.jobs-unified-top-card__company-name',
        '[class*="top-card__company-name"]',
        '[class*="primary-description"]'
    ]) || "");

    const jobUrl = encodeURIComponent(window.location.href);
    const shortDesc = encodeURIComponent(description.substring(0, 1800));

    /* 3. Routage vers le helper de synchronisation Jobby */
    const helperUrl = `${editorOrigin}/bookmarklet-helper.html?webhookUrl=${encodeURIComponent(webhookUrl)}&token=${encodeURIComponent(token)}&job_title=${title}&company=${company}&job_url=${jobUrl}&job_description=${shortDesc}`;
    
    window.open(helperUrl, '_blank');
})();
