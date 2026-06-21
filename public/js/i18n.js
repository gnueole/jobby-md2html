/**
 * Jobby Markdown Editor - i18n.js
 * Client-side internationalization and translation engine.
 */

const supportedLanguages = ['en', 'fr', 'cs', 'es', 'it', 'de', 'ro'];

const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const urlLang = urlParams ? urlParams.get('lang') : null;

export let currentLocale = (urlLang && supportedLanguages.includes(urlLang))
    ? urlLang
    : (localStorage.getItem('jobby_language') || (typeof navigator !== 'undefined' && navigator.language ? navigator.language.split('-')[0] : 'en') || 'en');
if (!supportedLanguages.includes(currentLocale)) {
    currentLocale = 'en';
}

let translations = {};

/**
 * Fetch and load the requested language dictionary.
 * @param {string} lang Locale code (e.g. 'cs', 'es', 'it', 'de', 'ro')
 */
export async function loadLocale(lang) {
    if (!supportedLanguages.includes(lang)) {
        lang = 'en';
    }
    try {
        const res = await fetch(`/locales/${lang}.json`);
        if (!res.ok) throw new Error(`Failed to load /locales/${lang}.json: ${res.statusText}`);
        translations = await res.json();
        currentLocale = lang;
        localStorage.setItem('jobby_language', lang);
        document.documentElement.setAttribute('lang', lang);
    } catch (e) {
        console.error("Localization load failed:", e);
    }
}

/**
 * Translate a key into the current language, substituting variables if provided.
 * @param {string} key Dot-notated translation path (e.g., 'editor.placeholder')
 * @param {Object} [vars] Template variables to replace in the format {variable_name}
 * @returns {string} Translated string or the key itself if not found
 */
export function t(key, vars = {}) {
    let value = key.split('.').reduce((obj, i) => (obj ? obj[i] : null), translations);
    if (!value) {
        return key;
    }
    // Replace variables
    Object.keys(vars).forEach(vKey => {
        value = value.replace(new RegExp(`{${vKey}}`, 'g'), vars[vKey]);
    });
    return value;
}

/**
 * Walk the DOM to translate elements annotated with translation data attributes.
 */
export function translateDOM() {
    // 1. Plain text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    // 2. HTML content (use sparingly for safety)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        el.innerHTML = t(key);
    });

    // 3. Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.setAttribute('placeholder', t(key));
    });

    // 4. Tooltips / Titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.setAttribute('title', t(key));
    });
}
