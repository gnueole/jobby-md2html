/**
 * Jobby Markdown Editor - syntax.js
 * Textarea markdown syntax highlighting overlay.
 * Refactored from app.js to modularize the syntax highlighter system.
 */

const syntaxHighlightCache = new Map();

function escapeHTML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function highlightMarkdown(text) {
    if (!text) return "";
    
    // Prevent indefinite cache growth
    if (syntaxHighlightCache.size > 10000) {
        syntaxHighlightCache.clear();
    }

    const lines = text.split('\n');
    const highlightedLines = lines.map(line => {
        if (syntaxHighlightCache.has(line)) {
            return syntaxHighlightCache.get(line);
        }

        let escaped = escapeHTML(line);
        let highlighted = escaped;
        
        // 1. Headings
        const headingMatch = escaped.match(/^(\s*)(#{1,6})(\s+)(.*)$/);
        if (headingMatch) {
            const [_, indent, hashes, spaces, content] = headingMatch;
            highlighted = `${indent}<span class="md-hash">${hashes}</span>${spaces}<span class="md-heading">${content}</span>`;
        } else {
            // 2b. Blockquotes: > text
            const quoteMatch = escaped.match(/^(\s*&gt;)(\s*)(.*)$/);
            if (quoteMatch) {
                const [_, gtSym, spaces, content] = quoteMatch;
                let highlightedContent = content;
                highlightedContent = highlightedContent.replace(/\*\*(.*?)\*\*/g, '<span class="md-bold">**$1**</span>');
                highlightedContent = highlightedContent.replace(/\*(.*?)\*/g, '<span class="md-italic">*$1*</span>');
                highlightedContent = highlightedContent.replace(/_(.*?)_/g, '<span class="md-italic">_$1_</span>');
                highlightedContent = highlightedContent.replace(/\[(.*?)\]\((.*?)\)/g, '<span class="md-link-text">[$1]</span><span class="md-link-url">($2)</span>');
                highlightedContent = highlightedContent.replace(/`(.*?)`/g, '<span class="md-inline-code">`$1`</span>');

                highlighted = `<span class="md-quote-symbol">${gtSym}</span>${spaces}<span class="md-quote-text">${highlightedContent}</span>`;
            } else {
                // 2. Bullet Lists - escape asterisks as HTML entities to prevent cross-tagging
                const bulletMatch = escaped.match(/^(\s*([-\*])\s+)(.*)$/);
                if (bulletMatch) {
                    const [_, prefix, char, rest] = bulletMatch;
                    const safeChar = char === '*' ? '&#42;' : char;
                    const bullet = prefix.replace(char, safeChar);
                    escaped = `<span class="md-bullet">${bullet}</span>${rest}`;
                }

                // 3. Bold: **text**
                escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<span class="md-bold">**$1**</span>');

                // 4. Italic: *text* or _text_
                escaped = escaped.replace(/\*(.*?)\*/g, '<span class="md-italic">*$1*</span>');
                escaped = escaped.replace(/_(.*?)_/g, '<span class="md-italic">_$1_</span>');

                // 5. Links: [text](url)
                escaped = escaped.replace(/\[(.*?)\]\((.*?)\)/g, '<span class="md-link-text">[$1]</span><span class="md-link-url">($2)</span>');

                // 6. Inline backticks
                escaped = escaped.replace(/`(.*?)`/g, '<span class="md-inline-code">`$1`</span>');

                highlighted = escaped;
            }
        }

        syntaxHighlightCache.set(line, highlighted);
        return highlighted;
    });

    return highlightedLines.join('\n') + (text.endsWith('\n') ? '\n' : '');
}

export function updateSyntaxHighlight(markdownInput, highlightCode, cbSyntaxHighlight) {
    if (highlightCode && cbSyntaxHighlight && cbSyntaxHighlight.checked) {
        highlightCode.innerHTML = highlightMarkdown(markdownInput.value);
    }
}

export function initSyntaxHighlighting(markdownInput, markdownHighlight, cbSyntaxHighlight, textareaWrapper, highlightCode) {
    if (markdownInput && markdownHighlight) {
        // Scroll synchronization
        markdownInput.addEventListener('scroll', () => {
            markdownHighlight.scrollTop = markdownInput.scrollTop;
            markdownHighlight.scrollLeft = markdownInput.scrollLeft;
        });
    }

    if (cbSyntaxHighlight) {
        // Load default/saved preference
        const savedSyntax = localStorage.getItem('syntax_highlight_active') !== 'false';
        cbSyntaxHighlight.checked = savedSyntax;
        if (textareaWrapper) {
            textareaWrapper.classList.toggle('syntax-active', savedSyntax);
        }

        cbSyntaxHighlight.addEventListener('change', () => {
            const active = cbSyntaxHighlight.checked;
            localStorage.setItem('syntax_highlight_active', active);
            if (textareaWrapper) {
                textareaWrapper.classList.toggle('syntax-active', active);
            }
            if (active) {
                updateSyntaxHighlight(markdownInput, highlightCode, cbSyntaxHighlight);
                if (markdownHighlight) {
                    markdownHighlight.scrollTop = markdownInput.scrollTop;
                    markdownHighlight.scrollLeft = markdownInput.scrollLeft;
                }
            }
        });
    }
}
