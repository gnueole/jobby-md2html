/**
 * Jobby Markdown Editor - highlight.js
 * Syntax highlighting and editor cursor radar sync.
 */

import { cleanMarkdown, countNonWsChars } from './utils.js';

export function initHighlighting(markdownInput, resumeOutput, state) {
    if (!markdownInput || !resumeOutput) return;

    function highlightNonWsRangeInElement(element, startNonWsCount, targetNonWsLen) {
        if (targetNonWsLen <= 0) return;

        let currentNonWsCount = 0;
        const endNonWsCount = startNonWsCount + targetNonWsLen;

        function walk(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const content = node.nodeValue;
                const parent = node.parentNode;

                let nodeNonWsCount = 0;
                const nonWsIndices = [];
                for (let i = 0; i < content.length; i++) {
                    if (!/\s/.test(content.charAt(i))) {
                        nonWsIndices.push(i);
                        nodeNonWsCount++;
                    }
                }

                const nodeStartNonWs = currentNonWsCount;
                const nodeEndNonWs = currentNonWsCount + nodeNonWsCount;

                if (nodeEndNonWs > startNonWsCount && nodeStartNonWs < endNonWsCount) {
                    const overlapStartNonWsIdx = Math.max(0, startNonWsCount - nodeStartNonWs);
                    const overlapEndNonWsIdx = Math.min(nodeNonWsCount, endNonWsCount - nodeStartNonWs);

                    const charStart = nonWsIndices.at(overlapStartNonWsIdx);
                    const charEnd = nonWsIndices.at(overlapEndNonWsIdx - 1) + 1;

                    if (parent && parent.tagName !== 'MARK' && parent.tagName !== 'SCRIPT' && parent.tagName !== 'STYLE') {
                        const fragment = document.createDocumentFragment();

                        if (charStart > 0) {
                            fragment.appendChild(document.createTextNode(content.substring(0, charStart)));
                        }

                        const mark = document.createElement('mark');
                        mark.className = 'editor-twin-highlight';
                        mark.textContent = content.substring(charStart, charEnd);
                        fragment.appendChild(mark);

                        if (charEnd < content.length) {
                            fragment.appendChild(document.createTextNode(content.substring(charEnd)));
                        }

                        parent.replaceChild(fragment, node);
                    }
                }
                currentNonWsCount += nodeNonWsCount;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName !== 'MARK' && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                    const children = Array.from(node.childNodes);
                    for (let child of children) {
                        walk(child);
                    }
                }
            }
        }

        walk(element);
    }

    function handleSelectionChange() {
        if (!markdownInput || !resumeOutput || !state.currentTokens || state.currentTokens.length === 0) return;

        const start = markdownInput.selectionStart;
        const end = markdownInput.selectionEnd;

        if (start === end) {
            if (state.isHighlightActive) {
                resumeOutput.innerHTML = state.lastCleanHTML;
                state.isHighlightActive = false;
            }
            return;
        }

        // Find all tokens overlapping with the selection [start, end]
        const overlappingTokens = state.currentTokens.filter(token => {
            return token.endOffset > start && token.startOffset < end;
        });

        if (overlappingTokens.length === 0) return;

        // Restore HTML first
        resumeOutput.innerHTML = state.lastCleanHTML;
        state.isHighlightActive = false;

        let firstHighlightEl = null;

        overlappingTokens.forEach(token => {
            const tokenIndex = state.currentTokens.indexOf(token);
            const activeEl = resumeOutput.querySelector(`[data-token-index="${tokenIndex}"]`);
            if (!activeEl) return;

            const overlapStart = Math.max(token.startOffset, start);
            const overlapEnd = Math.min(token.endOffset, end);

            if (overlapStart >= overlapEnd) return;

            const tokenRelativeStart = overlapStart - token.startOffset;
            const tokenRelativeEnd = overlapEnd - token.startOffset;

            const prefix = token.raw.substring(0, tokenRelativeStart);
            const selectedText = token.raw.substring(tokenRelativeStart, tokenRelativeEnd);

            const cleanPrefix = cleanMarkdown(prefix);
            const cleanSelected = cleanMarkdown(selectedText);

            const startNonWsCount = countNonWsChars(cleanPrefix);
            const targetNonWsLen = countNonWsChars(cleanSelected);

            if (targetNonWsLen > 0) {
                highlightNonWsRangeInElement(activeEl, startNonWsCount, targetNonWsLen);

                if (!firstHighlightEl) {
                    firstHighlightEl = activeEl.querySelector('.editor-twin-highlight');
                }
                state.isHighlightActive = true;
            }
        });

        if (firstHighlightEl) {
            firstHighlightEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    let selectionTimeout;
    document.addEventListener('selectionchange', () => {
        if (document.activeElement === markdownInput) {
            clearTimeout(selectionTimeout);
            selectionTimeout = setTimeout(handleSelectionChange, 150);
        }
    });
}

export function getCursorCoordinates(textarea, selectionStart) {
    let mirror = document.getElementById('textarea-mirror');
    if (!mirror) {
        mirror = document.createElement('div');
        mirror.id = 'textarea-mirror';
        document.body.appendChild(mirror);
    }

    const styles = window.getComputedStyle(textarea);

    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordBreak = 'break-word';
    mirror.style.overflow = 'hidden';

    mirror.style.width = textarea.clientWidth + 'px';
    mirror.style.boxSizing = 'border-box';

    mirror.style.fontFamily = styles.fontFamily;
    mirror.style.fontSize = styles.fontSize;
    mirror.style.fontWeight = styles.fontWeight;
    mirror.style.fontStyle = styles.fontStyle;
    mirror.style.lineHeight = styles.lineHeight;
    mirror.style.paddingTop = styles.paddingTop;
    mirror.style.paddingRight = styles.paddingRight;
    mirror.style.paddingBottom = styles.paddingBottom;
    mirror.style.paddingLeft = styles.paddingLeft;

    const text = textarea.value.substring(0, selectionStart);
    mirror.textContent = text;

    const marker = document.createElement('span');
    marker.textContent = '|';
    mirror.appendChild(marker);

    const markerOffsetLeft = marker.offsetLeft;
    const markerOffsetTop = marker.offsetTop;

    const rect = textarea.getBoundingClientRect();

    let lineHeight = parseFloat(styles.lineHeight);
    if (isNaN(lineHeight)) {
        const fontSize = parseFloat(styles.fontSize) || 12.5;
        lineHeight = fontSize * 1.5;
    }

    const x = rect.left + window.scrollX + markerOffsetLeft - textarea.scrollLeft;
    const y = rect.top + window.scrollY + markerOffsetTop - textarea.scrollTop + (lineHeight / 2);

    return { x, y };
}

export function showFlashingCursorRadar(markdownInput) {
    if (!markdownInput) return;

    const selectionStart = markdownInput.selectionStart;
    const coords = getCursorCoordinates(markdownInput, selectionStart);

    let radar = document.getElementById('editor-cursor-radar');
    if (!radar) {
        radar = document.createElement('div');
        radar.id = 'editor-cursor-radar';
        radar.className = 'cursor-radar';

        const r1 = document.createElement('div');
        r1.className = 'ripple ripple-1';
        const r2 = document.createElement('div');
        r2.className = 'ripple ripple-2';
        const r3 = document.createElement('div');
        r3.className = 'ripple ripple-3';

        radar.appendChild(r1);
        radar.appendChild(r2);
        radar.appendChild(r3);
        document.body.appendChild(radar);
    }

    radar.style.left = `${coords.x}px`;
    radar.style.top = `${coords.y}px`;

    radar.classList.remove('show');
    void radar.offsetWidth; // Force animation reflow
    radar.classList.add('show');

    let cursorRadarTimeout;
    clearTimeout(cursorRadarTimeout);
    cursorRadarTimeout = setTimeout(() => {
        radar.classList.remove('show');
    }, 2000);
}

export function initCursorRadar(markdownInput) {
    if (!markdownInput) return;

    const handleArrowNav = (e) => {
        const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'];
        if (arrowKeys.includes(e.key)) {
            setTimeout(() => {
                showFlashingCursorRadar(markdownInput);
            }, 0);
        }
    };

    markdownInput.addEventListener('keydown', handleArrowNav);
    markdownInput.addEventListener('keyup', handleArrowNav);
}

export function initBidirectionalSync(markdownInput, resumeOutput, canvasWrapper, state) {
    if (!canvasWrapper || !resumeOutput || !markdownInput) return;

    let clickStartX = 0;
    let clickStartY = 0;

    canvasWrapper.addEventListener('mousedown', (e) => {
        clickStartX = e.clientX;
        clickStartY = e.clientY;
    });

    resumeOutput.addEventListener('click', (e) => {
        // Prevent cursor mapping if user was dragging/panning
        const deltaX = Math.abs(e.clientX - clickStartX);
        const deltaY = Math.abs(e.clientY - clickStartY);
        if (deltaX > 5 || deltaY > 5) return;

        const targetEl = e.target;
        if (!targetEl || targetEl === resumeOutput) return;

        // Find the closest ancestor block mapped to an AST token
        const tokenEl = targetEl.closest('[data-token-index]');
        if (!tokenEl) return;

        const tokenIndex = parseInt(tokenEl.getAttribute('data-token-index'), 10);
        if (isNaN(tokenIndex) || !state.currentTokens || !state.currentTokens[tokenIndex]) return;

        const token = state.currentTokens[tokenIndex];
        const mdText = markdownInput.value;
        const tokenRaw = mdText.substring(token.startOffset, token.endOffset);

        let offset = token.startOffset;
        const targetText = targetEl.textContent.trim();

        if (targetText.length > 0) {
            // Try exact match within the token raw block
            let relativeIdx = tokenRaw.indexOf(targetText);

            // If not found, try a fuzzy match by stripping formatting chars from a snippet
            if (relativeIdx === -1) {
                const cleanSnippet = targetText.substring(0, 15).replace(/[\*\#_`~\[\]]/g, '').trim();
                if (cleanSnippet.length >= 3) {
                    relativeIdx = tokenRaw.indexOf(cleanSnippet);
                }
            }

            if (relativeIdx !== -1) {
                offset = token.startOffset + relativeIdx;
            }
        }

        // Focus the editor and set cursor position
        markdownInput.focus();
        markdownInput.setSelectionRange(offset, offset);

        // Scroll the editor to make the cursor visible
        const textUpToCursor = mdText.substring(0, offset);
        const lineCount = textUpToCursor.split('\n').length;
        const lineHeight = parseFloat(window.getComputedStyle(markdownInput).lineHeight);
        markdownInput.scrollTop = Math.max(0, (lineCount - 4) * lineHeight);

        // Show flashing cursor radar echo
        setTimeout(() => {
            showFlashingCursorRadar(markdownInput);
        }, 100);
    });
}
