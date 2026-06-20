/**
 * Jobby Markdown Editor - print.js
 * Dotted page breaks, page dimensions format, and print file naming.
 * Refactored from app.js to modularize page layout and print configuration.
 */

import { incrementDailyVersionCounter, showToast } from './utils.js';

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
    if (format === "letter") {
        resumeOutput.classList.add('letter-format', 'format-letter');
    } else if (format === "legal") {
        resumeOutput.classList.add('format-legal');
    } else if (format === "a5") {
        resumeOutput.classList.add('format-a5');
    } else {
        resumeOutput.classList.add('format-a4');
    }

    if (!showPageBreaks) return;

    const sheetHeight = resumeOutput.scrollHeight;
    let pageHeightPx = 0;

    const tempDiv = document.createElement('div');
    if (format === "letter") {
        tempDiv.style.height = '11in';
    } else if (format === "legal") {
        tempDiv.style.height = '14in';
    } else if (format === "a5") {
        tempDiv.style.height = '210mm';
    } else {
        tempDiv.style.height = '297mm';
    }
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
    styleConfig
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

    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.print();
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
