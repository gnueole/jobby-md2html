/**
 * Jobby Markdown Editor - utils.js
 * Common utility helper functions.
 */

// Show toast alerts
export function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }
}

// Debounce helper
export function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// Escape special characters in RegExp strings
export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Remove markdown symbols and formatters
export function cleanMarkdown(text) {
    if (!text) return "";
    return text
        .replace(/^(#+\s*|-\s*|\*\s*|\+\s*)/gm, '') // Remove list bullets/headers at beginning of lines
        .replace(/[\*\#_`~]/g, '')                // Remove inline markdown markers
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links [text](url) to just text
        .trim();
}

// Count characters excluding whitespaces
export function countNonWsChars(text) {
    if (!text) return 0;
    return text.replace(/\s/g, '').length;
}
