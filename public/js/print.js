/**
 * Jobby Markdown Editor - print.js
 * Dotted page breaks, page dimensions format, and print file naming.
 * Refactored from app.js to modularize page layout and print configuration.
 */

import { incrementDailyVersionCounter } from './utils.js';

let showPageBreaks = localStorage.getItem('show_page_breaks') === 'true';
let pageFormat = localStorage.getItem('page_format') || 'A4';

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

export function updatePageBreaks(resumeOutput) {
    if (!resumeOutput) return;

    const existingBreaks = resumeOutput.querySelectorAll('.page-break-indicator');
    existingBreaks.forEach(el => el.remove());

    if (pageFormat === "letter") {
        resumeOutput.classList.add('letter-format');
    } else {
        resumeOutput.classList.remove('letter-format');
    }

    if (!showPageBreaks) return;

    const sheetHeight = resumeOutput.scrollHeight;
    let pageHeightPx = 0;

    const tempDiv = document.createElement('div');
    tempDiv.style.height = pageFormat === "A4" ? '297mm' : '11in';
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
    triggerCompile
}) {
    if (btnPageBreaks) {
        btnPageBreaks.classList.toggle('active', showPageBreaks);
        btnPageBreaks.addEventListener('click', () => {
            showPageBreaks = !showPageBreaks;
            localStorage.setItem('show_page_breaks', showPageBreaks);
            btnPageBreaks.classList.toggle('active', showPageBreaks);
            updatePageBreaks(resumeOutput);
        });
    }

    if (selectPageFormat) {
        selectPageFormat.value = pageFormat;
        selectPageFormat.addEventListener('change', (e) => {
            pageFormat = e.target.value;
            localStorage.setItem('page_format', pageFormat);
            updatePageBreaks(resumeOutput);
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
