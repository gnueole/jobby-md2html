/**
 * Jobby Markdown Editor - aiprompt.js
 * The prompt that asks an AI (ChatGPT, Claude, Gemini…) to return a CV in the Markdown
 * Jobby expects: the modal that shows it, the buttons that copy it, and the cleanup
 * applied when the AI's whole answer is pasted into the editor.
 */

import { showToast } from './utils.js';
import { t, currentLocale } from './i18n.js';

// One prompt per interface language, next to the sample files; English otherwise.
const promptCache = {};

function promptUrl(locale) {
    return locale === 'en' ? '/ai-prompt.md' : `/ai-prompt.${locale}.md`;
}

export async function fetchAiPrompt(locale = currentLocale) {
    const url = promptUrl(locale);
    if (promptCache[url]) return promptCache[url];
    let res = await fetch(url);
    if (!res.ok && locale !== 'en') res = await fetch(promptUrl('en'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    promptCache[url] = text;
    return text;
}

function telemetry(eventType, extraData) {
    window.dispatchEvent(new CustomEvent('jobby-telemetry', { detail: { eventType, extraData } }));
}

// Copies the prompt for the current language. Safari only honours a clipboard write made
// in the click itself, so the prompt is prefetched at init and written without awaiting.
export function copyAiPrompt(source) {
    const cached = promptCache[promptUrl(currentLocale)] || promptCache[promptUrl('en')];
    const write = text => navigator.clipboard.writeText(text).then(() => {
        showToast(t('toasts.ai_prompt_copied'));
        telemetry('AI Prompt Copied', { source });
    });
    const attempt = cached ? write(cached) : fetchAiPrompt().then(write);
    return attempt.catch(err => {
        console.error('AI prompt copy failed:', err);
        showToast(t('toasts.ai_prompt_copy_fail'));
    });
}

// Fills every element that displays the prompt (the help modal, the prompt modal), in
// the current language.
export async function renderAiPromptPreview() {
    const boxes = document.querySelectorAll('#help-ai-prompt, #ai-prompt-modal-text');
    if (!boxes.length) return;
    try {
        const text = await fetchAiPrompt();
        boxes.forEach(box => { box.textContent = text; });
    } catch (err) {
        console.error('AI prompt preview failed:', err);
    }
}

// The prompt is shown before it can be copied: nobody should paste into an AI a text
// they have not read.
export function openAiPromptModal(source) {
    const modal = document.getElementById('ai-prompt-modal');
    if (!modal) return;
    renderAiPromptPreview();
    modal.classList.add('show');
    telemetry('AI Prompt Viewed', { source });
}

export function closeAiPromptModal() {
    const modal = document.getElementById('ai-prompt-modal');
    if (modal) modal.classList.remove('show');
}

// A fenced block, closed on its own line. Group 1 is the fence, group 2 the body.
const FENCE_PATTERN = /^[ \t]*(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n[ \t]*\1[ \t]*$/gm;

/**
 * The CV an AI returns comes wrapped in a code block, often with a sentence before it and
 * the list of missing information after. Returns the CV alone when the pasted text holds
 * a fenced block that starts with a level-1 heading, or is nothing but one fenced block.
 * Returns null when the paste should go in untouched.
 */
export function unwrapAiReply(text) {
    if (typeof text !== 'string') return null;
    const normalized = text.replace(/\r\n?/g, '\n');
    if (!normalized.includes('```') && !normalized.includes('~~~')) return null;

    FENCE_PATTERN.lastIndex = 0;
    let match;
    while ((match = FENCE_PATTERN.exec(normalized)) !== null) {
        const body = match[2];
        const firstLine = body.split('\n').find(line => line.trim()) || '';
        if (/^#\s+\S/.test(firstLine)) return body.trim() + '\n';
    }

    const whole = normalized.trim().match(/^(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n[ \t]*\1$/);
    if (whole) return whole[2].trim() + '\n';
    return null;
}

/**
 * Binds the prompt modal and every button that opens or copies the prompt, and
 * prefetches it.
 * @param {Object} options
 * @param {Function} options.openHelp Opens the help modal
 */
export function initAiPrompt({ openHelp } = {}) {
    // Buttons that show the prompt first
    const openers = {
        'btn-copy-ai-prompt': 'header',
        'btn-empty-ai-prompt': 'empty_state',
        'btn-copy-ai-prompt-about': 'about'
    };
    Object.entries(openers).forEach(([id, source]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', e => {
                e.preventDefault();
                const about = document.getElementById('about-modal');
                if (about) about.classList.remove('show');
                openAiPromptModal(source);
            });
        }
    });

    // Buttons that copy it, next to its full text
    const copiers = {
        'btn-copy-ai-prompt-modal': 'modal',
        'btn-copy-ai-prompt-help': 'help'
    };
    Object.entries(copiers).forEach(([id, source]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', e => {
                e.preventDefault();
                copyAiPrompt(source);
            });
        }
    });

    const modal = document.getElementById('ai-prompt-modal');
    if (modal) {
        const closeBtn = modal.querySelector('#btn-close-ai-prompt-modal');
        if (closeBtn) closeBtn.addEventListener('click', closeAiPromptModal);
        modal.addEventListener('click', e => {
            if (e.target === modal) closeAiPromptModal();
        });
        const helpBtn = modal.querySelector('#btn-ai-prompt-modal-help');
        if (helpBtn && typeof openHelp === 'function') {
            helpBtn.addEventListener('click', e => {
                e.preventDefault();
                closeAiPromptModal();
                openHelp();
            });
        }
    }

    const emptyHelpLink = document.getElementById('link-empty-help');
    if (emptyHelpLink && typeof openHelp === 'function') {
        emptyHelpLink.addEventListener('click', e => {
            e.preventDefault();
            openHelp();
        });
    }

    fetchAiPrompt().then(() => renderAiPromptPreview()).catch(err => {
        console.warn('AI prompt not available:', err);
    });
}
