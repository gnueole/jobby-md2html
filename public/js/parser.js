/**
 * Jobby Markdown Editor - parser.js
 * Markdown parsing and HTML compilation.
 */

import { getDailyVersionString } from './utils.js';

let lastSectionsJSON = "";

// Code spans and fences, in Markdown source and in compiled HTML. Jobby syntax written
// between backticks is shown literally, never interpreted.
const MD_CODE_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g;
const HTML_CODE_PATTERN = /(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/gi;

// A contact line ends at its closing bracket and never runs past its own line or block.
// Without that bound, one missing "]" matched up to the next bracket anywhere in the
// document and pulled the whole resume into the contact bar.
const CONTACT_PATTERN = /\[CONTACT\s*:\s*((?:(?!<br\s*\/?>|<\/?(?:p|li|ul|ol|h[1-6]|blockquote|div|table|hr)\b)[^\]])*)\]/gi;
const CONTACT_OPENING = /\[CONTACT\s*:/i;
const CONTACT_SEPARATOR = /[|•·]/;

function mapOutsideCode(text, codePattern, fn) {
    return text.split(codePattern).map((chunk, i) => (i % 2 === 0 ? fn(chunk) : chunk)).join('');
}

function formatContactPart(part) {
    if (part.includes('@') && !part.includes(' ')) {
        return `<a href="mailto:${part}">${part}</a>`;
    }
    if (part.startsWith('http://') || part.startsWith('https://')) {
        const cleanUrl = part.replace(/^https?:\/\/(www\.)?/, '');
        return `<a href="${part}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>`;
    }
    return `<span>${part}</span>`;
}

// Returns the HTML with contact lines formatted, and whether one was left unclosed:
// that is reported to the user rather than guessed at.
function formatContactBars(html) {
    let unclosed = false;
    const formatted = mapOutsideCode(html, HTML_CODE_PATTERN, chunk => {
        const replaced = chunk.replace(CONTACT_PATTERN, (match, contents) => {
            const parts = contents.split(CONTACT_SEPARATOR).map(p => p.trim()).filter(Boolean);
            return `<div class="resume-contact-bar">${parts.map(formatContactPart).join(' &nbsp;•&nbsp; ')}</div>`;
        });
        if (CONTACT_OPENING.test(replaced)) unclosed = true;
        return replaced;
    });
    return { html: formatted, unclosed };
}

export function updateHeaderInMarkdown(markdownInput, title, toSidebar, onUpdate) {
    if (!markdownInput) return;
    const mdText = markdownInput.value;
    const lines = mdText.split('\n');
    const targetTitle = title.trim().toLowerCase();

    let updated = false;
    const newLines = lines.map(line => {
        const trimmed = line.trim();
        const isHeading = trimmed.startsWith('## ') || trimmed.startsWith('### ');
        if (isHeading) {
            const currentHeadingTitle = trimmed.replace(/^###?\s+/, '').trim().toLowerCase();
            if (currentHeadingTitle === targetTitle) {
                updated = true;
                const prefix = toSidebar ? '###' : '##';
                return `${prefix} ${title.toUpperCase()}`;
            }
        }
        return line;
    });

    if (updated) {
        markdownInput.value = newLines.join('\n');
        if (typeof onUpdate === 'function') {
            onUpdate(markdownInput.value);
        }
    }
}

export function updateSidebarChecklist(doc, markdownInput, onUpdate) {
    const sidebarChecklistContainer = document.getElementById('sidebar-sections-checklist');
    if (!sidebarChecklistContainer) return;

    const allSections = Array.from(doc.querySelectorAll('h2, h3')).map(h => ({
        title: h.textContent.trim(),
        isSidebar: h.tagName.toLowerCase() === 'h3'
    }));

    const sectionsJSON = JSON.stringify(allSections);
    if (sectionsJSON === lastSectionsJSON) {
        const checkboxes = sidebarChecklistContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((cb, index) => {
            if (allSections[index]) {
                cb.checked = allSections[index].isSidebar;
            }
        });
        return;
    }

    lastSectionsJSON = sectionsJSON;
    sidebarChecklistContainer.innerHTML = '';

    if (allSections.length === 0) {
        sidebarChecklistContainer.innerHTML = '<span style="font-size:10px; color:var(--text-muted); font-style:italic; padding: 4px;">No sections detected (headers starting with "##" or "###")</span>';
        return;
    }

    allSections.forEach(section => {
        const title = section.title;
        const isSidebar = section.isSidebar;

        const item = document.createElement('label');
        item.className = 'sidebar-checklist-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = title;
        checkbox.checked = isSidebar;

        checkbox.addEventListener('change', () => {
            updateHeaderInMarkdown(markdownInput, title, checkbox.checked, onUpdate);
        });

        item.appendChild(checkbox);
        item.appendChild(document.createTextNode(title));
        sidebarChecklistContainer.appendChild(item);
    });
}

export function compileMarkdown(mdText, styleConfig, markdownInput, onUpdate) {
    if (!mdText.trim()) {
        return {
            html: `<p style="color:#64748b; font-style:italic;">Start typing Markdown on the left to preview...</p>`,
            tokens: [],
            resumeTitle: "resume",
            warnings: { contactUnclosed: false }
        };
    }

    // Configure Marked.js
    marked.setOptions({
        gfm: true,
        breaks: true
    });

    // 1. Pre-process custom directives: :accent[text] and :muted[text]
    const processedMd = mapOutsideCode(mdText, MD_CODE_PATTERN, chunk => chunk
        .replace(/:accent\[([^\]]+)\]/g, '<span class="resume-accent">$1</span>')
        .replace(/:muted\[([^\]]+)\]/g, '<span class="resume-muted">$1</span>'));

    // Tokenize and calculate raw source offsets
    const tokens = marked.lexer(processedMd);
    let currentOffset = 0;
    tokens.forEach(token => {
        token.startOffset = currentOffset;
        token.endOffset = currentOffset + token.raw.length;
        currentOffset += token.raw.length;
    });

    // Compile markdown to HTML and sanitize to prevent XSS
    let html = DOMPurify.sanitize(marked.parse(processedMd), { ADD_ATTR: ['data-token-index'] });

    // Inject data-token-index into the top-level HTML elements
    const docParser = new DOMParser();
    const doc = docParser.parseFromString(html, 'text/html');
    const bodyElements = Array.from(doc.body.children);
    const nonSpaceTokens = tokens.filter(t => t.type !== 'space');

    bodyElements.forEach((el, idx) => {
        const token = nonSpaceTokens.at(idx);
        if (token) {
            const tokenIndex = tokens.indexOf(token);
            el.setAttribute('data-token-index', tokenIndex);
        }
    });
    html = doc.body.innerHTML;

    // 2. Post-process contact block if present: e.g. [CONTACT : email • phone | link]
    const contact = formatContactBars(html);
    html = contact.html;

    // RESTRUCTURE FOR 2 COLUMNS IF ENABLED
    let finalHtml = html;
    if (styleConfig.layoutMode === '2-column') {
        const parser = new DOMParser();
        const doc2 = parser.parseFromString(html, 'text/html');
        const bodyElements2 = Array.from(doc2.body.children);

        const headerElements = [];
        const mainColElements = [];
        const sidebarColElements = [];

        let currentDest = null;
        let foundFirstHeading = false;

        for (let el of bodyElements2) {
            if (el.tagName === 'H2') {
                foundFirstHeading = true;
                currentDest = mainColElements;
                currentDest.push(el.cloneNode(true));
            } else if (el.tagName === 'H3') {
                foundFirstHeading = true;
                currentDest = sidebarColElements;
                currentDest.push(el.cloneNode(true));
            } else if (!foundFirstHeading) {
                headerElements.push(el.cloneNode(true));
            } else {
                if (currentDest) {
                    currentDest.push(el.cloneNode(true));
                } else {
                    headerElements.push(el.cloneNode(true));
                }
            }
        }

        updateSidebarChecklist(doc2, markdownInput, onUpdate);

        // Append version suffix to sidebar if enabled
        if (styleConfig.showVersion) {
            const versionStr = getDailyVersionString();
            const verEl = doc2.createElement('div');
            verEl.className = 'resume-version-sidebar';
            verEl.textContent = versionStr;
            sidebarColElements.push(verEl);
        }

        const headerHtml = headerElements.map(el => el.outerHTML).join('\n');
        const mainHtml = mainColElements.map(el => el.outerHTML).join('\n');
        const sidebarHtml = sidebarColElements.map(el => el.outerHTML).join('\n');

        const fontSizeClass = styleConfig.columnFontSize === 'smaller' ? 'column-font-smaller' : '';
        const fontStyleClass = styleConfig.columnFontStyle === 'alternative' ? 'column-font-alternative' : '';

        finalHtml = `
            <div class="resume-header">
                ${headerHtml}
            </div>
            <div class="resume-columns ${styleConfig.sidebarPosition === 'left' ? 'sidebar-left' : ''}">
                <div class="resume-main-col">
                    ${mainHtml}
                </div>
                <div class="resume-sidebar-col ${fontSizeClass} ${fontStyleClass}">
                    ${sidebarHtml}
                </div>
            </div>
        `;
    } else {
        const parser = new DOMParser();
        const doc3 = parser.parseFromString(html, 'text/html');
        updateSidebarChecklist(doc3, markdownInput, onUpdate);
        
        if (styleConfig.showVersion) {
            const versionStr = getDailyVersionString();
            finalHtml = html + `<div class="resume-version-footer">${versionStr}</div>`;
        }
    }

    // Temp wrapper to justify paragraph blocks containing bullets
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = finalHtml;
    const paragraphs = tempDiv.querySelectorAll('p');
    paragraphs.forEach(p => {
        const text = p.textContent;
        if (text.includes('•') || text.includes('·')) {
            p.style.textAlign = 'justify';
            p.style.textJustify = 'inter-word';
        }
    });
    finalHtml = tempDiv.innerHTML;

    // Dynamic title configuration for PDF filename proposal on printing ($name-resume-$date.pdf format)
    const titleParser = new DOMParser();
    const titleDoc = titleParser.parseFromString(finalHtml, 'text/html');
    const firstHeader = titleDoc.querySelector('h1');
    let nameKey = "resume";
    if (firstHeader) {
        const cleanNameText = firstHeader.textContent.replace(/\([^)]*\)/g, '');
        const slugifyName = (text) => {
            return text.toString().toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        };
        const parts = cleanNameText.split(/\s+/).map(slugifyName).filter(Boolean);
        if (parts.length > 0) {
            nameKey = parts.join('-');
        }
    }

    const today = new Date().toISOString().split('T')[0];
    const currentResumeTitle = `${nameKey}-resume-${today}`;

    return {
        html: finalHtml,
        tokens: tokens,
        resumeTitle: currentResumeTitle,
        warnings: { contactUnclosed: contact.unclosed }
    };
}
