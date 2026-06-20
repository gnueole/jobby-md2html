/**
 * Jobby Markdown Editor - app.js
 * Core application logic and event bindings.
 * Refactored to import modular components from public/js/.
 */

import { DEFAULT_STYLE_CONFIG } from './js/config.js';
import { showToast, debounce } from './js/utils.js';
import { runAtsChecker } from './js/ats.js';
import { initPanning } from './js/panning.js';
import { initHighlighting, initCursorRadar, initBidirectionalSync } from './js/highlight.js';
import { applyStyles, updateControlsFromConfig } from './js/styles.js';
import { compileMarkdown } from './js/parser.js';
import { 
    initShortcuts,
    applyHeading,
    toggleFormatting,
    toggleAccent,
    toggleMuted,
    toggleFormattingPrefix,
    insertLink,
    moveSectionOrLine
} from './js/shortcuts.js';
import { startOpeningFireworks } from './js/fireworks.js';

// New Modular Imports
import { initSyntaxHighlighting, updateSyntaxHighlight } from './js/syntax.js';
import { initDeveloperTools } from './js/developer.js';
import { initExports } from './js/exports.js';
import { initThemeToggle } from './js/theme.js';
import { initZoom, autoFitZoom } from './js/zoom.js';
import { initPrint, updatePageBreaks } from './js/print.js';

async function initializeJobby() {
    // --- Fetch config (including dynamic version) ---
    let appVersion = '1.9.0';
    try {
        const configRes = await fetch('/api/config');
        if (configRes.ok) {
            const configData = await configRes.json();
            if (configData.VERSION) {
                appVersion = configData.VERSION;
            }
        }
    } catch (e) {
        console.warn("Could not fetch version config:", e);
    }

    // --- Load public component bricks dynamically ---
    const publicBricks = [
        { id: 'header-container', url: '/bricks/header.html' },
        { id: 'editor-container', url: '/bricks/editor.html' },
        { id: 'preview-container', url: '/bricks/preview.html' },
        { id: 'controls-container', url: '/bricks/controls.html' },
        { id: 'about-modal', url: '/bricks/about-modal.html' },
        { id: 'help-modal', url: '/bricks/help-modal.html' },
        { id: 'feedback-modal', url: '/bricks/feedback-modal.html' }
    ];

    try {
        const parser = new DOMParser();
        await Promise.all(publicBricks.map(async brick => {
            const res = await fetch(brick.url);
            if (!res.ok) throw new Error(`Failed to fetch ${brick.url}: ${res.statusText}`);
            const htmlText = await res.text();
            
            // Replace version dynamically
            const processedHtml = htmlText.replace(/{{VERSION}}/g, appVersion);
            
            const container = document.getElementById(brick.id);
            if (container) {
                const doc = parser.parseFromString(processedHtml, 'text/html');
                container.replaceChildren(...doc.body.childNodes);
            }
        }));
    } catch (err) {
        console.error("Critical: Error loading public bricks:", err);
        return;
    }

    // --- Logo Rolling Easter Egg ---
    const setupLogoRolling = (triggerEl, animateEl) => {
        if (!triggerEl) return;
        const target = animateEl || triggerEl;
        triggerEl.style.cursor = 'pointer';
        
        const triggerRoll = () => {
            target.classList.remove('logo-roll');
            void target.offsetWidth; // Force layout reflow
            target.classList.add('logo-roll');
        };
        
        triggerEl.addEventListener('mouseenter', triggerRoll);
        triggerEl.addEventListener('click', triggerRoll);
        target.addEventListener('animationend', () => {
            target.classList.remove('logo-roll');
        });
    };

    const mainHeaderLogo = document.querySelector('.brand-icon');
    const aboutModalLogoTrigger = document.querySelector('#about-modal .modal-logo');
    const aboutModalLogoAnimate = document.querySelector('#about-modal .modal-logo svg');
    const helpModalLogoTrigger = document.querySelector('#help-modal .modal-logo');
    const helpModalLogoAnimate = document.querySelector('#help-modal .modal-logo svg');

    setupLogoRolling(mainHeaderLogo, mainHeaderLogo);
    setupLogoRolling(aboutModalLogoTrigger, aboutModalLogoAnimate);
    setupLogoRolling(helpModalLogoTrigger, helpModalLogoAnimate);

    // --- Dev Platform Customization ---
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' || 
                  window.location.hostname.endsWith('.local');
    if (isDev) {
        document.title = "[DEV] " + document.title;
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
            let svgText = favicon.getAttribute('href');
            if (svgText && svgText.startsWith('data:image/svg+xml,')) {
                svgText = svgText
                    .replace(/%2378350f/g, '%230f766e')
                    .replace(/%23451a03/g, '%23115e59')
                    .replace(/%23b45309/g, '%2314b8a6');
                favicon.setAttribute('href', svgText);
            }
        }
        const brandIcon = document.querySelector('.brand-icon');
        if (brandIcon) {
            brandIcon.style.color = '#14b8a6';
            brandIcon.style.filter = 'drop-shadow(0 0 8px rgba(20, 184, 166, 0.4))';
        }
        const modalLogo = document.querySelector('.modal-logo svg');
        if (modalLogo) {
            modalLogo.setAttribute('stroke', '#14b8a6');
        }
        const brandH1 = document.querySelector('.brand h1');
        if (brandH1) {
            brandH1.innerHTML = 'Jobby <span class="fancy-span">Markdown</span> Editor <span class="dev-badge" style="background: #14b8a6 !important; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; -webkit-background-clip: initial !important; background-clip: initial !important; font-weight: 700;">DEV</span>';
        }
    }

    // --- State Variables ---
    let currentResumeTitle = "resume";
    let styleConfig = { ...DEFAULT_STYLE_CONFIG };
    let templatesCssText = "";
    let currentFileHandle = null;
    let currentFileName = null;

    // Highlight & Cursor Synchronizer State
    let currentTokens = [];
    let lastCleanHTML = "";
    let isHighlightActive = false;

    // --- Telemetry Subsystem ---
    const sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    let printCount = 0;
    const buttonsClicked = new Set();

    // Global listener to track used buttons
    document.addEventListener('click', (event) => {
        const btn = event.target.closest('button, .btn, .font-tile, .preset-btn, .toolbar-btn');
        if (btn) {
            const btnId = btn.id || btn.getAttribute('data-action') || btn.getAttribute('data-font') || btn.textContent.trim();
            if (btnId) {
                buttonsClicked.add(btnId);
            }
        }
    });

    function getOS() {
        const userAgent = window.navigator.userAgent.toLowerCase();
        const platform = window.navigator.platform?.toLowerCase() || '';
        if (userAgent.indexOf("win") !== -1 || platform.indexOf("win") !== -1) return "Windows";
        if (userAgent.indexOf("mac") !== -1 || platform.indexOf("mac") !== -1) return "macOS";
        if (userAgent.indexOf("linux") !== -1 || platform.indexOf("linux") !== -1) return "Linux";
        if (userAgent.indexOf("android") !== -1) return "Android";
        if (userAgent.indexOf("iphone") !== -1 || userAgent.indexOf("ipad") !== -1) return "iOS";
        return "Unknown";
    }

    function getOSVersion() {
        const ua = window.navigator.userAgent;
        if (ua.indexOf("Windows NT 10.0") !== -1) return "10/11";
        if (ua.indexOf("Windows NT 6.3") !== -1) return "8.1";
        if (ua.indexOf("Windows NT 6.2") !== -1) return "8";
        if (ua.indexOf("Windows NT 6.1") !== -1) return "7";
        const macMatch = ua.match(/Mac OS X (\d+[._]\d+[._]\d+)/);
        if (macMatch) return macMatch[1].replace(/_/g, '.');
        const androidMatch = ua.match(/Android (\d+(\.\d+)?)/);
        if (androidMatch) return androidMatch[1];
        const iosMatch = ua.match(/OS (\d+[._]\d+([._]\d+)?)/);
        if (iosMatch) return iosMatch[1].replace(/_/g, '.');
        return "Unknown";
    }

    function getBrowser() {
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (userAgent.indexOf("edg/") !== -1) return "Edge";
        if (userAgent.indexOf("chrome") !== -1 && userAgent.indexOf("safari") !== -1) return "Chrome";
        if (userAgent.indexOf("firefox") !== -1) return "Firefox";
        if (userAgent.indexOf("safari") !== -1) return "Safari";
        return "Unknown";
    }

    function getBrowserVersion() {
        const ua = window.navigator.userAgent;
        const match = ua.match(/(edg|chrome|safari|firefox)\/?\s*(\d+(\.\d+)*)/i);
        if (match && match[2]) {
            return match[2];
        }
        return "Unknown";
    }

    function getDeviceType() {
        const ua = window.navigator.userAgent.toLowerCase();
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return "Tablet";
        }
        if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            return "Mobile";
        }
        return "Desktop";
    }

    function getWordAndCharCount() {
        const text = markdownInput ? markdownInput.value : "";
        const charCount = text.length;
        const cleanText = text.replace(/[*_#`\-|[\]()]/g, ' ');
        const wordCount = cleanText.trim().split(/\s+/).filter(w => w.length > 0).length;
        return { wordCount, charCount };
    }

    function getAtsMetrics() {
        const scoreValText = document.getElementById('score-value');
        const score = scoreValText ? parseInt(scoreValText.textContent) || 0 : 0;
        
        const failedRules = [];
        const checklist = document.getElementById('ats-checklist');
        if (checklist) {
            checklist.querySelectorAll('li.fail span').forEach(el => {
                failedRules.push(el.textContent.trim());
            });
        }
        return { score, failedRules };
    }

    async function sendTelemetry(eventType, extraData = {}) {
        try {
            const counts = getWordAndCharCount();
            const ats = getAtsMetrics();
            
            const payload = {
                sessionId,
                eventType,
                wordCount: counts.wordCount,
                charCount: counts.charCount,
                activePreset: styleConfig.activePreset || 'classic',
                fontFamily: styleConfig.fontFamily || 'Inter',
                layoutMode: styleConfig.layoutMode || '1-column',
                atsScore: ats.score,
                failedRules: ats.failedRules,
                os: getOS(),
                osVersion: getOSVersion(),
                browser: getBrowser(),
                browserVersion: getBrowserVersion(),
                deviceType: getDeviceType(),
                printCount,
                buttonsClicked: Array.from(buttonsClicked),
                timestamp: new Date().toISOString(),
                ...extraData
            };

            await fetch('/api/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.warn('[Telemetry] Error sending event:', e);
        }
    }

    // Debounced telemetry for ATS Scorecard changes to avoid spamming
    const debouncedAtsTelemetry = debounce(() => sendTelemetry('ATS Check'), 5000);


    // --- Undo/Redo Custom History Stack ---
    const historyStack = [];
    let historyIndex = -1;
    const maxHistorySize = 100;

    function saveHistoryState(text, cursorStart, cursorEnd) {
        // If we are in the middle of the stack, discard the future states
        if (historyIndex < historyStack.length - 1) {
            historyStack.splice(historyIndex + 1);
        }
        
        // Avoid saving consecutive identical texts
        if (historyStack.length > 0 && historyStack[historyStack.length - 1].text === text) {
            return;
        }
        
        historyStack.push({ text, cursorStart, cursorEnd });
        if (historyStack.length > maxHistorySize) {
            historyStack.shift();
        }
        historyIndex = historyStack.length - 1;
        updateUndoRedoButtonsState();
    }

    function saveCurrentStateToHistory() {
        const input = document.getElementById('markdown-input');
        if (input) {
            saveHistoryState(input.value, input.selectionStart, input.selectionEnd);
        }
    }

    function undoState() {
        if (historyIndex > 0) {
            historyIndex--;
            const state = historyStack[historyIndex];
            applyHistoryState(state);
        }
    }

    function redoState() {
        if (historyIndex < historyStack.length - 1) {
            historyIndex++;
            const state = historyStack[historyIndex];
            applyHistoryState(state);
        }
    }

    function applyHistoryState(state) {
        if (!state) return;
        markdownInput.value = state.text;
        markdownInput.setSelectionRange(state.cursorStart, state.cursorEnd);
        
        // Run compilation and save to local storage
        runCompileMarkdown(state.text);
        saveToLocalStorage();
        updateUndoRedoButtonsState();
        markdownInput.focus();
    }

    function updateActiveFileNameDisplay() {
        const activeFileNameEl = document.getElementById('active-file-name');
        if (activeFileNameEl) {
            if (currentFileName) {
                activeFileNameEl.textContent = currentFileName;
                activeFileNameEl.style.display = 'inline-block';
                activeFileNameEl.title = currentFileName;
            } else {
                activeFileNameEl.textContent = '';
                activeFileNameEl.style.display = 'none';
            }
        }
    }

    async function openFile() {
        try {
            if (typeof window.showOpenFilePicker !== 'function') {
                openFileFallback();
                return;
            }
            const [handle] = await window.showOpenFilePicker({
                types: [
                    {
                        description: 'Markdown Files',
                        accept: {
                            'text/markdown': ['.md'],
                            'text/plain': ['.txt']
                        }
                    }
                ],
                excludeAcceptAllOption: true,
                multiple: false
            });
            const file = await handle.getFile();
            
            const reader = new FileReader();
            const text = await new Promise((resolve, reject) => {
                try {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsText(file);
                } catch (e) {
                    reject(e);
                }
            });
            
            currentFileHandle = handle;
            currentFileName = file.name;
            
            saveCurrentStateToHistory();
            markdownInput.value = text;
            runCompileMarkdown(text);
            saveToLocalStorage();
            saveHistoryState(text, 0, 0);
            
            updateActiveFileNameDisplay();
            showToast(`Loaded ${currentFileName}`);
            sendTelemetry('Open File', { filename: currentFileName, fallback: false });
            markdownInput.focus();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("Error opening file:", err);
                showToast("Failed to open file. Trying fallback...");
                openFileFallback();
            }
        }
    }

    function openFileFallback() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md,.txt,text/markdown,text/plain';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = () => {
                const text = reader.result;
                currentFileHandle = null;
                currentFileName = file.name;
                
                saveCurrentStateToHistory();
                markdownInput.value = text;
                runCompileMarkdown(text);
                saveToLocalStorage();
                saveHistoryState(text, 0, 0);
                
                updateActiveFileNameDisplay();
                showToast(`Loaded ${currentFileName}`);
                sendTelemetry('Open File', { filename: currentFileName, fallback: true });
                markdownInput.focus();
            };
            reader.onerror = (err) => {
                console.error("Fallback open failed:", err);
                showToast("Error reading file");
            };
            reader.readAsText(file);
        };
        input.click();
    }

    async function saveFile() {
        if (currentFileHandle) {
            try {
                const options = { mode: 'readwrite' };
                if ((await currentFileHandle.queryPermission(options)) !== 'granted') {
                    if ((await currentFileHandle.requestPermission(options)) !== 'granted') {
                        showToast("Permission denied to save file.");
                        return;
                    }
                }
                const writable = await currentFileHandle.createWritable();
                await writable.write(markdownInput.value);
                await writable.close();
                showToast(`Saved to ${currentFileName}`);
                sendTelemetry('Save File', { filename: currentFileName, fallback: false });
            } catch (err) {
                console.error("Error saving file:", err);
                showToast("Failed to save. Trying Save As...");
                await saveFileAs();
            }
        } else {
            await saveFileAs();
        }
    }

    async function saveFileAs() {
        try {
            if (typeof window.showSaveFilePicker !== 'function') {
                saveFileFallback();
                return;
            }
            const handle = await window.showSaveFilePicker({
                suggestedName: currentFileName || (currentResumeTitle ? `${currentResumeTitle.toLowerCase().replace(/\s+/g, '_')}.md` : 'resume.md'),
                types: [
                    {
                        description: 'Markdown Files',
                        accept: {
                            'text/markdown': ['.md']
                        }
                    }
                ]
            });
            const file = await handle.getFile();
            const writable = await handle.createWritable();
            await writable.write(markdownInput.value);
            await writable.close();
            
            currentFileHandle = handle;
            currentFileName = file.name;
            
            updateActiveFileNameDisplay();
            showToast(`Saved as ${currentFileName}`);
            sendTelemetry('Save File As', { filename: currentFileName, fallback: false });
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("Save As failed:", err);
                showToast("Failed to save file. Trying fallback...");
                saveFileFallback();
            }
        }
    }

    function saveFileFallback() {
        try {
            const text = markdownInput.value;
            const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
            const name = currentFileName || (currentResumeTitle ? `${currentResumeTitle.toLowerCase().replace(/\s+/g, '_')}.md` : 'resume.md');
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            showToast("Downloaded file via browser fallback!");
            sendTelemetry('Save File As', { filename: name, fallback: true });
        } catch (err) {
            console.error("Fallback save failed:", err);
            showToast("Failed to download file");
        }
    }

    function updateUndoRedoButtonsState() {
        const btnUndo = document.querySelector('[data-action="undo"]');
        const btnRedo = document.querySelector('[data-action="redo"]');
        if (btnUndo) {
            btnUndo.disabled = (historyIndex <= 0);
            btnUndo.style.opacity = (historyIndex <= 0) ? '0.4' : '1';
            btnUndo.style.cursor = (historyIndex <= 0) ? 'not-allowed' : 'pointer';
        }
        if (btnRedo) {
            btnRedo.disabled = (historyIndex >= historyStack.length - 1);
            btnRedo.style.opacity = (historyIndex >= historyStack.length - 1) ? '0.4' : '1';
            btnRedo.style.cursor = (historyIndex >= historyStack.length - 1) ? 'not-allowed' : 'pointer';
        }
    }

    const highlightState = {
        get currentTokens() { return currentTokens; },
        set currentTokens(val) { currentTokens = val; },
        get lastCleanHTML() { return lastCleanHTML; },
        set lastCleanHTML(val) { lastCleanHTML = val; },
        get isHighlightActive() { return isHighlightActive; },
        set isHighlightActive(val) { isHighlightActive = val; }
    };

    let customPresets = {
        'custom-1': {
            name: localStorage.getItem('ats_custom_preset_name_1') || 'Custom',
            styles: JSON.parse(localStorage.getItem('ats_custom_preset_1')) || {
                colorBg: '#121212',
                colorHeadings: '#f5f5f5',
                colorBody: '#d4d4d4',
                colorLinks: '#ffffff',
                colorAccent: '#a3a3a3',
                sidebarBg: '#171717',
                sidebarText: '#f5f5f5',
                cosmeticGradient: true,
                columnGradientColor: '#262626',
                columnGradientLength: 150
            }
        },
        'custom-2': {
            name: localStorage.getItem('ats_custom_preset_name_2') || 'Funky (please edit yours)',
            styles: JSON.parse(localStorage.getItem('ats_custom_preset_2')) || {
                colorBg: '#000000',
                colorHeadings: '#39ff14',
                colorBody: '#ff007f',
                colorLinks: '#ffff00',
                colorAccent: '#ff00ff',
                sidebarBg: '#ffff00',
                sidebarText: '#ff00ff',
                cosmeticGradient: true,
                columnGradientColor: '#00ffff',
                columnGradientLength: 150
            }
        }
    };

    // --- DOM Cache Elements ---
    const markdownInput = document.getElementById('markdown-input');
    const resumeOutput = document.getElementById('resume-output');
    const btnPanToggle = document.getElementById('btn-pan-toggle');
    const btnPageBreaks = document.getElementById('btn-page-breaks');
    const selectPageFormat = document.getElementById('select-page-format');

    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomLevelText = document.getElementById('zoom-level');
    const previewCanvas = document.getElementById('preview-canvas');
    const canvasWrapper = document.querySelector('.preview-canvas-wrapper');
    const zoomResetBtn = document.getElementById('zoom-reset');

    const btnSaveDropdownToggle = document.getElementById('btn-save-dropdown-toggle');
    const saveDropdownMenu = document.getElementById('save-dropdown-menu');
    const btnSaveFile = document.getElementById('btn-save-file');
    const btnSaveAsFile = document.getElementById('btn-save-as-file');
    const btnLoadBank = document.getElementById('btn-load-bank');
    const btnLoadSample = document.getElementById('btn-load-sample');
    const btnLoadChangelog = document.getElementById('btn-load-changelog');
    const btnCopyMd = document.getElementById('btn-copy-md');
    const btnClear = document.getElementById('btn-clear');
    const btnPrint = document.getElementById('btn-print');

    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const themeBtnIcon = document.getElementById('theme-btn-icon');
    const themeBtnText = document.getElementById('theme-btn-text');

    const btnAbout = document.getElementById('btn-about');
    const aboutModal = document.getElementById('about-modal');
    const tooltipHelpLink = document.getElementById('tooltip-help-link');
    const btnCloseModal = document.getElementById('btn-close-modal');

    const fontTiles = document.querySelectorAll('.font-tile');
    const fontSizeSlider = document.getElementById('font-size');
    const lineHeightSlider = document.getElementById('line-height');
    const headingScaleSlider = document.getElementById('heading-scale');
    const marginXSlider = document.getElementById('margin-x');
    const marginYSlider = document.getElementById('margin-y');
    const sectionSpacingSlider = document.getElementById('section-spacing');

    const layoutModeSelect = document.getElementById('layout-mode');
    const sidebarPositionSelect = document.getElementById('sidebar-position');
    const colorSidebarBg = document.getElementById('color-sidebar-bg');
    const colorSidebarText = document.getElementById('color-sidebar-text');

    const colorBg = document.getElementById('color-bg');
    const colorHeadings = document.getElementById('color-headings');
    const colorBody = document.getElementById('color-body');
    const colorLinks = document.getElementById('color-links');
    const colorAccent = document.getElementById('color-accent');

    // Advanced & Column Customizer Elements
    const advancedModeToggle = document.getElementById('advanced-mode-toggle');
    const columnSplitSlider = document.getElementById('column-split');
    const columnShadowDistanceSlider = document.getElementById('column-shadow-distance');
    const columnShadowColorPicker = document.getElementById('column-shadow-color');
    const columnGradientLengthSlider = document.getElementById('column-gradient-length');
    const columnGradientColorPicker = document.getElementById('column-gradient-color');
    const columnBorderWidthSlider = document.getElementById('column-border-width');
    const columnBorderOpacitySlider = document.getElementById('column-border-opacity');

    const presetClassicNb = document.getElementById('preset-classic-nb');
    const presetDarkMode = document.getElementById('preset-dark-mode');
    const presetCleanBlue = document.getElementById('preset-clean-blue');
    const presetSoftBlue = document.getElementById('preset-soft-blue');
    const presetGreen = document.getElementById('preset-green');
    const presetSoftRed = document.getElementById('preset-soft-red');
    const presetReset = document.getElementById('preset-reset');
    const presetCustom1 = document.getElementById('preset-custom-1');
    const presetCustom2 = document.getElementById('preset-custom-2');

    const btnCopyStandalone = document.getElementById('btn-copy-standalone');
    const btnCopyCss = document.getElementById('btn-copy-css');
    const btnCopyHtml = document.getElementById('btn-copy-html');
    const btnDownloadMd = document.getElementById('btn-download-md');
    const btnSyncN8n = document.getElementById('btn-sync-n8n');

    const btnDeveloperToggle = document.getElementById('btn-developer-toggle');
    const developerModal = document.getElementById('developer-modal');

    // --- Preload stylesheet ---
    try {
        const response = await fetch(`/templates.css?v=${appVersion}`);
        if (response.ok) {
            templatesCssText = await response.text();
        }
    } catch (e) {
        console.error("Failed to preload templates.css:", e);
    }

    // --- Save helper ---
    const saveToLocalStorage = debounce(() => {
        try {
            localStorage.setItem('ats_resume_markdown', markdownInput.value);

            // Auto-save custom preset state if active
            const activePreset = styleConfig.activePreset;
            if (activePreset === 'custom-1' || activePreset === 'custom-2') {
                const indexStr = activePreset === 'custom-1' ? '1' : '2';
                const presetStyles = { ...styleConfig };
                delete presetStyles.activePreset;
                customPresets[activePreset].styles = presetStyles;
                localStorage.setItem(`ats_custom_preset_${indexStr}`, JSON.stringify(presetStyles));
            }

            localStorage.setItem('ats_resume_styles', JSON.stringify(styleConfig));
            console.log("Configuration and markdown saved to localStorage.");
        } catch (e) {
            console.error("Failed to save to localStorage:", e);
        }
    }, 1000);

    // --- Sync button status ---
    function updateSyncButtonState() {
        const hasDevToken = !!localStorage.getItem('developer_token');
        if (btnSyncN8n) {
            btnSyncN8n.disabled = !hasDevToken;
            if (!hasDevToken) {
                btnSyncN8n.setAttribute('title', "Developer authorization required to sync.");
            } else {
                btnSyncN8n.setAttribute('title', "Send design config directly to your n8n workflow");
            }
        }
    }

    // --- Local parser invoker ---
    function runCompileMarkdown(text) {
        const result = compileMarkdown(text, styleConfig, markdownInput, (newMd) => {
            saveToLocalStorage();
            runCompileMarkdown(newMd);
        });
        resumeOutput.innerHTML = result.html;
        currentTokens = result.tokens;
        currentResumeTitle = result.resumeTitle;
        lastCleanHTML = result.html;

        runAtsChecker(text, result.html);
        updatePageBreaks(resumeOutput);
        updateSyntaxHighlight(markdownInput, highlightCode, cbSyntaxHighlight);
        debouncedAtsTelemetry();
    }

    function sanitizePresetName(name) {
        name = name.trim();
        name = name.replace(/<[^>]*>/g, ''); // strip HTML tags
        
        if (name.length > 30) {
            return { error: "The name must not exceed 30 characters." };
        }
        if (name.length === 0) {
            return { error: "The name cannot be empty." };
        }
        
        const regex = /^[a-zA-Z0-9\sàâäéèêëïîôöùûüçÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ\-\'\!\?\(\)\#]+$/;
        if (!regex.test(name)) {
            return { error: "The name contains forbidden characters." };
        }
        return { name };
    }
 
    function handlePresetRename(key) {
        let defaultName = '';
        if (key === 'classic') defaultName = 'B&W';
        else if (key === 'dark') defaultName = 'Dark';
        else if (key === 'clean-blue') defaultName = 'Corporate Blue';
        else if (key === 'soft-blue') defaultName = 'Soft Blue';
        else if (key === 'green') defaultName = 'Soft Green';
        else if (key === 'soft-red') defaultName = 'Soft Red';
        else if (key === 'custom-1') defaultName = 'Custom';
        else if (key === 'custom-2') defaultName = 'Funky (please edit yours)';

        let storageKey = '';
        if (key === 'custom-1') storageKey = 'ats_custom_preset_name_1';
        else if (key === 'custom-2') storageKey = 'ats_custom_preset_name_2';
        else storageKey = `ats_preset_name_${key}`;

        const oldName = localStorage.getItem(storageKey) || defaultName;
        const newNameInput = prompt(`Rename preset "${oldName}":`, oldName);
        if (newNameInput === null) return;
        
        const result = sanitizePresetName(newNameInput);
        if (result.error) {
            alert(result.error);
            return;
        }
        
        localStorage.setItem(storageKey, result.name);
        if (key === 'custom-1') {
            customPresets['custom-1'].name = result.name;
        } else if (key === 'custom-2') {
            customPresets['custom-2'].name = result.name;
        }
        updatePresetLabels();
        showToast(`Preset renamed to "${result.name}"`);
    }

    function updatePresetLabels() {
        if (presetClassicNb) presetClassicNb.textContent = localStorage.getItem('ats_preset_name_classic') || 'B&W';
        if (presetDarkMode) presetDarkMode.textContent = localStorage.getItem('ats_preset_name_dark') || 'Dark';
        if (presetCleanBlue) presetCleanBlue.textContent = localStorage.getItem('ats_preset_name_clean-blue') || 'Corporate Blue';
        if (presetSoftBlue) presetSoftBlue.textContent = localStorage.getItem('ats_preset_name_soft-blue') || 'Soft Blue';
        if (presetGreen) presetGreen.textContent = localStorage.getItem('ats_preset_name_green') || 'Soft Green';
        if (presetSoftRed) presetSoftRed.textContent = localStorage.getItem('ats_preset_name_soft-red') || 'Soft Red';

        if (presetCustom1) {
            presetCustom1.textContent = localStorage.getItem('ats_custom_preset_name_1') || 'Custom';
        }
        if (presetCustom2) {
            presetCustom2.textContent = localStorage.getItem('ats_custom_preset_name_2') || 'Funky (please edit yours)';
        }
    }

    function updateConfigFromControlsFull() {
        styleConfig.fontSize = fontSizeSlider.value;
        styleConfig.lineHeight = lineHeightSlider.value;
        styleConfig.headingScale = headingScaleSlider.value;
        styleConfig.marginX = marginXSlider.value;
        styleConfig.marginY = marginYSlider.value;
        styleConfig.sectionSpacing = sectionSpacingSlider.value;
        
        const prevLayout = styleConfig.layoutMode;
        styleConfig.layoutMode = layoutModeSelect.value;
        if (styleConfig.layoutMode === '2-column' && prevLayout !== '2-column') {
            styleConfig.cosmeticGradient = true;
            const cosmeticGradientCheckbox = document.getElementById('cosmetic-gradient');
            if (cosmeticGradientCheckbox) {
                cosmeticGradientCheckbox.checked = true;
            }
        }

        // Customizer Advanced Column Values
        if (columnShadowDistanceSlider) styleConfig.columnShadowDistance = parseInt(columnShadowDistanceSlider.value);
        if (columnShadowColorPicker) styleConfig.columnShadowColor = columnShadowColorPicker.value;
        if (columnGradientLengthSlider) styleConfig.columnGradientLength = parseInt(columnGradientLengthSlider.value);
        if (columnGradientColorPicker) styleConfig.columnGradientColor = columnGradientColorPicker.value;
        if (columnBorderWidthSlider) styleConfig.columnBorderWidth = parseInt(columnBorderWidthSlider.value);
        if (columnBorderOpacitySlider) styleConfig.columnBorderOpacity = parseInt(columnBorderOpacitySlider.value);
        if (advancedModeToggle) styleConfig.expertMode = advancedModeToggle.checked;

        if (styleConfig.colorBg !== colorBg.value ||
            styleConfig.colorHeadings !== colorHeadings.value ||
            styleConfig.colorBody !== colorBody.value ||
            styleConfig.colorLinks !== colorLinks.value ||
            styleConfig.colorAccent !== colorAccent.value ||
            styleConfig.sidebarBg !== colorSidebarBg.value ||
            styleConfig.sidebarText !== colorSidebarText.value) {
            if (styleConfig.activePreset !== 'custom-1' && 
                styleConfig.activePreset !== 'custom-2') {
                styleConfig.activePreset = 'custom-1';
            }
        }

        styleConfig.sidebarBg = colorSidebarBg.value;
        styleConfig.sidebarText = colorSidebarText.value;

        styleConfig.colorBg = colorBg.value;
        styleConfig.colorHeadings = colorHeadings.value;
        styleConfig.colorBody = colorBody.value;
        styleConfig.colorLinks = colorLinks.value;
        styleConfig.colorAccent = colorAccent.value;

        applyStyles(styleConfig);
        runCompileMarkdown(markdownInput.value);
        saveToLocalStorage();
    }

    function updateConfigFromControlsLight() {
        styleConfig.fontSize = fontSizeSlider.value;
        styleConfig.lineHeight = lineHeightSlider.value;
        styleConfig.headingScale = headingScaleSlider.value;
        styleConfig.marginX = marginXSlider.value;
        styleConfig.marginY = marginYSlider.value;
        styleConfig.sectionSpacing = sectionSpacingSlider.value;
        
        const prevLayout = styleConfig.layoutMode;
        styleConfig.layoutMode = layoutModeSelect.value;
        if (styleConfig.layoutMode === '2-column' && prevLayout !== '2-column') {
            styleConfig.cosmeticGradient = true;
            const cosmeticGradientCheckbox = document.getElementById('cosmetic-gradient');
            if (cosmeticGradientCheckbox) {
                cosmeticGradientCheckbox.checked = true;
            }
        }

        // Customizer Advanced Column Values
        if (columnShadowDistanceSlider) styleConfig.columnShadowDistance = parseInt(columnShadowDistanceSlider.value);
        if (columnShadowColorPicker) styleConfig.columnShadowColor = columnShadowColorPicker.value;
        if (columnGradientLengthSlider) styleConfig.columnGradientLength = parseInt(columnGradientLengthSlider.value);
        if (columnGradientColorPicker) styleConfig.columnGradientColor = columnGradientColorPicker.value;
        if (columnBorderWidthSlider) styleConfig.columnBorderWidth = parseInt(columnBorderWidthSlider.value);
        if (columnBorderOpacitySlider) styleConfig.columnBorderOpacity = parseInt(columnBorderOpacitySlider.value);
        if (advancedModeToggle) styleConfig.expertMode = advancedModeToggle.checked;

        if (styleConfig.colorBg !== colorBg.value ||
            styleConfig.colorHeadings !== colorHeadings.value ||
            styleConfig.colorBody !== colorBody.value ||
            styleConfig.colorLinks !== colorLinks.value ||
            styleConfig.colorAccent !== colorAccent.value ||
            styleConfig.sidebarBg !== colorSidebarBg.value ||
            styleConfig.sidebarText !== colorSidebarText.value) {
            if (styleConfig.activePreset !== 'custom-1' && 
                styleConfig.activePreset !== 'custom-2') {
                styleConfig.activePreset = 'custom-1';
            }
        }

        styleConfig.sidebarBg = colorSidebarBg.value;
        styleConfig.sidebarText = colorSidebarText.value;

        styleConfig.colorBg = colorBg.value;
        styleConfig.colorHeadings = colorHeadings.value;
        styleConfig.colorBody = colorBody.value;
        styleConfig.colorLinks = colorLinks.value;
        styleConfig.colorAccent = colorAccent.value;

        applyStyles(styleConfig);
        updatePageBreaks(resumeOutput);
        saveToLocalStorage();
    }

    // --- Sub-modules Init ---
    initPanning(canvasWrapper, btnPanToggle);
    initHighlighting(markdownInput, resumeOutput, highlightState);
    initCursorRadar(markdownInput);
    initBidirectionalSync(markdownInput, resumeOutput, canvasWrapper, highlightState);

    // --- Dynamic Syntax Highlighting ---
    const markdownHighlight = document.getElementById('markdown-highlight');
    const highlightCode = document.getElementById('highlight-code');
    const cbSyntaxHighlight = document.getElementById('cb-syntax-highlight');
    const textareaWrapper = document.querySelector('.textarea-syntax-wrapper');

    initSyntaxHighlighting(markdownInput, markdownHighlight, cbSyntaxHighlight, textareaWrapper, highlightCode);

    // --- Keyboard Edition Shortcuts ---
    initShortcuts(markdownInput);
    
    // Custom undo/redo keyboard listener
    markdownInput.addEventListener('keydown', (e) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        if (!isCtrl) return;
        const key = e.key.toLowerCase();
        if (key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                redoState();
            } else {
                undoState();
            }
        } else if (key === 'y') {
            e.preventDefault();
            redoState();
        }
    });
    
    // Global keyboard shortcuts for File management
    window.addEventListener('keydown', (e) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        if (!isCtrl) return;
        
        const key = e.key.toLowerCase();
        
        if (key === 's') {
            e.preventDefault();
            if (e.shiftKey) {
                saveFileAs();
            } else {
                saveFile();
            }
        } else if (key === 'o') {
            e.preventDefault();
            openFile();
        }
    });

    // --- Layout & Customizer Repositioning Button Toggles ---
    function setupButtonGroup(groupId, hiddenSelectId, onChangeCallback) {
        const group = document.getElementById(groupId);
        if (!group) return;
        
        const buttons = group.querySelectorAll('.toggle-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const val = btn.getAttribute('data-value');
                if (hiddenSelectId) {
                    const hiddenSelect = document.getElementById(hiddenSelectId);
                    if (hiddenSelect) {
                        hiddenSelect.value = val;
                        hiddenSelect.dispatchEvent(new Event('change'));
                    }
                }
                if (onChangeCallback) onChangeCallback(val);
            });
        });
    }

    setupButtonGroup('layout-mode-group', 'layout-mode');
    setupButtonGroup('sidebar-position-group', 'sidebar-position');

    // Column Font settings button groups
    setupButtonGroup('column-font-size-group', null, (val) => {
        styleConfig.columnFontSize = val;
        applyStyles(styleConfig);
        runCompileMarkdown(markdownInput.value);
        saveToLocalStorage();
    });

    setupButtonGroup('column-font-style-group', null, (val) => {
        styleConfig.columnFontStyle = val;
        applyStyles(styleConfig);
        runCompileMarkdown(markdownInput.value);
        saveToLocalStorage();
    });

    // Expert Mode Toggle and Help Popup
    if (advancedModeToggle) {
        advancedModeToggle.addEventListener('change', () => {
            styleConfig.expertMode = advancedModeToggle.checked;
            if (styleConfig.expertMode) {
                document.body.classList.add('expert-mode-active');
                applyStyles(styleConfig);
            } else {
                document.body.classList.remove('expert-mode-active');
                
                // Force page format back to A4 when expert mode is disabled
                styleConfig.pageFormat = 'A4';
                if (selectPageFormat) {
                    selectPageFormat.value = 'A4';
                }
                localStorage.setItem('page_format', 'A4');
                applyStyles(styleConfig);
                updatePageBreaks(resumeOutput, styleConfig);
                
                // Auto fit zoom
                if (canvasWrapper && previewCanvas && zoomLevelText) {
                    autoFitZoom(canvasWrapper, previewCanvas, zoomLevelText, () => updatePageBreaks(resumeOutput, styleConfig));
                }
            }
            saveToLocalStorage();
        });
    }

    const btnExpertHelp = document.getElementById('btn-expert-help');
    const btnCloseExpertPopup = document.getElementById('btn-close-expert-popup');
    const expertPopupBox = document.getElementById('expert-popup-box');

    if (btnExpertHelp && expertPopupBox) {
        btnExpertHelp.addEventListener('click', (e) => {
            e.stopPropagation();
            expertPopupBox.classList.toggle('show');
        });
    }

    if (btnCloseExpertPopup && expertPopupBox) {
        btnCloseExpertPopup.addEventListener('click', (e) => {
            e.stopPropagation();
            expertPopupBox.classList.remove('show');
        });
    }

    document.addEventListener('click', (e) => {
        if (expertPopupBox && expertPopupBox.classList.contains('show')) {
            if (!expertPopupBox.contains(e.target) && e.target !== btnExpertHelp) {
                expertPopupBox.classList.remove('show');
            }
        }
        
        const pageFormatDropdown = document.getElementById('page-format-dropdown');
        const btnPageFormat = document.getElementById('btn-page-format');
        if (pageFormatDropdown && pageFormatDropdown.classList.contains('show')) {
            if (!pageFormatDropdown.contains(e.target) && (!btnPageFormat || !btnPageFormat.contains(e.target))) {
                pageFormatDropdown.classList.remove('show');
            }
        }

        if (saveDropdownMenu && saveDropdownMenu.classList.contains('show')) {
            if (!saveDropdownMenu.contains(e.target) && (!btnSaveDropdownToggle || !btnSaveDropdownToggle.contains(e.target))) {
                saveDropdownMenu.classList.remove('show');
            }
        }
    });

    // Real-time Visual Split Slider feedback and custom Position-aware drag handling
    if (columnSplitSlider) {
        const splitMainPct = document.getElementById('split-main-pct');
        const splitSidebarPct = document.getElementById('split-sidebar-pct');
        const splitMainVisual = document.getElementById('split-main-visual');
        const splitSidebarVisual = document.getElementById('split-sidebar-visual');

        const updateSplitVisual = (val) => {
            if (splitMainPct) splitMainPct.textContent = val + '%';
            if (splitSidebarPct) splitSidebarPct.textContent = (100 - val) + '%';
            if (splitMainVisual) splitMainVisual.style.width = val + '%';
            if (splitSidebarVisual) splitSidebarVisual.style.width = (100 - val) + '%';
        };

        columnSplitSlider.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            if (val < 30) {
                val = 30;
                e.target.value = 30;
            } else if (val > 70) {
                val = 70;
                e.target.value = 70;
            }
            
            updateSplitVisual(val);

            // Update styleConfig split based on sidebar position
            const isLeft = (styleConfig.sidebarPosition === 'left');
            if (isLeft) {
                styleConfig.columnSplit = 100 - val;
            } else {
                styleConfig.columnSplit = val;
            }
            
            applyStyles(styleConfig);
        });

        columnSplitSlider.addEventListener('change', () => {
            runCompileMarkdown(markdownInput.value);
            saveToLocalStorage();
        });
    }

    if (sidebarPositionSelect) {
        sidebarPositionSelect.addEventListener('change', () => {
            const oldPosition = styleConfig.sidebarPosition;
            const newPosition = sidebarPositionSelect.value;
            
            if (oldPosition !== newPosition) {
                styleConfig.sidebarPosition = newPosition;
                
                // Invert the split slider UI value
                if (columnSplitSlider) {
                    const currentSliderVal = parseInt(columnSplitSlider.value);
                    columnSplitSlider.value = 100 - currentSliderVal;
                }
                
                applyStyles(styleConfig);
                runCompileMarkdown(markdownInput.value);
                saveToLocalStorage();
            }
        });
    }

    // --- Cosmetic Options Checkboxes Binding ---
    const cosmeticShadow = document.getElementById('cosmetic-shadow');
    const cosmeticBorder = document.getElementById('cosmetic-border');
    const cosmeticGradient = document.getElementById('cosmetic-gradient');
    const showVersionCheckbox = document.getElementById('show-version');

    const updateCosmetics = () => {
        styleConfig.cosmeticShadow = cosmeticShadow ? cosmeticShadow.checked : true;
        styleConfig.cosmeticBorder = cosmeticBorder ? cosmeticBorder.checked : false;
        styleConfig.cosmeticGradient = cosmeticGradient ? cosmeticGradient.checked : false;
        styleConfig.showVersion = showVersionCheckbox ? showVersionCheckbox.checked : false;
        applyStyles(styleConfig);
        runCompileMarkdown(markdownInput.value);
        saveToLocalStorage();
    };

    if (cosmeticShadow) cosmeticShadow.addEventListener('change', updateCosmetics);
    if (cosmeticBorder) cosmeticBorder.addEventListener('change', updateCosmetics);
    if (cosmeticGradient) cosmeticGradient.addEventListener('change', updateCosmetics);
    if (showVersionCheckbox) showVersionCheckbox.addEventListener('change', updateCosmetics);

    // --- App Theme Switcher ---
    initThemeToggle(btnThemeToggle, themeBtnIcon, themeBtnText);

    // Debounced compilation to prevent typing lag
    const debouncedCompile = debounce((text) => {
        runCompileMarkdown(text);
        saveToLocalStorage();
        saveHistoryState(text, markdownInput.selectionStart, markdownInput.selectionEnd);
    }, 200);

    // --- UI Controls Event Binding ---
    markdownInput.addEventListener('input', (e) => {
        // 1. Update syntax highlighting immediately for fast visual feedback
        updateSyntaxHighlight(markdownInput, highlightCode, cbSyntaxHighlight);
        
        // 2. Debounce the heavier Marked parsing, page layout measuring, and saving
        debouncedCompile(e.target.value);
    });

    // Bind light styling updates to sliders and color pickers (instant render)
    const stylingElements = [
        fontSizeSlider, lineHeightSlider, headingScaleSlider,
        marginXSlider, marginYSlider, sectionSpacingSlider,
        colorSidebarBg, colorSidebarText,
        colorBg, colorHeadings, colorBody, colorLinks, colorAccent,
        columnShadowDistanceSlider, columnShadowColorPicker,
        columnGradientLengthSlider, columnGradientColorPicker,
        columnBorderWidthSlider, columnBorderOpacitySlider
    ];

    stylingElements.forEach(el => {
        if (el) {
            el.addEventListener('input', updateConfigFromControlsLight);
            el.addEventListener('change', updateConfigFromControlsLight);
        }
    });

    // Layout mode change requires full restructuring of DOM
    if (layoutModeSelect) {
        layoutModeSelect.addEventListener('change', updateConfigFromControlsFull);
    }

    // Font family tiles
    fontTiles.forEach(tile => {
        tile.addEventListener('click', () => {
            styleConfig.fontFamily = tile.getAttribute('data-font');
            applyStyles(styleConfig);
            runCompileMarkdown(markdownInput.value);
            saveToLocalStorage();
        });
    });

    // Helper to apply preset styles and cool gradient by default if 2-columns active
    const applyPresetValues = (presetName, values, coolGradientColor, extraConfig = {}) => {
        styleConfig.activePreset = presetName;
        styleConfig.colorBg = values.colorBg;
        styleConfig.colorHeadings = values.colorHeadings;
        styleConfig.colorBody = values.colorBody;
        styleConfig.colorLinks = values.colorLinks;
        styleConfig.colorAccent = values.colorAccent;
        styleConfig.sidebarBg = values.sidebarBg;
        styleConfig.sidebarText = values.sidebarText;
        
        styleConfig.columnGradientColor = coolGradientColor;
        styleConfig.columnGradientLength = 150;
        if (styleConfig.layoutMode === '2-column') {
            styleConfig.cosmeticGradient = true;
        }
        
        // Default cosmeticShadow to true unless explicitly disabled
        styleConfig.cosmeticShadow = extraConfig.cosmeticShadow !== undefined ? extraConfig.cosmeticShadow : true;
        for (const [key, val] of Object.entries(extraConfig)) {
            if (key !== 'cosmeticShadow') {
                styleConfig[key] = val;
            }
        }
        
        updateControlsFromConfig(styleConfig);
        applyStyles(styleConfig);
        runCompileMarkdown(markdownInput.value);
        saveToLocalStorage();
    };

    // Save and Load System Files
    if (btnSaveDropdownToggle && saveDropdownMenu) {
        btnSaveDropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            saveDropdownMenu.classList.toggle('show');
        });
    }

    if (btnSaveFile) {
        btnSaveFile.addEventListener('click', async (e) => {
            e.preventDefault();
            if (saveDropdownMenu) saveDropdownMenu.classList.remove('show');
            await saveFile();
            markdownInput.focus();
        });
    }

    if (btnSaveAsFile) {
        btnSaveAsFile.addEventListener('click', async (e) => {
            e.preventDefault();
            if (saveDropdownMenu) saveDropdownMenu.classList.remove('show');
            await saveFileAs();
            markdownInput.focus();
        });
    }

    if (btnLoadBank) {
        btnLoadBank.addEventListener('click', async (e) => {
            e.preventDefault();
            if (saveDropdownMenu) saveDropdownMenu.classList.remove('show');
            await openFile();
            markdownInput.focus();
        });
    }

    // Color presets definitions
    const presetDefinitions = {
        'classic': {
            styles: {
                colorBg: '#ffffff',
                colorHeadings: '#000000',
                colorBody: '#000000',
                colorLinks: '#000000',
                colorAccent: '#000000',
                sidebarBg: '#111111',
                sidebarText: '#ffffff'
            },
            gradientColor: '#111111',
            extra: { cosmeticShadow: false }
        },
        'dark': {
            styles: {
                colorBg: '#0f172a',
                colorHeadings: '#f8fafc',
                colorBody: '#cbd5e1',
                colorLinks: '#38bdf8',
                colorAccent: '#34d399',
                sidebarBg: '#1e293b',
                sidebarText: '#cbd5e1'
            },
            gradientColor: '#0f172a',
            extra: { cosmeticShadow: true }
        },
        'clean-blue': {
            styles: {
                colorBg: '#ffffff',
                colorHeadings: '#0f172a',
                colorBody: '#334155',
                colorLinks: '#2563eb',
                colorAccent: '#0ea5e9',
                sidebarBg: '#0f172a',
                sidebarText: '#ffffff'
            },
            gradientColor: '#70aef0',
            extra: { cosmeticShadow: true }
        },
        'soft-blue': {
            styles: {
                colorBg: '#f8fafc',
                colorHeadings: '#1e40af',
                colorBody: '#475569',
                colorLinks: '#2563eb',
                colorAccent: '#3b82f6',
                sidebarBg: '#e0f2fe',
                sidebarText: '#0369a1'
            },
            gradientColor: '#bae6fd',
            extra: { cosmeticShadow: true }
        },
        'green': {
            styles: {
                colorBg: '#fcfdfc',
                colorHeadings: '#166534',
                colorBody: '#374151',
                colorLinks: '#15803d',
                colorAccent: '#4ade80',
                sidebarBg: '#dcfce7',
                sidebarText: '#166534'
            },
            gradientColor: '#bbf7d0',
            extra: { cosmeticShadow: true }
        },
        'soft-red': {
            styles: {
                colorBg: '#ffffff',
                colorHeadings: '#7f1d1d',
                colorBody: '#374151',
                colorLinks: '#dc2626',
                colorAccent: '#f87171',
                sidebarBg: '#fee2e2',
                sidebarText: '#991b1b'
            },
            gradientColor: '#fecaca',
            extra: { cosmeticShadow: true }
        }
    };

    const executePresetClick = (key) => {
        const def = presetDefinitions[key];
        if (def) {
            applyPresetValues(key, def.styles, def.gradientColor, def.extra);
        } else {
            // It's custom-1 or custom-2
            const preset = customPresets[key];
            const defaultCoolGradient = key === 'custom-1' ? '#262626' : '#00ffff';
            if (!preset.styles) {
                const presetStyles = { ...styleConfig };
                delete presetStyles.activePreset;
                preset.styles = presetStyles;
                const indexStr = key === 'custom-1' ? '1' : '2';
                localStorage.setItem(`ats_custom_preset_${indexStr}`, JSON.stringify(preset.styles));
                showToast(`${preset.name} saved with current design configuration!`);
            }
            styleConfig.activePreset = key;
            
            // Assign saved styles to styleConfig
            Object.assign(styleConfig, preset.styles);
            styleConfig.activePreset = key; // Ensure activePreset is preserved
            
            updateControlsFromConfig(styleConfig);
            applyStyles(styleConfig);
            runCompileMarkdown(markdownInput.value);
            saveToLocalStorage();
        }
    };

    let presetClickTimeouts = {};

    const handlePresetClick = (key) => {
        if (presetClickTimeouts[key]) {
            clearTimeout(presetClickTimeouts[key]);
            presetClickTimeouts[key] = null;
            handlePresetRename(key);
            return;
        }
        
        presetClickTimeouts[key] = setTimeout(() => {
            presetClickTimeouts[key] = null;
            executePresetClick(key);
        }, 250);
    };

    const presetButtons = {
        'classic': presetClassicNb,
        'dark': presetDarkMode,
        'clean-blue': presetCleanBlue,
        'soft-blue': presetSoftBlue,
        'green': presetGreen,
        'soft-red': presetSoftRed,
        'custom-1': presetCustom1,
        'custom-2': presetCustom2
    };

    for (const [key, btn] of Object.entries(presetButtons)) {
        if (btn) {
            btn.addEventListener('click', () => handlePresetClick(key));
        }
    }

    if (presetReset) {
        presetReset.addEventListener('click', () => {
            if (confirm("Reset all design configurations to default?")) {
                // Mutate styleConfig in-place to preserve references across modules
                for (const key in styleConfig) {
                    delete styleConfig[key];
                }
                Object.assign(styleConfig, DEFAULT_STYLE_CONFIG);
                
                updateControlsFromConfig(styleConfig);
                applyStyles(styleConfig);
                runCompileMarkdown(markdownInput.value);
                saveToLocalStorage();
                showToast("Design preferences reset to default!");
            }
        });
    }

    // Zoom Handlers
    initZoom({
        zoomInBtn,
        zoomOutBtn,
        zoomResetBtn,
        zoomLevelText,
        previewCanvas,
        canvasWrapper,
        updatePageBreaks: () => updatePageBreaks(resumeOutput, styleConfig)
    });

    // Formatting outlines & printing format config
    initPrint({
        btnPrint,
        btnPageBreaks,
        selectPageFormat,
        resumeOutput,
        getCurrentResumeTitle: () => currentResumeTitle,
        autoFitZoom: () => autoFitZoom(canvasWrapper, previewCanvas, zoomLevelText, () => updatePageBreaks(resumeOutput, styleConfig)),
        triggerCompile: () => runCompileMarkdown(markdownInput.value),
        styleConfig
    });

    // Load sample
    if (btnLoadSample) {
        btnLoadSample.addEventListener('click', (e) => {
            e.preventDefault();
            saveCurrentStateToHistory();
            fetch('/sample.md')
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return res.text();
                })
                .then(sampleText => {
                    markdownInput.value = sampleText;
                    runCompileMarkdown(sampleText);
                    saveToLocalStorage();
                    saveHistoryState(sampleText, 0, 0);
                    currentFileHandle = null;
                    currentFileName = null;
                    updateActiveFileNameDisplay();
                    showToast("Julien Avarre sample loaded! (Ctrl+Z to undo)");
                    markdownInput.focus();
                })
                .catch(err => {
                    console.error(err);
                    showToast(`Failed to load sample: ${err.message}`);
                    markdownInput.focus();
                });
        });
    }

    // Load changelog / updates
    if (btnLoadChangelog) {
        btnLoadChangelog.addEventListener('click', (e) => {
            e.preventDefault();
            saveCurrentStateToHistory();
            fetch('/whatsnew.md')
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return res.text();
                })
                .then(changelogText => {
                    markdownInput.value = changelogText;
                    runCompileMarkdown(changelogText);
                    saveToLocalStorage();
                    saveHistoryState(changelogText, 0, 0);
                    currentFileHandle = null;
                    currentFileName = null;
                    updateActiveFileNameDisplay();
                    showToast("Jobby updates loaded! (Ctrl+Z to undo)");
                    markdownInput.focus();
                })
                .catch(err => {
                    console.error(err);
                    showToast(`Failed to load updates: ${err.message}`);
                    markdownInput.focus();
                });
        });
    }

    // Clear
    btnClear.addEventListener('click', (e) => {
        e.preventDefault();
        saveCurrentStateToHistory();
        markdownInput.value = "";
        runCompileMarkdown("");
        saveToLocalStorage();
        saveHistoryState("", 0, 0);
        currentFileHandle = null;
        currentFileName = null;
        updateActiveFileNameDisplay();
        showToast("Editor cleared! (Ctrl+Z to undo)");
        sendTelemetry('Clear');
        markdownInput.focus();
    });

    // Copy MD
    btnCopyMd.addEventListener('click', (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(markdownInput.value)
            .then(() => {
                showToast("Markdown copied to clipboard!");
                sendTelemetry('Copy Markdown');
            })
            .catch(err => console.error(err));
        markdownInput.focus();
    });

    // --- Modal Overlay Listeners ---
    const helpModal = document.getElementById('help-modal');

    const triggerLogoRoll = (logoAnimateEl) => {
        if (logoAnimateEl) {
            logoAnimateEl.classList.remove('logo-roll');
            void logoAnimateEl.offsetWidth; // Force layout reflow
            logoAnimateEl.classList.add('logo-roll');
        }
    };

    if (btnAbout && aboutModal) {
        btnAbout.addEventListener('click', () => {
            aboutModal.classList.add('show');
            startOpeningFireworks();
            // Auto roll logo when popping about
            triggerLogoRoll(aboutModalLogoAnimate);
        });
        const closeBtn = aboutModal.querySelector('.modal-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                aboutModal.classList.remove('show');
            });
        }
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) aboutModal.classList.remove('show');
        });

        // Event listener for the "Aide" link inside About Modal
        const linkToHelp = aboutModal.querySelector('#link-to-help');
        if (linkToHelp && helpModal) {
            linkToHelp.addEventListener('click', (e) => {
                e.preventDefault();
                aboutModal.classList.remove('show');
                helpModal.classList.add('show');
                // Auto roll logo when popping help
                triggerLogoRoll(helpModalLogoAnimate);
            });
        }
    }

    if (helpModal) {
        const closeBtn = helpModal.querySelector('.modal-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                helpModal.classList.remove('show');
            });
        }
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) helpModal.classList.remove('show');
        });
    }

    if (tooltipHelpLink && helpModal) {
        tooltipHelpLink.addEventListener('click', (e) => {
            e.preventDefault();
            helpModal.classList.add('show');
            // Auto roll logo when popping help from cheatsheet tooltip
            triggerLogoRoll(helpModalLogoAnimate);
        });
    }

    // --- Feedback Modal Listeners & Star Rating ---
    const btnFeedback = document.getElementById('btn-feedback');
    const feedbackModal = document.getElementById('feedback-modal');

    if (btnFeedback && feedbackModal) {
        btnFeedback.addEventListener('click', () => {
            feedbackModal.classList.add('show');
            resetFeedbackForm();
        });

        const closeBtn = feedbackModal.querySelector('#btn-close-feedback-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                feedbackModal.classList.remove('show');
            });
        }

        const cancelBtn = feedbackModal.querySelector('#btn-cancel-feedback');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                feedbackModal.classList.remove('show');
            });
        }

        const closeSuccessBtn = feedbackModal.querySelector('#btn-close-success');
        if (closeSuccessBtn) {
            closeSuccessBtn.addEventListener('click', () => {
                feedbackModal.classList.remove('show');
            });
        }

        feedbackModal.addEventListener('click', (e) => {
            if (e.target === feedbackModal) feedbackModal.classList.remove('show');
        });

        // Interactive Star Rating Logic
        const stars = feedbackModal.querySelectorAll('.star-btn');
        const starsInput = feedbackModal.querySelector('#feedback-stars');
        const starError = feedbackModal.querySelector('#star-error');

        stars.forEach(star => {
            star.addEventListener('click', () => {
                const val = parseInt(star.getAttribute('data-value'));
                starsInput.value = val;
                starError.style.display = 'none';
                
                // Highlight stars
                stars.forEach(s => {
                    const sVal = parseInt(s.getAttribute('data-value'));
                    if (sVal <= val) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
            });

            star.addEventListener('mouseenter', () => {
                const val = parseInt(star.getAttribute('data-value'));
                stars.forEach(s => {
                    const sVal = parseInt(s.getAttribute('data-value'));
                    if (sVal <= val) {
                        s.classList.add('hover-active');
                    } else {
                        s.classList.remove('hover-active');
                    }
                });
            });

            star.addEventListener('mouseleave', () => {
                stars.forEach(s => s.classList.remove('hover-active'));
            });
        });

        // Form submission
        const feedbackForm = feedbackModal.querySelector('#feedback-form');
        const loadingOverlay = feedbackModal.querySelector('#feedback-loading');
        const successOverlay = feedbackModal.querySelector('#feedback-success');

        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Perform manual validations
            const nameInput = feedbackModal.querySelector('#feedback-name');
            const emailInput = feedbackModal.querySelector('#feedback-email');
            const categorySelect = feedbackModal.querySelector('#feedback-category');
            const messageInput = feedbackModal.querySelector('#feedback-message');

            let isValid = true;

            // Name validation
            if (!nameInput.value.trim()) {
                nameInput.classList.add('error');
                isValid = false;
            } else {
                nameInput.classList.remove('error');
            }

            // Stars validation
            const ratingVal = parseInt(starsInput.value);
            if (!ratingVal || ratingVal < 1 || ratingVal > 5) {
                starError.style.display = 'block';
                isValid = false;
            } else {
                starError.style.display = 'none';
            }

            // Message validation
            if (!messageInput.value.trim()) {
                messageInput.classList.add('error');
                isValid = false;
            } else {
                messageInput.classList.remove('error');
            }

            if (!isValid) return;

            // Form is valid - submit feedback
            loadingOverlay.style.display = 'flex';

            const payload = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                stars: ratingVal,
                category: categorySelect.value,
                message: messageInput.value.trim(),
                timestamp: new Date().toISOString()
            };

            try {
                const res = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    loadingOverlay.style.display = 'none';
                    successOverlay.style.display = 'flex';
                } else {
                    throw new Error('Server returned status ' + res.status);
                }
            } catch (err) {
                console.error('[Feedback] Submit failed:', err);
                loadingOverlay.style.display = 'none';
                showToast("Failed to submit feedback. Please try again.");
            }
        });

        function resetFeedbackForm() {
            feedbackForm.reset();
            starsInput.value = "0";
            starError.style.display = 'none';
            stars.forEach(s => s.classList.remove('active', 'hover-active'));
            loadingOverlay.style.display = 'none';
            successOverlay.style.display = 'none';
            
            const nameInput = feedbackModal.querySelector('#feedback-name');
            const messageInput = feedbackModal.querySelector('#feedback-message');
            nameInput.classList.remove('error');
            messageInput.classList.remove('error');
        }
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (aboutModal && aboutModal.classList.contains('show')) {
                aboutModal.classList.remove('show');
            }
            if (helpModal && helpModal.classList.contains('show')) {
                helpModal.classList.remove('show');
            }
            if (feedbackModal && feedbackModal.classList.contains('show')) {
                feedbackModal.classList.remove('show');
            }
        }
    });

    // --- Lazy load Developer Tools brick on authentication ---
    initDeveloperTools(btnDeveloperToggle, developerModal, appVersion, updateSyncButtonState, {
        getStyleConfig: () => styleConfig,
        importConfig: (importedConfig) => {
            for (const key in styleConfig) {
                delete styleConfig[key];
            }
            Object.assign(styleConfig, DEFAULT_STYLE_CONFIG, importedConfig);
            updateControlsFromConfig(styleConfig);
            applyStyles(styleConfig);
            runCompileMarkdown(markdownInput.value);
            saveToLocalStorage();
        }
    });

    // --- Sync design layout config to n8n ---
    if (btnSyncN8n) {
        btnSyncN8n.addEventListener('click', () => {
            const urlKey = isDev ? 'dev_webhook_url' : 'prod_webhook_url';
            const tokenKey = isDev ? 'dev_webhook_token' : 'prod_webhook_token';

            const url = localStorage.getItem(urlKey) || '';
            const token = localStorage.getItem(tokenKey) || '';

            if (!url) {
                showToast("Please configure your Webhook URL in Developer Tools first!");
                return;
            }

            const payload = {
                config: styleConfig,
                css: templatesCssText
            };

            btnSyncN8n.disabled = true;
            const originalText = btnSyncN8n.textContent;
            btnSyncN8n.textContent = "Syncing...";

            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (res.ok) {
                    showToast("Design configuration synced successfully!");
                } else {
                    throw new Error("HTTP " + res.status);
                }
            })
            .catch(err => {
                console.error("n8n sync failed:", err);
                showToast("Sync failed: " + err.message);
            })
            .finally(() => {
                updateSyncButtonState();
                btnSyncN8n.textContent = originalText;
            });
        });
    }

    // --- Clipboard Exports ---
    initExports({
        btnCopyStandalone,
        btnCopyCss,
        btnCopyHtml,
        btnDownloadMd,
        getStyleConfig: () => styleConfig,
        getTemplatesCssText: () => templatesCssText,
        getResumeOutputHtml: () => resumeOutput.innerHTML,
        getMarkdownInputValue: () => markdownInput.value,
        getCurrentResumeTitle: () => currentResumeTitle
    });

    // --- Column Resizing ---
    const handleLeft = document.getElementById('handle-left');
    const handleRight = document.getElementById('handle-right');
    const editorPanel = document.querySelector('.editor-panel');
    const controlsPanel = document.querySelector('.controls-panel');

    if (handleLeft && handleRight) {
        handleLeft.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = editorPanel.getBoundingClientRect().width;
            
            const onMouseMove = (moveEvent) => {
                const dx = moveEvent.clientX - startX;
                const containerWidth = document.querySelector('.app-main').clientWidth;
                const controlsWidth = controlsPanel.getBoundingClientRect().width;
                const maxAllowedWidth = Math.max(250, containerWidth - controlsWidth - 400 - 12);
                const newWidth = Math.min(maxAllowedWidth, Math.max(250, startWidth + dx));
                editorPanel.style.width = `${newWidth}px`;
                editorPanel.style.flex = 'initial';
                autoFitZoom(canvasWrapper, previewCanvas, zoomLevelText, () => updatePageBreaks(resumeOutput));
            };
            
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        handleRight.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = controlsPanel.getBoundingClientRect().width;
            
            const onMouseMove = (moveEvent) => {
                const dx = moveEvent.clientX - startX;
                const containerWidth = document.querySelector('.app-main').clientWidth;
                const editorWidth = editorPanel.getBoundingClientRect().width;
                const maxAllowedWidth = Math.max(280, containerWidth - editorWidth - 400 - 12);
                const newWidth = Math.min(maxAllowedWidth, Math.max(280, startWidth - dx));
                controlsPanel.style.width = `${newWidth}px`;
                controlsPanel.style.flex = 'initial';
                autoFitZoom(canvasWrapper, previewCanvas, zoomLevelText, () => updatePageBreaks(resumeOutput));
            };
            
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // --- Workspace Data Loading ---
    async function loadWorkspaceData() {
        let loadedMarkdown = null;
        let loadedConfig = null;

        const path = window.location.pathname;
        const isSampleRoute = path === '/sample' || path === '/sample/';
        const isWhatsNewRoute = path === '/whatsnew' || path === '/whatsnew/';

        if (isSampleRoute || isWhatsNewRoute) {
            const fileName = isSampleRoute ? 'sample.md' : 'whatsnew.md';
            try {
                const response = await fetch('/' + fileName);
                if (response.ok) {
                    loadedMarkdown = await response.text();
                    console.log(`Loaded direct SPA route file: ${fileName}`);
                }
            } catch (e) {
                console.error(`Failed to fetch direct SPA route file ${fileName}:`, e);
            }
            
            const savedStyles = localStorage.getItem('ats_resume_styles');
            if (savedStyles) {
                try {
                    loadedConfig = JSON.parse(savedStyles);
                } catch (e) {
                    console.error("Failed to parse saved styles for direct route:", e);
                }
            }
        }

        if (!loadedMarkdown) {
            const savedMd = localStorage.getItem('ats_resume_markdown');
            const savedStyles = localStorage.getItem('ats_resume_styles');

            if (savedMd) {
                loadedMarkdown = savedMd;
                if (savedStyles) {
                    try {
                        loadedConfig = JSON.parse(savedStyles);
                    } catch (e) {
                        console.error("Failed to parse saved styles:", e);
                    }
                }
            }
        }

        if (!loadedMarkdown) {
            try {
                const mdResponse = await fetch('/resume.md');
                if (mdResponse.ok) {
                    loadedMarkdown = await mdResponse.text();
                    const configResponse = await fetch('/config.json');
                    if (configResponse.ok) {
                        try {
                            loadedConfig = await configResponse.json();
                        } catch (e) {
                            console.error("Failed to parse config.json:", e);
                        }
                    }
                    console.log("Loaded legacy files from disk.");
                }
            } catch (e) {
                console.warn("Attempt to fetch legacy files failed:", e);
            }
        }

        if (!loadedMarkdown) {
            try {
                const sampleResponse = await fetch('/sample.md');
                if (sampleResponse.ok) {
                    loadedMarkdown = await sampleResponse.text();
                    console.log("Loaded default sample.md.");
                } else {
                    loadedMarkdown = "# Welcome to Jobby MD Editor\n\nStart typing here...";
                }
            } catch (e) {
                console.error("Failed to fetch sample.md:", e);
                loadedMarkdown = "# Welcome to Jobby MD Editor\n\nStart typing here...";
            }
        }

        markdownInput.value = loadedMarkdown;
        if (loadedConfig) {
            styleConfig = { ...DEFAULT_STYLE_CONFIG, ...loadedConfig };
        } else {
            styleConfig = { ...DEFAULT_STYLE_CONFIG };
        }

        // Migrate legacy activePreset
        if (styleConfig.activePreset === 'custom' || !styleConfig.activePreset) {
            styleConfig.activePreset = 'custom-1';
        }

        // Initialize custom presets styles if empty and it matches activePreset
        if (styleConfig.activePreset === 'custom-1' && !customPresets['custom-1'].styles) {
            const presetStyles = {
                ...DEFAULT_STYLE_CONFIG,
                colorBg: '#121212',
                colorHeadings: '#f5f5f5',
                colorBody: '#d4d4d4',
                colorLinks: '#ffffff',
                colorAccent: '#a3a3a3',
                sidebarBg: '#171717',
                sidebarText: '#f5f5f5',
                cosmeticGradient: true,
                columnGradientColor: '#262626',
                columnGradientLength: 150
            };
            delete presetStyles.activePreset;
            customPresets['custom-1'].styles = presetStyles;
            localStorage.setItem('ats_custom_preset_1', JSON.stringify(presetStyles));
        } else if (styleConfig.activePreset === 'custom-2' && !customPresets['custom-2'].styles) {
            const presetStyles = {
                ...DEFAULT_STYLE_CONFIG,
                colorBg: '#000000',
                colorHeadings: '#39ff14',
                colorBody: '#ff007f',
                colorLinks: '#ffff00',
                colorAccent: '#ff00ff',
                sidebarBg: '#ffff00',
                sidebarText: '#ff00ff',
                cosmeticGradient: true,
                columnGradientColor: '#00ffff',
                columnGradientLength: 150
            };
            delete presetStyles.activePreset;
            customPresets['custom-2'].styles = presetStyles;
            localStorage.setItem('ats_custom_preset_2', JSON.stringify(presetStyles));
        }

        updatePresetLabels();
        updateControlsFromConfig(styleConfig);
        runCompileMarkdown(loadedMarkdown);

        if (!localStorage.getItem('ats_resume_markdown') || isSampleRoute || isWhatsNewRoute) {
            localStorage.setItem('ats_resume_markdown', loadedMarkdown);
            localStorage.setItem('ats_resume_styles', JSON.stringify(styleConfig));
        }

        // Initialize history stack with the initial state!
        saveHistoryState(loadedMarkdown, 0, 0);

        setTimeout(() => autoFitZoom(canvasWrapper, previewCanvas, zoomLevelText, () => updatePageBreaks(resumeOutput)), 300);
    }

    // Launch loading
    await loadWorkspaceData();
    updateSyncButtonState();

    // Trigger Session Start telemetry
    sendTelemetry('Session Start');

    // Register beforeprint telemetry listener
    window.addEventListener('beforeprint', () => {
        printCount++;
        sendTelemetry('Print PDF');
    });

    // --- DESIGN PANEL HIDING & FLOATING UNFOLD BUTTON ---
    const btnCloseDesignPanel = document.getElementById('btn-close-design-panel');
    const btnUnfoldDesignPanel = document.getElementById('btn-unfold-design-panel');

    const updateDesignPanelState = (hidden) => {
        const dock = document.getElementById('folded-controls-dock');
        const previewControls = document.querySelector('.preview-controls');

        if (hidden) {
            if (controlsPanel) controlsPanel.style.display = 'none';
            if (handleRight) handleRight.style.display = 'none';
            if (previewControls) previewControls.style.display = 'none';
            if (btnUnfoldDesignPanel) btnUnfoldDesignPanel.classList.remove('hidden');
            localStorage.setItem('ats_design_panel_hidden', 'true');

            // Move controls to the dock in the user's preferred order:
            // Gear Settings (btnUnfoldDesignPanel is already inside dock), Zoom In, Zoom Out, Outline, Pan, Reset, Page Format
            if (dock) {
                dock.classList.remove('hidden');
                
                const idsToMove = [
                    'zoom-in',
                    'zoom-out',
                    'btn-page-breaks',
                    'btn-pan-toggle',
                    'zoom-reset'
                ];
                idsToMove.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) dock.appendChild(el);
                });

                const formatWrapper = document.querySelector('.page-format-wrapper');
                if (formatWrapper) dock.appendChild(formatWrapper);

                const zoomLevel = document.getElementById('zoom-level');
                if (zoomLevel) zoomLevel.style.display = 'none';

                // Convert title to data-tooltip to enable custom floating labels and suppress browser tooltips
                const dockButtons = dock.querySelectorAll('button, .page-format-wrapper button');
                dockButtons.forEach(btn => {
                    const title = btn.getAttribute('title');
                    if (title) {
                        btn.setAttribute('data-tooltip', title);
                        btn.removeAttribute('title');
                    }
                });
            }
        } else {
            if (controlsPanel) controlsPanel.style.display = '';
            if (handleRight) handleRight.style.display = '';
            if (btnUnfoldDesignPanel) btnUnfoldDesignPanel.classList.add('hidden');
            localStorage.setItem('ats_design_panel_hidden', 'false');

            // Move controls back to preview-controls in their original order
            if (dock) {
                // Restore all title attributes from data-tooltip before hiding dock
                const dockButtons = dock.querySelectorAll('button, .page-format-wrapper button');
                dockButtons.forEach(btn => {
                    const tooltip = btn.getAttribute('data-tooltip');
                    if (tooltip) {
                        btn.setAttribute('title', tooltip);
                        btn.removeAttribute('data-tooltip');
                    }
                });
                dock.classList.add('hidden');
            }
            if (previewControls) {
                previewControls.style.display = '';
                const restoreList = [
                    { id: 'btn-pan-toggle', isClass: false },
                    { id: 'btn-page-breaks', isClass: false },
                    { id: 'zoom-out', isClass: false },
                    { id: 'zoom-level', isClass: false },
                    { id: 'page-format-wrapper', isClass: true },
                    { id: 'zoom-in', isClass: false },
                    { id: 'zoom-reset', isClass: false }
                ];
                restoreList.forEach(item => {
                    const el = item.isClass ? document.querySelector('.' + item.id) : document.getElementById(item.id);
                    if (el) {
                        previewControls.appendChild(el);
                        if (item.id === 'zoom-level') {
                            el.style.display = ''; // restore visibility
                        }
                    }
                });

                // Restore any remaining data-tooltips back to standard titles in preview controls
                const restoredButtons = previewControls.querySelectorAll('button');
                restoredButtons.forEach(btn => {
                    const tooltip = btn.getAttribute('data-tooltip');
                    if (tooltip) {
                        btn.setAttribute('title', tooltip);
                        btn.removeAttribute('data-tooltip');
                    }
                });
            }
        }
        // Recalculate zoom and breaks since width changed
        setTimeout(() => {
            autoFitZoom(canvasWrapper, previewCanvas, zoomLevelText, () => updatePageBreaks(resumeOutput, styleConfig));
        }, 150);
    };

    if (btnCloseDesignPanel) {
        btnCloseDesignPanel.addEventListener('click', () => {
            updateDesignPanelState(true);
        });
    }

    if (btnUnfoldDesignPanel) {
        btnUnfoldDesignPanel.addEventListener('click', () => {
            updateDesignPanelState(false);
        });
    }

    // Initialize panel state on startup
    const isPanelHiddenInit = localStorage.getItem('ats_design_panel_hidden') === 'true';
    if (isPanelHiddenInit) {
        updateDesignPanelState(true);
    }

    // --- EDITOR FORMATTING TOOLBAR ---
    const btnToggleToolbar = document.getElementById('btn-toggle-toolbar');
    const editorToolbar = document.getElementById('editor-toolbar');

    const updateToolbarState = (visible) => {
        if (visible) {
            if (editorToolbar) editorToolbar.classList.remove('hidden');
            if (btnToggleToolbar) btnToggleToolbar.classList.remove('active');
            localStorage.setItem('ats_editor_toolbar_visible', 'true');
        } else {
            if (editorToolbar) editorToolbar.classList.add('hidden');
            if (btnToggleToolbar) btnToggleToolbar.classList.add('active');
            localStorage.setItem('ats_editor_toolbar_visible', 'false');
        }
    };

    if (btnToggleToolbar) {
        btnToggleToolbar.addEventListener('click', (e) => {
            e.preventDefault();
            const isCurrentlyHidden = editorToolbar && editorToolbar.classList.contains('hidden');
            updateToolbarState(isCurrentlyHidden);
            markdownInput.focus();
        });
    }

    // Initialize toolbar state on startup
    const isToolbarVisibleInit = localStorage.getItem('ats_editor_toolbar_visible') === 'true';
    updateToolbarState(isToolbarVisibleInit);

    // Smart Action Mapping
    const toolbarActions = {
        'undo': () => undoState(),
        'redo': () => redoState(),
        'h1': () => { applyHeading(markdownInput, 1); saveHistoryState(markdownInput.value, markdownInput.selectionStart, markdownInput.selectionEnd); },
        'h2': () => { applyHeading(markdownInput, 2); saveHistoryState(markdownInput.value, markdownInput.selectionStart, markdownInput.selectionEnd); },
        'h3': () => { applyHeading(markdownInput, 3); saveHistoryState(markdownInput.value, markdownInput.selectionStart, markdownInput.selectionEnd); },
        'bold': () => { toggleFormatting(markdownInput, '**'); saveHistoryState(markdownInput.value, markdownInput.selectionStart, markdownInput.selectionEnd); },
        'italic': () => { toggleFormatting(markdownInput, '*'); saveHistoryState(markdownInput.value, markdownInput.selectionStart, markdownInput.selectionEnd); },
        'link': () => { insertLink(markdownInput); saveHistoryState(markdownInput.value, markdownInput.selectionStart, markdownInput.selectionEnd); },
        'list': () => { toggleFormattingPrefix(markdownInput, '- '); saveHistoryState(markdownInput.value, markdownInput.selectionStart, markdownInput.selectionEnd); },
        'accent': () => { toggleAccent(markdownInput); saveHistoryState(markdownInput.value, markdownInput.selectionStart, markdownInput.selectionEnd); },
        'muted': () => { toggleMuted(markdownInput); saveHistoryState(markdownInput.value, markdownInput.selectionStart, markdownInput.selectionEnd); },
        'move-up': () => { moveSectionOrLine(markdownInput, -1); saveHistoryState(markdownInput.value, markdownInput.selectionStart, markdownInput.selectionEnd); },
        'move-down': () => { moveSectionOrLine(markdownInput, 1); saveHistoryState(markdownInput.value, markdownInput.selectionStart, markdownInput.selectionEnd); },
        'help': () => {
            const helpModal = document.getElementById('help-modal');
            if (helpModal) {
                helpModal.classList.add('show');
                const helpModalLogoAnimate = document.querySelector('#help-modal .modal-logo svg');
                if (helpModalLogoAnimate) {
                    helpModalLogoAnimate.classList.remove('logo-roll');
                    void helpModalLogoAnimate.offsetWidth;
                    helpModalLogoAnimate.classList.add('logo-roll');
                }
            }
        }
    };

    if (editorToolbar) {
        const toolbarButtons = editorToolbar.querySelectorAll('.toolbar-btn');
        toolbarButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const actionKey = btn.getAttribute('data-action');
                const actionFn = toolbarActions[actionKey];
                if (actionFn) {
                    actionFn();
                }
                // Refocus on editor for continuous typing experience
                if (actionKey !== 'help') {
                    markdownInput.focus();
                }
            });
        });
    }

    // Listen for "What is markdown?" header button click
    const btnMarkdownHelpHeader = document.getElementById('btn-markdown-help-header');
    if (btnMarkdownHelpHeader) {
        btnMarkdownHelpHeader.addEventListener('click', (e) => {
            e.preventDefault();
            toolbarActions['help']();
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeJobby);
} else {
    initializeJobby();
}
