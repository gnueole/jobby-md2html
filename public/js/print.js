/**
 * Jobby Markdown Editor - print.js
 * Dotted page breaks, page dimensions format, and print file naming.
 * Refactored from app.js to modularize page layout and print configuration.
 */

import { incrementDailyVersionCounter, showToast, preventPopupOverflow } from './utils.js';
import { t } from './i18n.js';

let showPageBreaks = localStorage.getItem('show_page_breaks') === 'true';
let pageFormat = 'A4';
try {
    const stylesObj = JSON.parse(localStorage.getItem('ats_resume_styles')) || {};
    pageFormat = stylesObj.pageFormat || localStorage.getItem('page_format') || 'A4';
} catch (e) {
    pageFormat = localStorage.getItem('page_format') || 'A4';
}

export function getShowPageBreaks() {
    return showPageBreaks;
}

export function setShowPageBreaks(val) {
    showPageBreaks = val;
    localStorage.setItem('show_page_breaks', val);
}

export function getPageFormat() {
    return pageFormat;
}

export function setPageFormat(val) {
    pageFormat = val;
    localStorage.setItem('page_format', val);
}

export function updatePageBreaks(resumeOutput, styleConfig) {
    if (!resumeOutput) return;

    const existingBreaks = resumeOutput.querySelectorAll('.page-break-indicator');
    existingBreaks.forEach(el => el.remove());

    const format = (styleConfig && styleConfig.pageFormat) ? styleConfig.pageFormat : (localStorage.getItem('page_format') || 'A4');
    pageFormat = format;

    resumeOutput.classList.remove('letter-format', 'format-a4', 'format-letter', 'format-legal', 'format-a5');
    const formatClasses = {
        'letter': ['letter-format', 'format-letter'],
        'legal': ['format-legal'],
        'a5': ['format-a5']
    };
    const classesToAdd = formatClasses[format] || ['format-a4'];
    resumeOutput.classList.add(...classesToAdd);

    if (!showPageBreaks) return;

    const sheetHeight = resumeOutput.scrollHeight;
    let pageHeightPx = 0;

    const tempDiv = document.createElement('div');
    const formatHeights = {
        'letter': '11in',
        'legal': '14in',
        'a5': '210mm'
    };
    tempDiv.style.height = formatHeights[format] || '297mm';
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    resumeOutput.appendChild(tempDiv);
    pageHeightPx = tempDiv.offsetHeight;
    tempDiv.remove();

    if (pageHeightPx <= 0) return;

    const pagesCount = Math.ceil(sheetHeight / pageHeightPx);
    for (let i = 1; i < pagesCount; i++) {
        const breakEl = document.createElement('div');
        breakEl.className = 'page-break-indicator';
        breakEl.style.top = `${i * pageHeightPx}px`;
        breakEl.innerHTML = `<span class="page-break-text">PAGE ${i} / ${i + 1} BREAK</span>`;
        resumeOutput.appendChild(breakEl);
    }
}

export function initPrint({
    btnPrint,
    btnPageBreaks,
    selectPageFormat,
    resumeOutput,
    getCurrentResumeTitle,
    autoFitZoom,
    triggerCompile,
    styleConfig,
    getTemplatesCssText
}) {
    if (btnPageBreaks) {
        btnPageBreaks.classList.toggle('active', showPageBreaks);
        btnPageBreaks.addEventListener('click', () => {
            showPageBreaks = !showPageBreaks;
            localStorage.setItem('show_page_breaks', showPageBreaks);
            btnPageBreaks.classList.toggle('active', showPageBreaks);
            updatePageBreaks(resumeOutput, styleConfig);
        });
    }

    const btnPageFormat = document.getElementById('btn-page-format');
    const pageFormatDropdown = document.getElementById('page-format-dropdown');

    if (btnPageFormat && pageFormatDropdown) {
        btnPageFormat.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Check if expert mode is active
            const isExpert = document.body.classList.contains('expert-mode-active');
            if (!isExpert) {
                showToast("Page format switching requires Expert Mode. Enable it in the Design panel!");
                return;
            }
            
            pageFormatDropdown.classList.toggle('show');
            if (pageFormatDropdown.classList.contains('show')) {
                preventPopupOverflow(pageFormatDropdown);
            }
        });
        
        const formatOptions = pageFormatDropdown.querySelectorAll('.format-option');
        formatOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                const val = opt.getAttribute('data-value');
                pageFormat = val;
                localStorage.setItem('page_format', pageFormat);
                
                if (styleConfig) {
                    styleConfig.pageFormat = val;
                    // Trigger save
                    try {
                        localStorage.setItem('ats_resume_styles', JSON.stringify(styleConfig));
                    } catch (err) {}
                }
                
                // Keep hidden select-page-format synchronized
                if (selectPageFormat) {
                    selectPageFormat.value = val;
                    selectPageFormat.dispatchEvent(new Event('change'));
                } else {
                    updatePageBreaks(resumeOutput, styleConfig);
                    if (autoFitZoom) autoFitZoom();
                }
                
                // Update dropdown menu items active state
                formatOptions.forEach(item => {
                    if (item.getAttribute('data-value') === val) {
                        item.classList.add('active');
                    } else {
                        item.classList.remove('active');
                    }
                });
                
                pageFormatDropdown.classList.remove('show');
            });
        });
    }

    if (selectPageFormat) {
        selectPageFormat.value = pageFormat;
        selectPageFormat.addEventListener('change', (e) => {
            pageFormat = e.target.value;
            localStorage.setItem('page_format', pageFormat);
            if (styleConfig) {
                styleConfig.pageFormat = pageFormat;
                try {
                    localStorage.setItem('ats_resume_styles', JSON.stringify(styleConfig));
                } catch (err) {}
            }
            updatePageBreaks(resumeOutput, styleConfig);
            if (autoFitZoom) autoFitZoom();
        });
    }

    // Set up Gotenberg PDF download toggle
    const gotenbergToggle = document.getElementById('gotenberg-pdf-toggle');
    if (gotenbergToggle) {
        const stored = localStorage.getItem('gotenberg_pdf_enabled');
        gotenbergToggle.checked = stored === 'true';
        
        const updatePrintBtnStyle = () => {
            if (btnPrint) {
                if (gotenbergToggle.checked) {
                    btnPrint.classList.add('gotenberg-active');
                } else {
                    btnPrint.classList.remove('gotenberg-active');
                }
            }
        };
        
        updatePrintBtnStyle();
        
        gotenbergToggle.addEventListener('change', () => {
            localStorage.setItem('gotenberg_pdf_enabled', gotenbergToggle.checked);
            updatePrintBtnStyle();
        });
    }

    function downloadPdfViaGotenberg() {
        const counter = incrementDailyVersionCounter();
        if (triggerCompile) {
            triggerCompile();
        }
        
        const increment = String(counter).padStart(2, '0');
        const currentTitle = getCurrentResumeTitle ? getCurrentResumeTitle() : "resume";
        const filename = `${currentTitle}-${increment}`;
        
        const resumeOutputHtml = resumeOutput.innerHTML;
        const templatesCss = getTemplatesCssText ? getTemplatesCssText() : "";
        const resumeOutputClass = resumeOutput.className;
        const resumeOutputStyle = resumeOutput.style.cssText;
        
        const format = (styleConfig && styleConfig.pageFormat) ? styleConfig.pageFormat : (localStorage.getItem('page_format') || 'A4');

        const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Raleway:wght@300;400;500;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=JetBrains+Mono:wght@400;500;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
  <style>
    ${templatesCss}
    .page-break-indicator {
      display: none !important;
    }
    @media print {
      body {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        background: var(--resume-color-bg, #ffffff) !important;
      }
      .a4-sheet {
        width: 100% !important;
        margin: 0 !important;
        box-shadow: none !important;
      }
    }
    body {
        background-color: var(--resume-color-bg, #ffffff);
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
    }
    .a4-sheet {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 auto;
    }
  </style>
</head>
<body>
  <article id="resume-output" class="${resumeOutputClass}" style="${resumeOutputStyle}">
    ${resumeOutputHtml}
  </article>
</body>
</html>`;

        showToast(t('toasts.gotenberg_pdf_generating') || "Generating PDF via Gotenberg...");

        fetch('/api/pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                html: standaloneHtml,
                paperFormat: format,
                filename: filename
            })
        })
        .then(async response => {
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || `HTTP ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            showToast(t('toasts.gotenberg_pdf_success') || "PDF download started!");
        })
        .catch(err => {
            console.error("Gotenberg PDF generation failed:", err);
            showToast(t('toasts.gotenberg_pdf_fail', { message: err.message }) || `PDF generation failed: ${err.message}`);
        });
    }

    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            if (gotenbergToggle && gotenbergToggle.checked) {
                downloadPdfViaGotenberg();
            } else {
                window.print();
            }
        });
    }

    window.addEventListener('beforeprint', () => {
        // Increment daily counter and trigger re-render of sheet contents
        const counter = incrementDailyVersionCounter();
        if (triggerCompile) {
            triggerCompile();
        }
        
        const increment = String(counter).padStart(2, '0');
        const currentTitle = getCurrentResumeTitle ? getCurrentResumeTitle() : "resume";
        document.title = `${currentTitle}-${increment}`;
    });

    window.addEventListener('afterprint', () => {
        document.title = "jobby MD Editor";
    });
}
