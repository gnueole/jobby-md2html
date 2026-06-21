/**
 * Jobby Markdown Editor - tutorial.js
 * Interactive animated popup tutorial demonstrating Markdown in 20 seconds.
 */

import { showToast } from './utils.js';
import { t } from './i18n.js';

let styleEl = null;
let overlayEl = null;

export const MarkdownPopupTutorial = {
    mount() {
        if (overlayEl) return;

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
                    width: 700px;
                    max-width: 90%;
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
                    grid-template-columns: 1fr 1fr;
                    height: 340px;
                    background: var(--bg-editor, #030712);
                }
                .tutorial-editor-column {
                    border-right: 1px solid var(--border-color, #334155);
                    padding: 16px;
                    display: flex;
                    gap: 12px;
                    font-family: var(--font-mono, monospace);
                    font-size: 13px;
                    line-height: 1.6;
                    color: var(--text-editor, #e2e8f0);
                    overflow: hidden;
                }
                .editor-line-numbers {
                    color: var(--text-muted, #64748b);
                    text-align: right;
                    user-select: none;
                }
                .editor-textarea-wrapper {
                    flex: 1;
                    position: relative;
                }
                .editor-lines {
                    display: flex;
                    flex-direction: column;
                }
                .editor-line {
                    white-space: pre;
                    height: 20.8px;
                    border-radius: 4px;
                    padding: 0 4px;
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
                    <span class="header-title">Markdown in 20 seconds</span>
                    <button type="button" class="tutorial-close-btn" id="btn-close-tutorial-header" title="Close tutorial">&times;</button>
                </div>
                <div class="tutorial-body">
                    <div class="tutorial-editor-column">
                        <div class="editor-line-numbers">
                            <div>1</div>
                            <div>2</div>
                            <div>3</div>
                            <div>4</div>
                            <div>5</div>
                            <div>6</div>
                            <div>7</div>
                            <div>8</div>
                        </div>
                        <div class="editor-textarea-wrapper">
                            <div class="editor-lines" id="editor-lines">
                                <div class="editor-line active" id="tut-line-1"><span class="line-content"></span><span class="caret"></span></div>
                                <div class="editor-line" id="tut-line-2"><span class="line-content"></span></div>
                                <div class="editor-line" id="tut-line-3"><span class="line-content"></span></div>
                                <div class="editor-line" id="tut-line-4"><span class="line-content"></span></div>
                                <div class="editor-line" id="tut-line-5"><span class="line-content"></span></div>
                                <div class="editor-line" id="tut-line-6"><span class="line-content"></span></div>
                                <div class="editor-line" id="tut-line-7"><span class="line-content"></span></div>
                                <div class="editor-line" id="tut-line-8"><span class="line-content"></span></div>
                            </div>
                        </div>
                    </div>
                    <div class="tutorial-preview-column" id="tutorial-preview"></div>
                </div>
                <div class="tutorial-footer">
                    <button type="button" class="btn btn-secondary" id="btn-replay" style="padding: 8px 16px; font-size: 12.5px; border-radius: 6px; font-weight: 600; background: var(--bg-button-secondary); color: var(--text-primary); border: 1px solid var(--border-color); cursor: pointer;" disabled>Explain me again</button>
                    <button type="button" class="btn btn-primary" id="btn-exit" style="padding: 8px 16px; font-size: 12.5px; border-radius: 6px; font-weight: 600; background: var(--accent); color: #ffffff; border: none; cursor: pointer;">Markdown is simple</button>
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
        for (let i = 1; i <= 8; i++) {
            const line = overlayEl.querySelector(`#tut-line-${i}`);
            line.className = 'editor-line';
            line.innerHTML = '<span class="line-content"></span>';
        }
        overlayEl.querySelector('#tut-line-1').classList.add('active');
        overlayEl.querySelector('#tut-line-1').innerHTML = '<span class="line-content"></span><span class="caret"></span>';
        
        const previewCol = overlayEl.querySelector('#tutorial-preview');
        previewCol.innerHTML = '';

        const typeSpeed = 30; // Polished typing speed

        // 1. Heading 1 - Markdown is Structure
        await this.typeText(1, '# Markdown is Structure', typeSpeed);
        await this.sleep(500);
        await this.triggerEnter(1, { tag: 'h1', text: 'Markdown is Structure' });
        await this.sleep(600);

        // 2. Heading 2 - Focus on content first
        await this.typeText(2, '## Focus on content first', typeSpeed);
        await this.sleep(500);
        await this.triggerEnter(2, { tag: 'h2', text: 'Focus on content first' });
        await this.sleep(600);

        // 3. Move down past blank line 3
        await this.moveCaret(3);
        await this.sleep(400);

        // 4. Paragraph with bold formatting
        await this.moveCaret(4);
        await this.typeText(4, 'No complex formatting, just **plain text** with simple marks.', typeSpeed);
        await this.sleep(600);
        await this.triggerEnter(4, { tag: 'p', html: 'No complex formatting, just <strong>plain text</strong> with simple marks.' });
        await this.sleep(600);

        // 5. Move down past blank line 5
        await this.moveCaret(5);
        await this.sleep(400);

        // 6. Bullet 1
        await this.moveCaret(6);
        await this.typeText(6, '- Easy to read, write, and maintain', typeSpeed);
        await this.sleep(500);
        await this.triggerEnter(6, { tag: 'li', html: 'Easy to read, write, and maintain' });
        await this.sleep(500);

        // 7. Bullet 2
        await this.moveCaret(7);
        await this.typeText(7, '- Parses beautifully for resume compilers', typeSpeed);
        await this.sleep(500);
        await this.triggerEnter(7, { tag: 'li', html: 'Parses beautifully for resume compilers' });
        await this.sleep(500);

        // 8. Bullet 3
        await this.moveCaret(8);
        await this.typeText(8, '- Highly preferred by modern AI engines', typeSpeed);
        await this.sleep(500);
        this.renderPreview({ tag: 'li', html: 'Highly preferred by modern AI engines' });

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
        if (html.startsWith('# ')) {
            html = `<span class="token"># </span>${html.substring(2)}`;
        } else if (html.startsWith('## ')) {
            html = `<span class="token">## </span>${html.substring(3)}`;
        } else if (html.startsWith('### ')) {
            html = `<span class="token">### </span>${html.substring(4)}`;
        }
        
        // 2. List items: - or *
        else if (html.startsWith('- ')) {
            html = `<span class="token">- </span>${html.substring(2)}`;
        } else if (html.startsWith('* ')) {
            html = `<span class="token">* </span>${html.substring(2)}`;
        }
        
        // 3. Bold: **text**
        html = html.replace(/\*\*([^*]+)\*\*/g, '<span class="token">**</span><strong>$1</strong><span class="token">**</span>');
        
        return html;
    },

    async typeText(lineIndex, text, speed) {
        const line = overlayEl.querySelector(`#tut-line-${lineIndex}`);
        const contentSpan = line.querySelector('.line-content');
        let currentText = '';
        
        for (let i = 0; i < text.length; i++) {
            currentText += text[i];
            contentSpan.innerHTML = this.highlightMarkdown(currentText);
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
        for (let i = 1; i <= 8; i++) {
            const line = overlayEl.querySelector(`#tut-line-${i}`);
            line.classList.remove('active');
            const caret = line.querySelector('.caret');
            if (caret) caret.remove();
        }

        // Apply to new line
        const newLine = overlayEl.querySelector(`#tut-line-${lineIndex}`);
        if (newLine) {
            newLine.classList.add('active');
            newLine.insertAdjacentHTML('beforeend', '<span class="caret"></span>');
        }
    },

    renderPreview(spec) {
        const previewCol = overlayEl.querySelector('#tutorial-preview');
        if (spec.tag === 'li') {
            // Find if there's an existing ul at the end
            let ul = previewCol.lastElementChild;
            if (!ul || ul.tagName !== 'UL') {
                ul = document.createElement('ul');
                previewCol.appendChild(ul);
            }
            const li = document.createElement('li');
            li.className = 'entrance-animation';
            li.innerHTML = spec.html || spec.text;
            ul.appendChild(li);
        } else {
            const el = document.createElement(spec.tag);
            el.className = 'entrance-animation';
            if (spec.html) {
                el.innerHTML = spec.html;
            } else {
                el.textContent = spec.text;
            }
            previewCol.appendChild(el);
        }
    },

    exit() {
        this.clearTimeline();
        this.isAnimating = false;

        const windowEl = overlayEl.querySelector('.tutorial-window');
        
        // Play exit animation (scale down + fade)
        overlayEl.style.opacity = '0';
        windowEl.style.transform = 'scale(0.8) translateY(20px)';

        setTimeout(() => {
            overlayEl.remove();
            overlayEl = null;

            // Show thankful toast notification encouraging the user
            showToast(t('toasts.tutorial_complete'));
        }, 400);
    }
};
