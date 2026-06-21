/**
 * Jobby Markdown Editor - shortcuts.js
 * Editor keyboard shortcuts and line/section reordering.
 */

export function applyHeading(markdownInput, level) {
    const text = markdownInput.value;
    const start = markdownInput.selectionStart;
    const end = markdownInput.selectionEnd;
    
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = text.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = text.length;
    
    const before = text.substring(0, lineStart);
    const after = text.substring(lineEnd);
    const lineText = text.substring(lineStart, lineEnd);
    
    const cleanedLine = lineText.replace(/^#{1,6}\s*/, '');
    const hashes = '#'.repeat(level) + ' ';
    const newLineText = hashes + cleanedLine;
    
    markdownInput.value = before + newLineText + after;
    const offset = newLineText.length - lineText.length;
    markdownInput.setSelectionRange(start + offset, end + offset);
    markdownInput.dispatchEvent(new Event('input'));
}

export function moveLine(markdownInput, direction) {
    const text = markdownInput.value;
    const start = markdownInput.selectionStart;
    const end = markdownInput.selectionEnd;
    
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = text.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = text.length;
    
    const selectedLines = text.substring(lineStart, lineEnd);
    
    if (direction === -1) { // Move Up
        if (lineStart === 0) return;
        const prevLineStart = text.lastIndexOf('\n', lineStart - 2) + 1;
        const prevLine = text.substring(prevLineStart, lineStart - 1);
        
        const before = text.substring(0, prevLineStart);
        const after = text.substring(lineEnd);
        
        markdownInput.value = before + selectedLines + '\n' + prevLine + after;
        markdownInput.setSelectionRange(prevLineStart, prevLineStart + selectedLines.length);
    } else { // Move Down
        if (lineEnd === text.length) return;
        let nextLineEnd = text.indexOf('\n', lineEnd + 1);
        if (nextLineEnd === -1) nextLineEnd = text.length;
        const nextLine = text.substring(lineEnd + 1, nextLineEnd);
        
        const before = text.substring(0, lineStart);
        const after = text.substring(nextLineEnd);
        
        markdownInput.value = before + nextLine + '\n' + selectedLines + after;
        const newStart = lineStart + nextLine.length + 1;
        markdownInput.setSelectionRange(newStart, newStart + selectedLines.length);
    }
}

export function moveSectionOrLine(markdownInput, direction) {
    const text = markdownInput.value;
    const start = markdownInput.selectionStart;
    const end = markdownInput.selectionEnd;
    
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = text.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = text.length;
    
    const selectionFirstLine = text.substring(lineStart, text.indexOf('\n', lineStart) === -1 ? text.length : text.indexOf('\n', lineStart));
    const headingMatch = selectionFirstLine.match(/^(\s*)(#{1,6})\s+/);
    
    if (headingMatch) {
        const level = headingMatch[2].length;
        const lines = text.split('\n');
        
        let currentLineIdx = -1;
        let currentPos = 0;
        const linePositions = [];
        for (let i = 0; i < lines.length; i++) {
            linePositions.push(currentPos);
            if (currentPos === lineStart) {
                currentLineIdx = i;
            }
            currentPos += lines[i].length + 1;
        }
        
        if (currentLineIdx === -1) {
            moveLine(markdownInput, direction);
            return;
        }
        
        let currentSectionEndLineIdx = lines.length - 1;
        for (let i = currentLineIdx + 1; i < lines.length; i++) {
            const match = lines[i].match(/^(\s*)(#{1,6})\s+/);
            if (match) {
                const headingLevel = match[2].length;
                if (headingLevel <= level) {
                    currentSectionEndLineIdx = i - 1;
                    break;
                }
            }
        }
        
        const sectionStartChar = linePositions[currentLineIdx];
        const sectionEndChar = currentSectionEndLineIdx === lines.length - 1 
            ? text.length 
            : linePositions[currentSectionEndLineIdx + 1] - 1;
        
        const sectionText = text.substring(sectionStartChar, sectionEndChar);
        
        if (direction === -1) { // Move Up
            let prevSiblingHeadingLineIdx = -1;
            for (let i = currentLineIdx - 1; i >= 0; i--) {
                const match = lines[i].match(/^(\s*)(#{1,6})\s+/);
                if (match) {
                    const headingLevel = match[2].length;
                    if (headingLevel === level) {
                        prevSiblingHeadingLineIdx = i;
                        break;
                    } else if (headingLevel < level) {
                        break;
                    }
                }
            }
            
            if (prevSiblingHeadingLineIdx === -1) {
                return;
            }
            
            const prevStartChar = linePositions[prevSiblingHeadingLineIdx];
            const prevEndChar = sectionStartChar - 1;
            
            const prevSectionText = text.substring(prevStartChar, prevEndChar);
            const before = text.substring(0, prevStartChar);
            const after = text.substring(sectionEndChar);
            
            markdownInput.value = before + sectionText + '\n' + prevSectionText + after;
            markdownInput.setSelectionRange(prevStartChar, prevStartChar + sectionText.length);
        } else { // Move Down
            let nextSiblingHeadingLineIdx = -1;
            for (let i = currentSectionEndLineIdx + 1; i < lines.length; i++) {
                const match = lines[i].match(/^(\s*)(#{1,6})\s+/);
                if (match) {
                    const headingLevel = match[2].length;
                    if (headingLevel === level) {
                        nextSiblingHeadingLineIdx = i;
                        break;
                    } else if (headingLevel < level) {
                        break;
                    }
                }
            }
            
            if (nextSiblingHeadingLineIdx === -1) {
                return;
            }
            
            let nextSectionEndLineIdx = lines.length - 1;
            for (let i = nextSiblingHeadingLineIdx + 1; i < lines.length; i++) {
                const match = lines[i].match(/^(\s*)(#{1,6})\s+/);
                if (match) {
                    const headingLevel = match[2].length;
                    if (headingLevel <= level) {
                        nextSectionEndLineIdx = i - 1;
                        break;
                    }
                }
            }
            
            const nextStartChar = linePositions[nextSiblingHeadingLineIdx];
            const nextEndChar = nextSectionEndLineIdx === lines.length - 1
                ? text.length
                : linePositions[nextSectionEndLineIdx + 1] - 1;
            
            const nextSectionText = text.substring(nextStartChar, nextEndChar);
            const before = text.substring(0, sectionStartChar);
            const after = text.substring(nextEndChar);
            
            markdownInput.value = before + nextSectionText + '\n' + sectionText + after;
            const newStart = sectionStartChar + nextSectionText.length + 1;
            markdownInput.setSelectionRange(newStart, newStart + sectionText.length);
        }
    } else {
        moveLine(markdownInput, direction);
    }
    
    markdownInput.dispatchEvent(new Event('input'));
}

export function toggleFormatting(markdownInput, symbol) {
    const start = markdownInput.selectionStart;
    const end = markdownInput.selectionEnd;
    const value = markdownInput.value;
    const symLen = symbol.length;
    
    let s = start;
    let eSel = end;
    let sel = value.substring(s, eSel);

    const matchLeading = sel.match(/^\s+/);
    const matchTrailing = sel.match(/\s+$/);
    const leading = matchLeading ? matchLeading[0] : '';
    const trailing = matchTrailing ? matchTrailing[0] : '';
    
    let trimmed = sel.substring(leading.length, sel.length - trailing.length);
    let trimStart = s + leading.length;
    let trimEnd = eSel - trailing.length;

    if (trimmed.startsWith(symbol) && trimmed.endsWith(symbol) && trimmed.length >= symLen * 2) {
        const unwrapped = trimmed.substring(symLen, trimmed.length - symLen);
        const newText = leading + unwrapped + trailing;
        
        markdownInput.value = value.substring(0, start) + newText + value.substring(end);
        const newStart = start + leading.length;
        const newEnd = newStart + unwrapped.length;
        markdownInput.setSelectionRange(newStart, newEnd);
        markdownInput.dispatchEvent(new Event('input'));
        return;
    }

    const hasOutsideSymbol = 
        trimStart - symLen >= 0 &&
        trimEnd + symLen <= value.length &&
        value.substring(trimStart - symLen, start) === symbol &&
        value.substring(end, end + symLen) === symbol;

    if (hasOutsideSymbol) {
        const unwrapped = trimmed;
        markdownInput.value = value.substring(0, trimStart - symLen) + unwrapped + value.substring(trimEnd + symLen);
        
        const newStart = trimStart - symLen;
        const newEnd = newStart + unwrapped.length;
        markdownInput.setSelectionRange(newStart, newEnd);
        markdownInput.dispatchEvent(new Event('input'));
        return;
    }

    if (!trimmed) {
        const newText = leading + symbol + symbol + trailing;
        markdownInput.value = value.substring(0, start) + newText + value.substring(end);
        const newCursorPos = start + leading.length + symLen;
        markdownInput.setSelectionRange(newCursorPos, newCursorPos);
    } else {
        const wrapped = symbol + trimmed + symbol;
        const newText = leading + wrapped + trailing;
        markdownInput.value = value.substring(0, start) + newText + value.substring(end);
        const newStart = start + leading.length;
        const newEnd = newStart + wrapped.length;
        markdownInput.setSelectionRange(newStart, newEnd);
    }
    markdownInput.dispatchEvent(new Event('input'));
}

export function toggleAsymmetricFormatting(markdownInput, prefix, suffix) {
    const start = markdownInput.selectionStart;
    const end = markdownInput.selectionEnd;
    const value = markdownInput.value;
    const preLen = prefix.length;
    const sufLen = suffix.length;
    
    let s = start;
    let eSel = end;
    let sel = value.substring(s, eSel);

    const matchLeading = sel.match(/^\s+/);
    const matchTrailing = sel.match(/\s+$/);
    const leading = matchLeading ? matchLeading[0] : '';
    const trailing = matchTrailing ? matchTrailing[0] : '';

    let trimmed = sel.substring(leading.length, sel.length - trailing.length);
    let trimStart = s + leading.length;
    let trimEnd = eSel - trailing.length;

    if (trimmed.startsWith(prefix) && trimmed.endsWith(suffix) && trimmed.length >= preLen + sufLen) {
        const unwrapped = trimmed.substring(preLen, trimmed.length - sufLen);
        const newText = leading + unwrapped + trailing;
        
        markdownInput.value = value.substring(0, start) + newText + value.substring(end);
        const newStart = start + leading.length;
        const newEnd = newStart + unwrapped.length;
        markdownInput.setSelectionRange(newStart, newEnd);
        markdownInput.dispatchEvent(new Event('input'));
        return;
    }

    const hasOutsideSymbol = 
        trimStart - preLen >= 0 &&
        trimEnd + sufLen <= value.length &&
        value.substring(trimStart - preLen, trimStart) === prefix &&
        value.substring(trimEnd, trimEnd + sufLen) === suffix;

    if (hasOutsideSymbol) {
        const unwrapped = trimmed;
        markdownInput.value = value.substring(0, trimStart - preLen) + unwrapped + value.substring(trimEnd + sufLen);
        
        const newStart = trimStart - preLen;
        const newEnd = newStart + unwrapped.length;
        markdownInput.setSelectionRange(newStart, newEnd);
        markdownInput.dispatchEvent(new Event('input'));
        return;
    }

    if (!trimmed) {
        const newText = leading + prefix + suffix + trailing;
        markdownInput.value = value.substring(0, start) + newText + value.substring(end);
        const newCursorPos = start + leading.length + preLen;
        markdownInput.setSelectionRange(newCursorPos, newCursorPos);
    } else {
        const wrapped = prefix + trimmed + suffix;
        const newText = leading + wrapped + trailing;
        markdownInput.value = value.substring(0, start) + newText + value.substring(end);
        const newStart = start + leading.length;
        const newEnd = newStart + wrapped.length;
        markdownInput.setSelectionRange(newStart, newEnd);
    }
    markdownInput.dispatchEvent(new Event('input'));
}

export function toggleAccent(markdownInput) {
    toggleAsymmetricFormatting(markdownInput, ':accent[', ']');
}

export function toggleMuted(markdownInput) {
    toggleAsymmetricFormatting(markdownInput, ':muted[', ']');
}

export function toggleFormattingPrefix(markdownInput, prefix) {
    const start = markdownInput.selectionStart;
    const end = markdownInput.selectionEnd;
    const value = markdownInput.value;
    
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = value.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = value.length;
    
    const before = value.substring(0, lineStart);
    const after = value.substring(lineEnd);
    const lineText = value.substring(lineStart, lineEnd);
    
    let newLineText;
    if (lineText.startsWith(prefix)) {
        newLineText = lineText.substring(prefix.length);
    } else {
        newLineText = prefix + lineText;
    }
    
    markdownInput.value = before + newLineText + after;
    const offset = newLineText.length - lineText.length;
    markdownInput.setSelectionRange(start + offset, end + offset);
    markdownInput.dispatchEvent(new Event('input'));
}

export function insertLink(markdownInput) {
    const start = markdownInput.selectionStart;
    const end = markdownInput.selectionEnd;
    const value = markdownInput.value;
    const selection = value.substring(start, end);

    const replaceSelection = (newText, cursorOffset = 0) => {
        markdownInput.value = value.substring(0, start) + newText + value.substring(end);
        const newCursorPos = start + newText.length - cursorOffset;
        markdownInput.setSelectionRange(newCursorPos, newCursorPos);
        markdownInput.dispatchEvent(new Event('input'));
    };

    const matchLeading = selection.match(/^\s+/);
    const matchTrailing = selection.match(/\s+$/);
    const leading = matchLeading ? matchLeading[0] : '';
    const trailing = matchTrailing ? matchTrailing[0] : '';
    const trimmed = selection.substring(leading.length, selection.length - trailing.length);

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('mailto:')) {
        replaceSelection(`${leading}[Link](${trimmed})${trailing}`, 0);
    } else {
        const url = prompt("Enter URL:", "https://");
        if (url) {
            const newText = `${leading}[${trimmed || 'Link'}](${url})${trailing}`;
            markdownInput.value = value.substring(0, start) + newText + value.substring(end);
            const newCursorPos = start + leading.length + `[${trimmed || 'Link'}](${url})`.length;
            markdownInput.setSelectionRange(newCursorPos, newCursorPos);
            markdownInput.dispatchEvent(new Event('input'));
        }
    }
}

const shortcutHandlers = {
    'b': (input) => toggleFormatting(input, '**'),
    'i': (input) => toggleFormatting(input, '*'),
    'e': (input) => toggleAccent(input),
    'm': (input) => toggleMuted(input),
    'k': (input) => insertLink(input),
    '1': (input) => applyHeading(input, 1),
    '2': (input) => applyHeading(input, 2),
    '3': (input) => applyHeading(input, 3),
    'arrowup': (input) => moveSectionOrLine(input, -1),
    'arrowdown': (input) => moveSectionOrLine(input, 1)
};

export function initShortcuts(markdownInput) {
    if (!markdownInput) return;

    markdownInput.addEventListener('keydown', (e) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        if (!isCtrl) return;

        const key = e.key.toLowerCase();
        const handler = shortcutHandlers[key];
        if (handler) {
            e.preventDefault();
            handler(markdownInput);
        }
    });
}
