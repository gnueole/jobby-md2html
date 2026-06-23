import { t, currentLocale } from './i18n.js';

const defaultTitles = {
    en: { success: "Success", error: "Error", warning: "Warning", info: "Info", welcome: "Welcome", easter_egg: "Secret Found!", print: "Print" },
    fr: { success: "Succès", error: "Erreur", warning: "Avertissement", info: "Info", welcome: "Bienvenue", easter_egg: "Secret Trouvé !", print: "Impression" },
    cs: { success: "Úspěch", error: "Chyba", warning: "Varování", info: "Info", welcome: "Vítejte", easter_egg: "Tajemství nalezeno!", print: "Tisk" },
    es: { success: "Éxito", error: "Error", warning: "Advertencia", info: "Info", welcome: "Bienvenido", easter_egg: "¡Secreto Encontrado!", print: "Impresión" },
    it: { success: "Successo", error: "Errore", warning: "Attenzione", info: "Info", welcome: "Benvenuto", easter_egg: "Segreto Trovato!", print: "Stampa" },
    de: { success: "Erfolgreich", error: "Fehler", warning: "Warnung", info: "Info", welcome: "Willkommen", easter_egg: "Geheimnis gefunden!", print: "Drucken" },
    ro: { success: "Succes", error: "Eroare", warning: "Avertisment", info: "Info", welcome: "Bun venit", easter_egg: "Secret Găsit!", print: "Tipărire" }
};

const toastConfig = [
    {
        type: 'error',
        icon: '❌',
        keywords: ['fail', 'error', 'unauthorized', 'denied']
    },
    {
        type: 'print',
        icon: '🖨️',
        keywords: ['pdf', 'gotenberg', 'generating', 'print', 'téléchargement', 'descărcare', 'scarica', 'stahování', 'compilando', 'compilazione', 'compilation', 'compilare', 'kompilace', 'compiliert']
    },
    {
        type: 'success',
        icon: '✅',
        keywords: ['success', 'saved', 'loaded', 'synced', 'copied']
    },
    {
        type: 'warning',
        icon: '⚠️',
        keywords: ['warning', 'requires', 'attention']
    },
    {
        type: 'welcome',
        icon: '👋',
        keywords: ['welcome', 'bienvenue', 'bun venit', 'benvenuto', 'vítejte', 'willkommen', 'bienvenido']
    },
    {
        type: 'info',
        icon: 'ℹ️',
        keywords: ['info', 'information', 'notice', 'note']
    },
    {
        type: 'easter_egg',
        icon: '🌀',
        keywords: ['secret logo roll', 'secret', 'easter egg']
    }
];

// Helper to parse simple markdown inside toast notifications
function parseToastMarkdown(text) {
    if (!text) return '';
    // Escape HTML characters to prevent raw HTML injection / malformed tags
    let escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    // Convert **word** -> <strong class="toast-highlight">$1</strong>
    return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong class="toast-highlight">$1</strong>');
}

// Show toast alerts in a non-intrusive stack (supports string or API-style object)
export function showToast(content) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    let type = 'info';
    let icon = 'ℹ️';
    let title = '';
    let summary = '';

    if (typeof content === 'object' && content !== null) {
        // Handle like an API: showToast({ title, summary, type, icon })
        type = content.type || 'info';
        const matched = toastConfig.find(cfg => cfg.type === type);
        icon = content.icon || (matched ? matched.icon : 'ℹ️');
        const lang = document.documentElement.getAttribute('lang') || currentLocale || 'en';
        const titles = defaultTitles[lang] || defaultTitles['en'];
        title = parseToastMarkdown(content.title || titles[type] || 'Notification');
        summary = parseToastMarkdown(content.summary || content.message || '');
    } else {
        const message = String(content);
        const msgLower = message.toLowerCase();

        const matched = toastConfig.find(cfg => 
            cfg.keywords.some(keyword => msgLower.includes(keyword))
        );
        if (matched) {
            type = matched.type;
            icon = matched.icon;
        }

        // Parse title and summary from the message
        let rawTitle = '';
        let rawSummary = '';
        const match = message.match(/^([^!.?:;]+[!.?:;])\s+(.+)$/);
        if (match) {
            rawTitle = match[1].trim();
            rawSummary = match[2].trim();
            if (rawTitle.endsWith(':') || rawTitle.endsWith(';')) {
                rawTitle = rawTitle.slice(0, -1).trim();
            }
        } else {
            // Fallback: title is generic category name, summary is the full message
            const lang = document.documentElement.getAttribute('lang') || currentLocale || 'en';
            const titles = defaultTitles[lang] || defaultTitles['en'];
            rawTitle = titles[type] || 'Notification';
            rawSummary = message;
        }
        title = parseToastMarkdown(rawTitle);
        summary = parseToastMarkdown(rawSummary);
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
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-summary">${summary}</span>
        </div>
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

/**
 * Adjust absolute positioned popups to ensure they stay within screen boundaries.
 * @param {HTMLElement} popup - The popup element to adjust.
 */
export function preventPopupOverflow(popup) {
    if (!popup) return;
    
    // Clear any previous inline adjustments to measure natural CSS bounds first
    popup.style.left = '';
    popup.style.right = '';
    
    const rect = popup.getBoundingClientRect();
    const margin = 12;
    const viewportWidth = window.innerWidth;
    
    if (rect.left < margin) {
        const shiftRight = margin - rect.left;
        popup.style.left = `${popup.offsetLeft + shiftRight}px`;
        popup.style.right = 'auto';
    } else if (rect.right > viewportWidth - margin) {
        const shiftLeft = rect.right - (viewportWidth - margin);
        popup.style.left = `${popup.offsetLeft - shiftLeft}px`;
        popup.style.right = 'auto';
    }
}
