let lastSectionsJSON = "";

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
            resumeTitle: "resume"
        };
    }

    // Configure Marked.js
    marked.setOptions({
        gfm: true,
        breaks: true
    });

    // 1. Pre-process custom directives: :accent[text] and :muted[text]
    let processedMd = mdText;
    processedMd = processedMd.replace(/:accent\[([^\]]+)\]/g, '<span class="resume-accent">$1</span>');
    processedMd = processedMd.replace(/:muted\[([^\]]+)\]/g, '<span class="resume-muted">$1</span>');

    // Tokenize and calculate raw source offsets
    const tokens = marked.lexer(processedMd);
    let currentOffset = 0;
    tokens.forEach(token => {
        token.startOffset = currentOffset;
        token.endOffset = currentOffset + token.raw.length;
        currentOffset += token.raw.length;
    });

    // Compile markdown to HTML
    let html = marked.parse(processedMd);

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

    // 2. Post-process contact block if present: e.g. [CONTACT : text]
    html = html.replace(/\[CONTACT\s*:\s*([^\]]+)\]/gi, (match, contents) => {
        const parts = contents.split('|').map(p => p.trim());
        const formattedParts = parts.map(part => {
            if (part.includes('@') && !part.includes(' ')) {
                return `<a href="mailto:${part}">${part}</a>`;
            }
            if (part.startsWith('http://') || part.startsWith('https://')) {
                const cleanUrl = part.replace(/^https?:\/\/(www\.)?/, '');
                return `<a href="${part}" target="_blank">${cleanUrl}</a>`;
            }
            return `<span>${part}</span>`;
        });
        return `<div class="resume-contact-bar">${formattedParts.join(' &nbsp;•&nbsp; ')}</div>`;
    });

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

    // Dynamic title configuration for PDF filename proposal on printing
    const titleParser = new DOMParser();
    const titleDoc = titleParser.parseFromString(finalHtml, 'text/html');
    const firstHeader = titleDoc.querySelector('h1');
    let nameKey = "resume";
    if (firstHeader) {
        const cleanNameText = firstHeader.textContent.replace(/\([^)]*\)/g, '');
        const slugify = (text) => {
            return text.toString().toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '');
        };
        const nameParts = cleanNameText.split(/\s+/).map(slugify).filter(Boolean);
        if (nameParts.length >= 2) {
            nameKey = nameParts.at(0).charAt(0) + nameParts.at(-1);
        } else if (nameParts.length === 1) {
            nameKey = nameParts[0];
        }
    }

    let positionKey = "";
    if (firstHeader) {
        let sibling = firstHeader.nextElementSibling;
        while (sibling && (sibling.classList.contains('resume-contact-bar') || sibling.tagName !== 'P')) {
            sibling = sibling.nextElementSibling;
        }
        if (sibling && sibling.tagName === 'P') {
            const slugifyPosition = (text) => {
                return text.toString().toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '_')
                    .replace(/^_+|_+$/g, '');
            };
            positionKey = slugifyPosition(sibling.textContent);
        }
    }

    let currentResumeTitle = nameKey;
    if (positionKey) {
        currentResumeTitle = `${nameKey}_${positionKey}`;
    }

    return {
        html: finalHtml,
        tokens: tokens,
        resumeTitle: currentResumeTitle
    };
}
