/**
 * Jobby Markdown Editor - tutorial.js
 * Interactive animated popup tutorial demonstrating Markdown in 20 seconds.
 */

import { showToast } from './utils.js';
import { t } from './i18n.js';

let styleEl = null;
let overlayEl = null;

export const MarkdownPopupTutorial = {
    previousPath: '/',
    previousSearch: '',
    _popstateHandler: null,

    mount() {
        if (overlayEl) return;

        this.previousPath = window.location.pathname;
        this.previousSearch = window.location.search;

        // Update URL to /tutorial if not already there
        if (window.location.pathname !== '/tutorial' && window.location.pathname !== '/tutorial/') {
            window.history.pushState({}, '', '/tutorial' + this.previousSearch);
        }

        // Update document title and description dynamically for client-side SEO/UX
        document.title = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? "[DEV] Jobby - 20-Second Interactive Markdown CV Tutorial"
            : "Jobby - 20-Second Interactive Markdown CV Tutorial";
            
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', 'Learn how to build an ATS-compliant resume in 20 seconds with standard Markdown. Watch Jobby parse CV text in real-time and export to print-ready PDF.');
        }

        // Trigger Google Analytics / Google Tag Manager pageview if available
        if (typeof window.gtag === 'function') {
            window.gtag('event', 'page_view', {
                page_title: document.title,
                page_path: window.location.pathname,
                page_location: window.location.href
            });
        }

        // Trigger telemetry event
        window.dispatchEvent(new CustomEvent('jobby-telemetry', {
            detail: { eventType: 'Tutorial Start' }
        }));

        this._popstateHandler = () => {
            if (overlayEl) {
                // If they popped state back away from /tutorial, close it
                if (window.location.pathname !== '/tutorial' && window.location.pathname !== '/tutorial/') {
                    this.exit(true);
                }
            }
        };
        window.addEventListener('popstate', this._popstateHandler);

        // 1. Inject Styles
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.innerHTML = `
                .tutorial-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(15, 23, 42, 0.75);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    opacity: 0;
                    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .tutorial-overlay.show {
                    opacity: 1;
                }
                .tutorial-window {
                    width: 850px;
                    max-width: 95%;
                    background: var(--bg-panel, #1e293b);
                    border: 1px solid var(--border-color, #334155);
                    border-radius: 16px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform: scale(0.9) translateY(20px);
                    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .tutorial-overlay.show .tutorial-window {
                    transform: scale(1) translateY(0);
                }
                .tutorial-header {
                    height: 48px;
                    background: var(--bg-panel-header, #0f172a);
                    border-bottom: 1px solid var(--border-color, #334155);
                    display: flex;
                    align-items: center;
                    padding: 0 16px;
                    position: relative;
                }
                .header-logo {
                    display: flex;
                    align-items: center;
                }
                .tutorial-close-btn {
                    position: absolute;
                    right: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: transparent;
                    border: none;
                    color: var(--text-secondary, #94a3b8);
                    font-size: 20px;
                    cursor: pointer;
                    line-height: 1;
                    padding: 4px;
                    border-radius: 4px;
                    transition: color 0.15s, background-color 0.15s;
                }
                .tutorial-close-btn:hover {
                    color: var(--text-primary, #f8fafc);
                    background-color: rgba(255, 255, 255, 0.05);
                }
                .header-title {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    font-family: var(--font-ui, sans-serif);
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-primary, #f8fafc);
                }
                .tutorial-body {
                    display: grid;
                    grid-template-columns: 58% 42%;
                    height: 360px;
                    background: var(--bg-editor, #030712);
                }
                .tutorial-editor-column {
                    border-right: 1px solid var(--border-color, #334155);
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    font-family: var(--font-mono, monospace);
                    font-size: 12.5px;
                    line-height: 1.6;
                    color: var(--text-editor, #e2e8f0);
                    overflow-y: auto;
                }
                .editor-lines {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                }
                .editor-line {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 2px 4px;
                    min-height: 20.8px;
                    border-radius: 4px;
                    transition: background 0.2s ease;
                }
                .editor-line.active {
                    background: rgba(124, 58, 237, 0.08);
                }
                .editor-line.token-glow {
                    box-shadow: 0 0 12px rgba(124, 58, 237, 0.25);
                }
                .editor-line.shake {
                    animation: shake 0.25s ease-in-out;
                }
                .editor-line .line-number {
                    color: var(--text-muted, #64748b);
                    text-align: right;
                    width: 18px;
                    user-select: none;
                    flex-shrink: 0;
                }
                .editor-line .line-content {
                    flex: 1;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .token {
                    color: var(--accent, #a78bfa);
                    font-weight: 700;
                }
                .caret {
                    display: inline-block;
                    width: 2px;
                    height: 1.1em;
                    background-color: var(--accent, #7c3aed);
                    margin-left: 1px;
                    vertical-align: middle;
                    animation: caret-blink 1s step-end infinite;
                }
                .tutorial-preview-column {
                    padding: 20px;
                    background: var(--bg-panel, #1e293b);
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .tutorial-preview-column h1 {
                    font-size: 20px;
                    font-weight: 800;
                    margin: 0;
                    color: var(--text-primary, #f8fafc);
                    line-height: 1.2;
                }
                .tutorial-preview-column h2 {
                    font-size: 15px;
                    font-weight: 700;
                    margin: 0;
                    color: var(--text-secondary, #cbd5e1);
                    line-height: 1.3;
                }
                .tutorial-preview-column p {
                    font-size: 13px;
                    margin: 0;
                    color: var(--text-secondary, #cbd5e1);
                    line-height: 1.5;
                }
                .tutorial-preview-column ul {
                    margin: 0;
                    padding-left: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .tutorial-preview-column li {
                    font-size: 13px;
                    color: var(--text-secondary, #cbd5e1);
                    line-height: 1.5;
                }
                .tutorial-preview-column hr {
                    border: 0;
                    border-top: 1px solid var(--border-color, #334155);
                    margin: 12px 0;
                }
                .entrance-animation {
                    animation: entrance-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .tutorial-footer {
                    height: 60px;
                    background: var(--bg-panel-header, #0f172a);
                    border-top: 1px solid var(--border-color, #334155);
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    padding: 0 16px;
                    gap: 12px;
                }
                .done-screen {
                    font-family: var(--font-ui, sans-serif);
                    font-size: 24px;
                    font-weight: 800;
                    color: var(--accent, #7c3aed);
                    opacity: 0;
                    transform: scale(0.9);
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .done-screen.show {
                    opacity: 1;
                    transform: scale(1);
                }
                @keyframes caret-blink {
                    50% { opacity: 0; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-4px); }
                    40%, 80% { transform: translateX(4px); }
                }
                @keyframes entrance-fade {
                    from {
                        opacity: 0;
                        transform: translateY(12px) scale(0.96);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                @media (max-width: 768px), (max-height: 640px) {
                    .tutorial-window {
                        max-height: 95vh;
                    }
                    .tutorial-body {
                        height: 280px;
                    }
                    .tutorial-editor-column {
                        padding: 10px;
                        font-size: 11px;
                        line-height: 1.4;
                    }
                    .tutorial-preview-column {
                        padding: 12px;
                        gap: 8px;
                    }
                    .tutorial-preview-column h1 {
                        font-size: 16px;
                    }
                    .tutorial-preview-column h2 {
                        font-size: 13px;
                    }
                    .tutorial-preview-column p,
                    .tutorial-preview-column li {
                        font-size: 11px;
                        line-height: 1.4;
                    }
                    .tutorial-preview-column ul {
                        padding-left: 12px;
                        gap: 4px;
                    }
                    .tutorial-preview-column hr {
                        margin: 6px 0;
                    }
                }
            `;
            document.head.appendChild(styleEl);
        }

        // 2. Build DOM
        overlayEl = document.createElement('div');
        overlayEl.id = 'tutorial-overlay';
        overlayEl.className = 'tutorial-overlay';
        overlayEl.innerHTML = `
            <div class="tutorial-window" id="tutorial-window">
                <div class="tutorial-header">
                    <div class="header-logo">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #7c3aed)" stroke-width="2.5"
                            stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <circle cx="12" cy="12" r="4"/>
                            <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/>
                            <line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/>
                            <line x1="19.07" y1="4.93" x2="14.83" y2="9.17"/>
                            <line x1="9.17" y1="14.83" x2="4.93" y2="19.07"/>
                        </svg>
                    </div>
                    <span class="header-title">${t('tutorial.title', { defaultValue: 'Markdown in 20 seconds' })}</span>
                    <button type="button" class="tutorial-close-btn" id="btn-close-tutorial-header" title="Close tutorial">&times;</button>
                </div>
                <div class="tutorial-body">
                    <div class="tutorial-editor-column">
                        <div class="editor-lines" id="editor-lines" style="width: 100%;">
                            <div class="editor-line active" id="tut-line-1"><span class="line-number">1</span><span class="line-content"></span></div>
                            <div class="editor-line" id="tut-line-2"><span class="line-number">2</span><span class="line-content"></span></div>
                            <div class="editor-line" id="tut-line-3"><span class="line-number">3</span><span class="line-content"></span></div>
                            <div class="editor-line" id="tut-line-4"><span class="line-number">4</span><span class="line-content"></span></div>
                            <div class="editor-line" id="tut-line-5"><span class="line-number">5</span><span class="line-content"></span></div>
                            <div class="editor-line" id="tut-line-6"><span class="line-number">6</span><span class="line-content"></span></div>
                            <div class="editor-line" id="tut-line-7"><span class="line-number">7</span><span class="line-content"></span></div>
                            <div class="editor-line" id="tut-line-8"><span class="line-number">8</span><span class="line-content"></span></div>
                            <div class="editor-line" id="tut-line-9"><span class="line-number">9</span><span class="line-content"></span></div>
                            <div class="editor-line" id="tut-line-10"><span class="line-number">10</span><span class="line-content"></span></div>
                        </div>
                    </div>
                    <div class="tutorial-preview-column" id="tutorial-preview"></div>
                </div>
                <div class="tutorial-footer">
                    <button type="button" class="btn btn-secondary" id="btn-replay" style="padding: 8px 16px; font-size: 12.5px; border-radius: 6px; font-weight: 600; background: var(--bg-button-secondary); color: var(--text-primary); border: 1px solid var(--border-color); cursor: pointer;" disabled>${t('tutorial.btn_replay', { defaultValue: 'Explain me again' })}</button>
                    <button type="button" class="btn btn-primary" id="btn-exit" style="padding: 8px 16px; font-size: 12.5px; border-radius: 6px; font-weight: 600; background: var(--accent); color: #ffffff; border: none; cursor: pointer;">${t('tutorial.btn_exit', { defaultValue: 'Markdown is simple' })}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlayEl);

        // Bind events
        const btnReplay = overlayEl.querySelector('#btn-replay');
        const btnExit = overlayEl.querySelector('#btn-exit');
        const btnCloseHeader = overlayEl.querySelector('#btn-close-tutorial-header');

        btnReplay.addEventListener('click', () => {
            if (this.isAnimating) return;
            this.playTimeline();
        });

        btnExit.addEventListener('click', () => {
            this.exit();
        });

        if (btnCloseHeader) {
            btnCloseHeader.addEventListener('click', () => {
                this.exit();
            });
        }

        // Trigger entrance animation
        setTimeout(() => {
            overlayEl.classList.add('show');
            this.playTimeline();
        }, 50);
    },

    isAnimating: false,
    timelineTimeout: null,

    sleep(ms) {
        return new Promise(resolve => {
            this.timelineTimeout = setTimeout(resolve, ms);
        });
    },

    clearTimeline() {
        if (this.timelineTimeout) {
            clearTimeout(this.timelineTimeout);
            this.timelineTimeout = null;
        }
    },

    async playTimeline() {
        this.clearTimeline();
        this.isAnimating = true;

        const btnReplay = overlayEl.querySelector('#btn-replay');
        btnReplay.disabled = true;

        // Reset editor & preview
        for (let i = 1; i <= 10; i++) {
            const line = overlayEl.querySelector(`#tut-line-${i}`);
            line.className = 'editor-line';
            line.innerHTML = `<span class="line-number">${i}</span><span class="line-content"></span>`;
        }
        overlayEl.querySelector('#tut-line-1').classList.add('active');
        overlayEl.querySelector('#tut-line-1 .line-content').innerHTML = '<span class="caret"></span>';
        
        const previewCol = overlayEl.querySelector('#tutorial-preview');
        previewCol.innerHTML = '';

        const typeSpeed = 30; // Polished typing speed

        // 1. Heading 1
        const line1Text = t('tutorial.line1');
        await this.typeText(1, line1Text, typeSpeed);
        await this.sleep(500);
        await this.triggerEnter(1, { tag: 'h1', text: line1Text });
        await this.sleep(600);

        // 2. Heading 2
        const line2Text = t('tutorial.line2');
        await this.typeText(2, line2Text, typeSpeed);
        await this.sleep(500);
        await this.triggerEnter(2, { tag: 'h2', text: line2Text });
        await this.sleep(600);

        // 3. Move down past blank line 3
        await this.moveCaret(3);
        await this.sleep(400);

        // 4. Paragraph 1 (with bold)
        const line4Text = t('tutorial.line4');
        await this.moveCaret(4);
        await this.typeText(4, line4Text, typeSpeed);
        await this.sleep(600);
        await this.triggerEnter(4, { tag: 'p', text: line4Text });
        await this.sleep(600);

        // 5. Move down past blank line 5
        await this.moveCaret(5);
        await this.sleep(400);

        // 6. Bullet 1
        const line6Text = t('tutorial.line6');
        await this.moveCaret(6);
        await this.typeText(6, line6Text, typeSpeed);
        await this.sleep(500);
        await this.triggerEnter(6, { tag: 'li', text: line6Text });
        await this.sleep(500);

        // 7. Bullet 2
        const line7Text = t('tutorial.line7');
        await this.moveCaret(7);
        await this.typeText(7, line7Text, typeSpeed);
        await this.sleep(500);
        await this.triggerEnter(7, { tag: 'li', text: line7Text });
        await this.sleep(500);

        // 8. Bullet 3
        const line8Text = t('tutorial.line8');
        await this.moveCaret(8);
        await this.typeText(8, line8Text, typeSpeed);
        await this.sleep(500);
        await this.triggerEnter(8, { tag: 'li', text: line8Text });
        await this.sleep(500);

        // 9. Horizontal separator
        const line9Text = t('tutorial.line9');
        await this.moveCaret(9);
        await this.typeText(9, line9Text, typeSpeed);
        await this.sleep(500);
        await this.triggerEnter(9, { tag: 'hr', text: '' });
        await this.sleep(500);

        // 10. Last line (with bold & italic)
        const line10Text = t('tutorial.line10');
        await this.moveCaret(10);
        await this.typeText(10, line10Text, typeSpeed);
        await this.sleep(600);
        this.renderPreview({ tag: 'p', text: line10Text });

        this.isAnimating = false;
        btnReplay.disabled = false;
    },

    highlightMarkdown(text) {
        let html = text;
        
        // Escape HTML characters first to avoid issues
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // 1. Headers: #, ##, ###
        let headerPrefix = '';
        if (html.startsWith('# ')) {
            headerPrefix = '<span class="token"># </span>';
            html = html.substring(2);
        } else if (html.startsWith('## ')) {
            headerPrefix = '<span class="token">## </span>';
            html = html.substring(3);
        } else if (html.startsWith('### ')) {
            headerPrefix = '<span class="token">### </span>';
            html = html.substring(4);
        }
        
        // 2. List items: - or *
        let listPrefix = '';
        if (html.startsWith('- ')) {
            listPrefix = '<span class="token">- </span>';
            html = html.substring(2);
        } else if (html.startsWith('* ')) {
            listPrefix = '<span class="token">* </span>';
            html = html.substring(2);
        }
        
        // 3. Bold: **text**
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>**$1**</strong>');
        
        // 4. Italic: *text*
        html = html.replace(/\*([^*]+)\*/g, '<em>*$1*</em>');
        
        // 5. Wrap asterisks in tokens
        html = html
            .replace(/\*\*/g, '<span class="token">**</span>')
            .replace(/\*/g, '<span class="token">*</span>');
            
        return headerPrefix + listPrefix + html;
    },

    async typeText(lineIndex, text, speed) {
        const line = overlayEl.querySelector(`#tut-line-${lineIndex}`);
        const contentSpan = line.querySelector('.line-content');
        let currentText = '';
        
        for (let i = 0; i < text.length; i++) {
            currentText += text[i];
            contentSpan.innerHTML = this.highlightMarkdown(currentText) + '<span class="caret"></span>';
            await this.sleep(speed);
        }
    },

    async triggerEnter(lineIndex, previewSpec) {
        const currentLine = overlayEl.querySelector(`#tut-line-${lineIndex}`);
        
        // Shake line animation
        currentLine.classList.add('shake');
        await this.sleep(250);
        currentLine.classList.remove('shake');

        // Move caret to next line
        await this.moveCaret(lineIndex + 1);

        // Render preview element
        this.renderPreview(previewSpec);
    },

    async moveCaret(lineIndex) {
        // Remove caret and active class from any current lines
        for (let i = 1; i <= 10; i++) {
            const line = overlayEl.querySelector(`#tut-line-${i}`);
            line.classList.remove('active');
            const caret = line.querySelector('.caret');
            if (caret) caret.remove();
        }

        // Apply to new line
        const newLine = overlayEl.querySelector(`#tut-line-${lineIndex}`);
        if (newLine) {
            newLine.classList.add('active');
            const contentSpan = newLine.querySelector('.line-content');
            contentSpan.insertAdjacentHTML('beforeend', '<span class="caret"></span>');
        }
    },

    markdownToHtml(text) {
        let html = text;
        // Escape HTML
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
            
        // Bold
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // Italic
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        return html;
    },

    stripMarkdownSyntax(text) {
        let clean = text;
        if (clean.startsWith('# ')) clean = clean.substring(2);
        else if (clean.startsWith('## ')) clean = clean.substring(3);
        else if (clean.startsWith('### ')) clean = clean.substring(4);
        else if (clean.startsWith('- ')) clean = clean.substring(2);
        else if (clean.startsWith('* ')) clean = clean.substring(2);
        return clean;
    },

    renderPreview(spec) {
        const previewCol = overlayEl.querySelector('#tutorial-preview');
        const cleanText = this.stripMarkdownSyntax(spec.text || '');
        const htmlContent = this.markdownToHtml(cleanText);
        
        if (spec.tag === 'li') {
            let ul = previewCol.lastElementChild;
            if (!ul || ul.tagName !== 'UL') {
                ul = document.createElement('ul');
                previewCol.appendChild(ul);
            }
            const li = document.createElement('li');
            li.className = 'entrance-animation';
            li.innerHTML = htmlContent;
            ul.appendChild(li);
        } else {
            const el = document.createElement(spec.tag);
            el.className = 'entrance-animation';
            el.innerHTML = htmlContent;
            previewCol.appendChild(el);
        }
    },

    exit(skipHistoryUpdate = false) {
        this.clearTimeline();
        this.isAnimating = false;

        if (this._popstateHandler) {
            window.removeEventListener('popstate', this._popstateHandler);
            this._popstateHandler = null;
        }

        if (!overlayEl) return;
        const windowEl = overlayEl.querySelector('.tutorial-window');
        
        // Play exit animation (scale down + fade)
        overlayEl.style.opacity = '0';
        if (windowEl) {
            windowEl.style.transform = 'scale(0.8) translateY(20px)';
        }

        setTimeout(() => {
            if (overlayEl) {
                overlayEl.remove();
                overlayEl = null;
            }

            // Restore previous path or /
            if (!skipHistoryUpdate && (window.location.pathname === '/tutorial' || window.location.pathname === '/tutorial/')) {
                const restorePath = (this.previousPath === '/tutorial' || this.previousPath === '/tutorial/') ? '/' : this.previousPath;
                window.history.pushState({}, '', restorePath + this.previousSearch);
            }

            // Restore document title and description
            document.title = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? "[DEV] Jobby - Premium ATS-Compliant Markdown Resume Editor"
                : "Jobby - Premium ATS-Compliant Markdown Resume Editor";
                
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.setAttribute('content', 'Jobby is a premium, open-source Markdown resume editor designed for ATS compliance. Tailor your CV in real-time with custom typography, spacing controls, and print-ready PDF export.');
            }

            // Trigger Google Analytics pageview for the restored URL
            if (typeof window.gtag === 'function') {
                window.gtag('event', 'page_view', {
                    page_title: document.title,
                    page_path: window.location.pathname,
                    page_location: window.location.href
                });
            }

            // Trigger telemetry event
            window.dispatchEvent(new CustomEvent('jobby-telemetry', {
                detail: { eventType: 'Tutorial End' }
            }));

            // Show thankful toast notification encouraging the user
            showToast(t('toasts.tutorial_complete'));
        }, 400);
    }
};
