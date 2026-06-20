/**
 * Jobby Markdown Editor - utils.js
 * Common utility helper functions.
 */

// Show toast alerts in a non-intrusive stack
export function showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Auto-detect type of toast based on message content
    const msgLower = message.toLowerCase();
    let type = 'info';
    let icon = 'ℹ️';
    
    if (msgLower.includes('success') || msgLower.includes('saved') || msgLower.includes('loaded') || msgLower.includes('synced') || msgLower.includes('copied')) {
        type = 'success';
        icon = '✅';
    } else if (msgLower.includes('fail') || msgLower.includes('error') || msgLower.includes('unauthorized') || msgLower.includes('denied')) {
        type = 'error';
        icon = '❌';
    } else if (msgLower.includes('warning') || msgLower.includes('requires') || msgLower.includes('attention')) {
        type = 'warning';
        icon = '⚠️';
    }

    const toastItem = document.createElement('div');
    toastItem.className = `toast-item ${type}`;
    
    // Manage active ID for test compatibility
    const oldToast = document.getElementById('toast');
    if (oldToast) {
        oldToast.removeAttribute('id');
    }
    toastItem.id = 'toast'; // Assign the id to the latest active toast

    toastItem.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close-btn" aria-label="Close notification">&times;</button>
    `;

    container.appendChild(toastItem);

    // Force reflow to trigger transition
    void toastItem.offsetWidth;
    toastItem.classList.add('show');

    // Setup close button
    const closeBtn = toastItem.querySelector('.toast-close-btn');
    const dismiss = () => {
        toastItem.classList.remove('show');
        setTimeout(() => {
            if (toastItem.parentNode === container) {
                container.removeChild(toastItem);
            }
        }, 350);
    };

    closeBtn.addEventListener('click', dismiss);

    // Auto-dismiss after 3.5 seconds
    setTimeout(dismiss, 3500);
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

// Get daily version string (Format: YYYY-MM-DD_VERSIONNUM)
export function getDailyVersionString() {
    const today = new Date().toISOString().split('T')[0];
    const storedDate = localStorage.getItem('print_counter_date');
    let counter = 1;
    if (storedDate === today) {
        const storedCounter = localStorage.getItem('print_counter_val');
        counter = storedCounter ? parseInt(storedCounter, 10) : 1;
    } else {
        localStorage.setItem('print_counter_date', today);
        localStorage.setItem('print_counter_val', 1);
    }
    const increment = String(counter).padStart(2, '0');
    return `${today}_${increment}`;
}

// Increment daily version counter and return the new counter value
export function incrementDailyVersionCounter() {
    const today = new Date().toISOString().split('T')[0];
    const storedDate = localStorage.getItem('print_counter_date');
    let counter = 1;
    if (storedDate === today) {
        const storedCounter = localStorage.getItem('print_counter_val');
        counter = storedCounter ? parseInt(storedCounter, 10) + 1 : 1;
    }
    localStorage.setItem('print_counter_date', today);
    localStorage.setItem('print_counter_val', counter);
    return counter;
}
