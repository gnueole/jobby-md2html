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
            const [, indent, hashes, spaces, content] = headingMatch;
            highlighted = `${indent}<span class="md-hash">${hashes}</span>${spaces}<span class="md-heading">${content}</span>`;
        } else {
            // 2b. Blockquotes: > text
            const quoteMatch = escaped.match(/^(\s*&gt;)(\s*)(.*)$/);
            if (quoteMatch) {
                const [, gtSym, spaces, content] = quoteMatch;
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
                    const [, prefix, char, rest] = bulletMatch;
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

// --- Unbalanced bracket marks ---
// A missing "]" is the mistake that once swallowed a whole resume into the contact bar,
// so the editor points it out where it is typed. Square brackets are checked everywhere:
// in a resume they are nearly always syntax (links, [CONTACT : …], :accent[…]). Round
// ones only right after "](", where a missing ")" breaks a link: prose is full of
// legitimately unbalanced parentheses. Code spans and fences are skipped.
const BRACKET_MARK_DELAY = 900;
let bracketMarkTimer = null;

// A block ends at a blank line, and each heading, list item or quote line starts one:
// a bracket left open in one block never colours the rest of the document.
const BLOCK_START = /^(#{1,6}\s|[-*+]\s|>|\d+[.)]\s)/;

// Returns the offsets of unclosed openers and of extra closers in `text`.
export function findBracketIssues(text) {
    const unclosed = [];
    const extra = [];
    let squares = [];
    let linkParens = [];
    const endBlock = () => {
        // Only the link's own "(" is reported: parentheses after it are nested ones
        // (A_(b) in a URL) or, once the link is left open, plain prose.
        unclosed.push(...squares, ...linkParens.slice(0, 1));
        squares = [];
        linkParens = [];
    };

    let offset = 0;
    let inFence = false;
    for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (/^(```|~~~)/.test(trimmed)) {
            endBlock();
            inFence = !inFence;
        } else if (!inFence) {
            if (trimmed === '' || BLOCK_START.test(trimmed)) endBlock();
            let inCode = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '`') {
                    inCode = !inCode;
                    continue;
                }
                if (inCode) continue;
                if (ch === '\\') {
                    i++;
                    continue;
                }
                const pos = offset + i;
                if (ch === '[') {
                    squares.push(pos);
                } else if (ch === ']') {
                    if (squares.length) squares.pop();
                    else extra.push(pos);
                    if (line[i + 1] === '(') {
                        linkParens.push(pos + 1);
                        i++;
                    }
                } else if (linkParens.length && ch === '(') {
                    linkParens.push(pos);
                } else if (linkParens.length && ch === ')') {
                    linkParens.pop();
                }
            }
            if (/^#{1,6}\s/.test(trimmed)) endBlock();
        }
        offset += line.length + 1;
    }
    endBlock();
    return { unclosed, extra };
}

// Wraps the flagged characters of the rendered overlay. Colour, background and
// underline only: anything that changes a glyph's width would put the caret out of
// step with the text again (see toolkit/test_editor_overlay.js).
function markBracketIssues(highlightCode, text) {
    // The overlay mirrors the textarea character for character, plus one trailing
    // newline it adds to keep its height. Anything else means it is stale: mark nothing
    // rather than the wrong character.
    const shown = highlightCode.textContent;
    if (shown !== text && shown !== text + '\n') return;

    const { unclosed, extra } = findBracketIssues(text);
    const marks = [...unclosed.map(p => [p, 'md-bracket-unclosed']), ...extra.map(p => [p, 'md-bracket-extra'])];
    if (!marks.length) return;

    const nodes = [];
    const walker = document.createTreeWalker(highlightCode, NodeFilter.SHOW_TEXT);
    let start = 0;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        nodes.push({ node: n, start });
        start += n.nodeValue.length;
    }
    // Last position first: splitting a node never moves the text before the split
    marks.sort((a, b) => b[0] - a[0]);
    for (const [pos, className] of marks) {
        const hit = nodes.findLast(n => n.start <= pos);
        if (!hit || pos - hit.start >= hit.node.nodeValue.length) continue;
        const target = hit.node.splitText(pos - hit.start);
        target.splitText(1);
        const span = document.createElement('span');
        span.className = className;
        target.parentNode.replaceChild(span, target);
        span.appendChild(target);
    }
}

// Every re-render clears the marks; they come back once typing pauses, since a bracket
// is legitimately open while it is being written.
function scheduleBracketMarks(markdownInput, highlightCode) {
    clearTimeout(bracketMarkTimer);
    bracketMarkTimer = setTimeout(() => markBracketIssues(highlightCode, markdownInput.value), BRACKET_MARK_DELAY);
}

export function updateSyntaxHighlight(markdownInput, highlightCode, cbSyntaxHighlight) {
    if (highlightCode && cbSyntaxHighlight && cbSyntaxHighlight.checked) {
        highlightCode.innerHTML = highlightMarkdown(markdownInput.value);
        scheduleBracketMarks(markdownInput, highlightCode);
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
