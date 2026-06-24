/**
 * Jobby Markdown Editor - exports.js
 * Clipboard exports and file downloading.
 * Refactored from app.js to modularize clipboard and download features.
 */

import { showToast } from './utils.js';

export function initExports({
    btnCopyStandalone,
    btnCopyCss,
    btnCopyHtml,
    btnDownloadMd,
    resumeOutput,
    getStyleConfig,
    getTemplatesCssText,
    getResumeOutputHtml,
    getMarkdownInputValue,
    getCurrentResumeTitle
}) {
    if (btnCopyStandalone) {
        btnCopyStandalone.addEventListener('click', () => {
            const styleConfig = getStyleConfig();
            const templatesCssText = getTemplatesCssText();
            const resumeOutputHtml = getResumeOutputHtml();
            const filename = getCurrentResumeTitle();

            const format = styleConfig.pageFormat || 'A4';
            const pageSizes = {
                'letter': 'letter',
                'legal': 'legal',
                'a5': 'A5'
            };
            const pageSize = pageSizes[format] || 'A4';
            const formatWidths = {
                'letter': '8.5in',
                'legal': '8.5in',
                'a5': '148mm'
            };
            const pageWidth = formatWidths[format] || '210mm';

            const resumeOutputClass = resumeOutput ? resumeOutput.className : "a4-sheet";
            const resumeOutputStyle = resumeOutput ? resumeOutput.style.cssText : "";

            const inlineVariables = `
:root {
    --resume-font-family: ${styleConfig.fontFamily};
    --resume-font-size: ${styleConfig.fontSize}px;
    --resume-line-height: ${styleConfig.lineHeight};
    --resume-heading-scale: ${styleConfig.headingScale};
    --resume-margin-x: ${styleConfig.marginX}px;
    --resume-margin-y: ${styleConfig.marginY}px;
    --resume-section-spacing: ${styleConfig.sectionSpacing}px;
    --resume-color-bg: ${styleConfig.colorBg || '#ffffff'};
    --resume-color-headings: ${styleConfig.colorHeadings};
    --resume-color-body: ${styleConfig.colorBody};
    --resume-color-links: ${styleConfig.colorLinks};
    --resume-color-accent: ${styleConfig.colorAccent};
    --resume-sidebar-bg: ${styleConfig.sidebarBg || '#2d3748'};
    --resume-sidebar-text: ${styleConfig.sidebarText || '#ffffff'};
}`;
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
    ${inlineVariables}
    ${templatesCssText}
    @media print {
      @page {
        size: ${pageSize} portrait;
        margin: 0 !important;
      }
      html, body {
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      body {
        display: block !important;
        background: var(--resume-color-bg, #ffffff) !important;
      }
      .a4-sheet.format-a4,
      .a4-sheet {
        width: 210mm !important;
      }
      .a4-sheet.format-letter,
      .a4-sheet.letter-format {
        width: 8.5in !important;
      }
      .a4-sheet.format-legal {
        width: 8.5in !important;
      }
      .a4-sheet.format-a5 {
        width: 148mm !important;
      }
      .a4-sheet.format-a4,
      .a4-sheet.format-letter,
      .a4-sheet.letter-format,
      .a4-sheet.format-legal,
      .a4-sheet.format-a5,
      .a4-sheet {
        margin: 0 !important;
        box-shadow: none !important;
      }
      .a4-sheet:not(.has-gradient) .resume-sidebar-col {
        background: transparent !important;
      }
      .a4-sheet:not(.has-shadow) .resume-sidebar-col {
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
<body class="${document.body.className}" style="${resumeOutputStyle}">
  <article class="${resumeOutputClass}" id="resume-output" style="${resumeOutputStyle}">
    ${resumeOutputHtml}
  </article>
</body>
</html>`;
            navigator.clipboard.writeText(standaloneHtml)
                .then(() => showToast("Standalone HTML document copied!"))
                .catch(err => console.error(err));
        });
    }

    if (btnCopyCss) {
        btnCopyCss.addEventListener('click', () => {
            const styleConfig = getStyleConfig();
            const templatesCssText = getTemplatesCssText();

            const inlineVariables = `
:root {
    --resume-font-family: ${styleConfig.fontFamily};
    --resume-font-size: ${styleConfig.fontSize}px;
    --resume-line-height: ${styleConfig.lineHeight};
    --resume-heading-scale: ${styleConfig.headingScale};
    --resume-margin-x: ${styleConfig.marginX}px;
    --resume-margin-y: ${styleConfig.marginY}px;
    --resume-section-spacing: ${styleConfig.sectionSpacing}px;
    --resume-color-bg: ${styleConfig.colorBg || '#ffffff'};
    --resume-color-headings: ${styleConfig.colorHeadings};
    --resume-color-body: ${styleConfig.colorBody};
    --resume-color-links: ${styleConfig.colorLinks};
    --resume-color-accent: ${styleConfig.colorAccent};
    --resume-sidebar-bg: ${styleConfig.sidebarBg || '#2d3748'};
    --resume-sidebar-text: ${styleConfig.sidebarText || '#ffffff'};
}`;
            const combinedCss = `${inlineVariables}\n\n${templatesCssText}`;
            navigator.clipboard.writeText(combinedCss)
                .then(() => showToast("Styles CSS copied!"))
                .catch(err => console.error(err));
        });
    }

    if (btnCopyHtml) {
        btnCopyHtml.addEventListener('click', () => {
            const resumeOutputHtml = getResumeOutputHtml();
            navigator.clipboard.writeText(resumeOutputHtml)
                .then(() => showToast("Inner resume HTML copied!"))
                .catch(err => console.error(err));
        });
    }

    if (btnDownloadMd) {
        btnDownloadMd.addEventListener('click', () => {
            const markdownInputValue = getMarkdownInputValue();
            const filename = getCurrentResumeTitle();

            const blob = new Blob([markdownInputValue], { type: 'text/markdown;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.md`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            showToast("Markdown download started!");
        });
    }
}
