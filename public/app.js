import { DEFAULT_STYLE_CONFIG } from './js/config.js';
import { showToast, debounce } from './js/utils.js';
import { runAtsChecker } from './js/ats.js';
import { initPanning } from './js/panning.js';
import { initHighlighting, initCursorRadar, initBidirectionalSync, showFlashingCursorRadar } from './js/highlight.js';
import { updateBookmarkletLinks } from './js/bookmarklet.js';
import { applyStyles, updateControlsFromConfig } from './js/styles.js';
import { compileMarkdown, updateHeaderInMarkdown } from './js/parser.js';

async function initializeJobby() {
    // --- Load public component bricks dynamically ---
    const publicBricks = [
        { id: 'header-container', url: 'bricks/header.html' },
        { id: 'editor-container', url: 'bricks/editor.html' },
        { id: 'preview-container', url: 'bricks/preview.html' },
        { id: 'controls-container', url: 'bricks/controls.html' },
        { id: 'about-modal', url: 'bricks/about-modal.html' }
    ];

    try {
        const parser = new DOMParser();
        await Promise.all(publicBricks.map(async brick => {
            const res = await fetch(brick.url);
            if (!res.ok) throw new Error(`Failed to fetch ${brick.url}: ${res.statusText}`);
            const htmlText = await res.text();
            const container = document.getElementById(brick.id);
            if (container) {
                const doc = parser.parseFromString(htmlText, 'text/html');
                container.replaceChildren(...doc.body.childNodes);
            }
        }));
    } catch (err) {
        console.error("Critical: Error loading public bricks:", err);
        return;
    }

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
            brandH1.innerHTML = 'Jobby <span>Markdown</span> Editor <span style="font-size: 10px; background: #14b8a6; color: #0f172a; padding: 2px 6px; border-radius: 4px; margin-left: 8px; vertical-align: middle; font-weight: 700; letter-spacing: 0.05em;">DEV</span>';
        }
    }

    // --- State Variables ---
    let currentResumeTitle = "resume";
    let styleConfig = { ...DEFAULT_STYLE_CONFIG };
    let templatesCssText = "";
    let zoomFactor = 1.0;
    let isUserZoomed = false;
    let showPageBreaks = localStorage.getItem('show_page_breaks') === 'true';
    let pageFormat = localStorage.getItem('page_format') || 'A4';

    // Highlight & Cursor Synchronizer State
    let currentTokens = [];
    let lastCleanHTML = "";
    let isHighlightActive = false;

    const highlightState = {
        get currentTokens() { return currentTokens; },
        set currentTokens(val) { currentTokens = val; },
        get lastCleanHTML() { return lastCleanHTML; },
        set lastCleanHTML(val) { lastCleanHTML = val; },
        get isHighlightActive() { return isHighlightActive; },
        set isHighlightActive(val) { isHighlightActive = val; }
    };

    let customColors = {
        colorBg: DEFAULT_STYLE_CONFIG.colorBg,
        colorHeadings: DEFAULT_STYLE_CONFIG.colorHeadings,
        colorBody: DEFAULT_STYLE_CONFIG.colorBody,
        colorLinks: DEFAULT_STYLE_CONFIG.colorLinks,
        colorAccent: DEFAULT_STYLE_CONFIG.colorAccent,
        sidebarBg: DEFAULT_STYLE_CONFIG.sidebarBg,
        sidebarText: DEFAULT_STYLE_CONFIG.sidebarText
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

    const btnLoadSample = document.getElementById('btn-load-sample');
    const btnCopyMd = document.getElementById('btn-copy-md');
    const btnClear = document.getElementById('btn-clear');
    const btnPrint = document.getElementById('btn-print');

    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const themeBtnIcon = document.getElementById('theme-btn-icon');
    const themeBtnText = document.getElementById('theme-btn-text');

    const btnAbout = document.getElementById('btn-about');
    const aboutModal = document.getElementById('about-modal');
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

    const presetClassicNb = document.getElementById('preset-classic-nb');
    const presetDarkMode = document.getElementById('preset-dark-mode');
    const presetCleanBlue = document.getElementById('preset-clean-blue');
    const presetCustom = document.getElementById('preset-custom');

    const btnCopyStandalone = document.getElementById('btn-copy-standalone');
    const btnCopyCss = document.getElementById('btn-copy-css');
    const btnCopyHtml = document.getElementById('btn-copy-html');
    const btnDownloadMd = document.getElementById('btn-download-md');
    const btnSyncN8n = document.getElementById('btn-sync-n8n');

    const btnDeveloperToggle = document.getElementById('btn-developer-toggle');
    const developerModal = document.getElementById('developer-modal');

    // --- Preload stylesheet ---
    try {
        const response = await fetch('templates.css?v=1.2.6');
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

    // --- Page Break Render ---
    function updatePageBreaks() {
        if (!resumeOutput) return;

        const existingBreaks = resumeOutput.querySelectorAll('.page-break-indicator');
        existingBreaks.forEach(el => el.remove());

        if (pageFormat === "letter") {
            resumeOutput.classList.add('letter-format');
        } else {
            resumeOutput.classList.remove('letter-format');
        }

        if (!showPageBreaks) return;

        const sheetHeight = resumeOutput.scrollHeight;
        let pageHeightPx = 0;

        const tempDiv = document.createElement('div');
        tempDiv.style.height = pageFormat === "A4" ? '297mm' : '11in';
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        resumeOutput.appendChild(tempDiv);
        pageHeightPx = tempDiv.offsetHeight;
        tempDiv.remove();

        if (pageHeightPx <= 0) return;

        const pagesCount = Math.ceil(sheetHeight / pageHeightPx);
        for (let i = 1; i < pagesCount; i++) {
            const breakEl = document.createElement('div');
            breakEl.className = 'page-break-indicator';
            breakEl.style.top = `${i * pageHeightPx}px`;
            breakEl.innerHTML = `<span class="page-break-text">PAGE ${i} / ${i + 1} BREAK</span>`;
            resumeOutput.appendChild(breakEl);
        }
    }

    // --- Fitting scaling ---
    function autoFitZoom() {
        if (isUserZoomed) return;
        if (!canvasWrapper) return;

        const wrapperWidth = canvasWrapper.clientWidth - 60;
        const sheetWidth = 794;

        if (wrapperWidth < sheetWidth) {
            zoomFactor = wrapperWidth / sheetWidth;
        } else {
            zoomFactor = 1.0;
        }

        updateZoomDisplay();
        updatePageBreaks();

        const centerScroll = () => {
            canvasWrapper.scrollLeft = (canvasWrapper.scrollWidth - canvasWrapper.clientWidth) / 2;
            canvasWrapper.scrollTop = 0;
        };
        centerScroll();
        setTimeout(centerScroll, 50);
    }

    function updateZoomDisplay() {
        if (previewCanvas) {
            previewCanvas.style.setProperty('--zoom-factor', zoomFactor);
        }
        if (zoomLevelText) {
            zoomLevelText.textContent = `${Math.round(zoomFactor * 100)}%`;
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
        updatePageBreaks();
    }

    function saveCustomColorsState() {
        const bg = (styleConfig.colorBg || '#ffffff').toLowerCase();
        const headings = styleConfig.colorHeadings.toLowerCase();
        const body = styleConfig.colorBody.toLowerCase();
        const links = styleConfig.colorLinks.toLowerCase();
        const accent = styleConfig.colorAccent.toLowerCase();

        const isPreset = (
            (bg === '#ffffff' && headings === '#111111' &&
                body === '#222222' && links === '#000000' &&
                accent === '#444444') ||
            (bg === '#0f172a' && headings === '#f8fafc' &&
                body === '#cbd5e1' && links === '#38bdf8' &&
                accent === '#34d399') ||
            (bg === '#ffffff' && headings === '#0f172a' &&
                body === '#334155' && links === '#2563eb' &&
                accent === '#0ea5e9')
        );
        if (!isPreset) {
            customColors.colorBg = styleConfig.colorBg;
            customColors.colorHeadings = styleConfig.colorHeadings;
            customColors.colorBody = styleConfig.colorBody;
            customColors.colorLinks = styleConfig.colorLinks;
            customColors.colorAccent = styleConfig.colorAccent;
            customColors.sidebarBg = styleConfig.sidebarBg;
            customColors.sidebarText = styleConfig.sidebarText;
        }
    }

    function updateConfigFromControls() {
        styleConfig.fontSize = fontSizeSlider.value;
        styleConfig.lineHeight = lineHeightSlider.value;
        styleConfig.headingScale = headingScaleSlider.value;
        styleConfig.marginX = marginXSlider.value;
        styleConfig.marginY = marginYSlider.value;
        styleConfig.sectionSpacing = sectionSpacingSlider.value;
        styleConfig.layoutMode = layoutModeSelect.value;

        if (styleConfig.colorBg !== colorBg.value ||
            styleConfig.colorHeadings !== colorHeadings.value ||
            styleConfig.colorBody !== colorBody.value ||
            styleConfig.colorLinks !== colorLinks.value ||
            styleConfig.colorAccent !== colorAccent.value ||
            styleConfig.sidebarBg !== colorSidebarBg.value ||
            styleConfig.sidebarText !== colorSidebarText.value) {
            styleConfig.activePreset = 'custom';
        }

        styleConfig.sidebarBg = colorSidebarBg.value;
        styleConfig.sidebarText = colorSidebarText.value;
        styleConfig.sidebarPosition = sidebarPositionSelect.value;

        styleConfig.colorBg = colorBg.value;
        styleConfig.colorHeadings = colorHeadings.value;
        styleConfig.colorBody = colorBody.value;
        styleConfig.colorLinks = colorLinks.value;
        styleConfig.colorAccent = colorAccent.value;

        saveCustomColorsState();
        applyStyles(styleConfig);
        runCompileMarkdown(markdownInput.value);
        saveToLocalStorage();
    }

    // --- Sub-modules Init ---
    initPanning(canvasWrapper, btnPanToggle);
    initHighlighting(markdownInput, resumeOutput, highlightState);
    initCursorRadar(markdownInput);
    initBidirectionalSync(markdownInput, resumeOutput, canvasWrapper, highlightState);



    // --- App Theme Switcher ---
    let appTheme = localStorage.getItem('app-theme') || 'system';

    const themeIcons = {
        system: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
        light: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
        dark: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
    };

    const themeTexts = {
        system: "Theme: Auto",
        light: "Theme: Light",
        dark: "Theme: Dark"
    };

    function applyAppTheme(theme) {
        let activeTheme = theme;
        if (theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            activeTheme = isDark ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', activeTheme);
        if (themeBtnIcon) {
            themeBtnIcon.innerHTML = theme === 'system' ? themeIcons.system : (theme === 'light' ? themeIcons.light : themeIcons.dark);
        }
        if (themeBtnText) {
            themeBtnText.textContent = theme === 'system' ? themeTexts.system : (theme === 'light' ? themeTexts.light : themeTexts.dark);
        }
    }

    btnThemeToggle.addEventListener('click', () => {
        if (appTheme === 'system') {
            appTheme = 'light';
        } else if (appTheme === 'light') {
            appTheme = 'dark';
        } else {
            appTheme = 'system';
        }
        localStorage.setItem('app-theme', appTheme);
        applyAppTheme(appTheme);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (appTheme === 'system') {
            applyAppTheme('system');
        }
    });

    applyAppTheme(appTheme);

    // --- UI Controls Event Binding ---
    markdownInput.addEventListener('input', (e) => {
        runCompileMarkdown(e.target.value);
        saveToLocalStorage();
    });

    const uiElements = [
        fontSizeSlider, lineHeightSlider, headingScaleSlider,
        marginXSlider, marginYSlider, sectionSpacingSlider,
        layoutModeSelect, sidebarPositionSelect,
        colorSidebarBg, colorSidebarText,
        colorBg, colorHeadings, colorBody, colorLinks, colorAccent
    ];

    uiElements.forEach(el => {
        if (el) {
            el.addEventListener('input', updateConfigFromControls);
            el.addEventListener('change', updateConfigFromControls);
        }
    });

    // Font family tiles
    fontTiles.forEach(tile => {
        tile.addEventListener('click', () => {
            styleConfig.fontFamily = tile.getAttribute('data-font');
            applyStyles(styleConfig);
            runCompileMarkdown(markdownInput.value);
            saveToLocalStorage();
        });
    });

    // Color presets
    if (presetClassicNb) {
        presetClassicNb.addEventListener('click', () => {
            styleConfig.activePreset = 'classic';
            styleConfig.colorBg = '#ffffff';
            styleConfig.colorHeadings = '#111111';
            styleConfig.colorBody = '#222222';
            styleConfig.colorLinks = '#000000';
            styleConfig.colorAccent = '#444444';
            updateControlsFromConfig(styleConfig);
            runCompileMarkdown(markdownInput.value);
            saveToLocalStorage();
        });
    }

    if (presetDarkMode) {
        presetDarkMode.addEventListener('click', () => {
            styleConfig.activePreset = 'dark';
            styleConfig.colorBg = '#0f172a';
            styleConfig.colorHeadings = '#f8fafc';
            styleConfig.colorBody = '#cbd5e1';
            styleConfig.colorLinks = '#38bdf8';
            styleConfig.colorAccent = '#34d399';
            updateControlsFromConfig(styleConfig);
            runCompileMarkdown(markdownInput.value);
            saveToLocalStorage();
        });
    }

    if (presetCleanBlue) {
        presetCleanBlue.addEventListener('click', () => {
            styleConfig.activePreset = 'clean-blue';
            styleConfig.colorBg = '#ffffff';
            styleConfig.colorHeadings = '#0f172a';
            styleConfig.colorBody = '#334155';
            styleConfig.colorLinks = '#2563eb';
            styleConfig.colorAccent = '#0ea5e9';
            updateControlsFromConfig(styleConfig);
            runCompileMarkdown(markdownInput.value);
            saveToLocalStorage();
        });
    }

    if (presetCustom) {
        presetCustom.addEventListener('click', () => {
            styleConfig.activePreset = 'custom';
            styleConfig.colorBg = customColors.colorBg;
            styleConfig.colorHeadings = customColors.colorHeadings;
            styleConfig.colorBody = customColors.colorBody;
            styleConfig.colorLinks = customColors.colorLinks;
            styleConfig.colorAccent = customColors.colorAccent;
            styleConfig.sidebarBg = customColors.sidebarBg;
            styleConfig.sidebarText = customColors.sidebarText;
            updateControlsFromConfig(styleConfig);
            runCompileMarkdown(markdownInput.value);
            saveToLocalStorage();
        });
    }

    // Zoom Handlers
    zoomInBtn.addEventListener('click', () => {
        isUserZoomed = true;
        if (zoomFactor < 1.8) {
            zoomFactor += 0.1;
            updateZoomDisplay();
        }
    });

    zoomOutBtn.addEventListener('click', () => {
        isUserZoomed = true;
        if (zoomFactor > 0.4) {
            zoomFactor -= 0.1;
            updateZoomDisplay();
        }
    });

    zoomResetBtn.addEventListener('click', () => {
        isUserZoomed = false;
        autoFitZoom();
    });

    zoomLevelText.addEventListener('dblclick', () => {
        isUserZoomed = false;
        autoFitZoom();
    });

    // Formatting outlines toggle
    btnPageBreaks.addEventListener('click', () => {
        showPageBreaks = !showPageBreaks;
        localStorage.setItem('show_page_breaks', showPageBreaks);
        btnPageBreaks.classList.toggle('active', showPageBreaks);
        updatePageBreaks();
    });

    selectPageFormat.addEventListener('change', (e) => {
        pageFormat = e.target.value;
        localStorage.setItem('page_format', pageFormat);
        updatePageBreaks();
        autoFitZoom();
    });

    // Load sample
    btnLoadSample.addEventListener('click', () => {
        if (confirm("Do you want to reload the default Julien Avarre sample? Your local changes will be replaced.")) {
            fetch('sample.md')
                .then(res => res.text())
                .then(sampleText => {
                    markdownInput.value = sampleText;
                    runCompileMarkdown(sampleText);
                    saveToLocalStorage();
                    showToast("Julien Avarre sample reloaded!");
                })
                .catch(err => console.error(err));
        }
    });

    // Clear
    btnClear.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear the editor?")) {
            markdownInput.value = "";
            runCompileMarkdown("");
            saveToLocalStorage();
        }
    });

    // Copy MD
    btnCopyMd.addEventListener('click', () => {
        navigator.clipboard.writeText(markdownInput.value)
            .then(() => showToast("Markdown copied to clipboard!"))
            .catch(err => console.error(err));
    });

    // Print
    btnPrint.addEventListener('click', () => {
        window.print();
    });

    window.addEventListener('beforeprint', () => {
        document.title = currentResumeTitle;
    });
    window.addEventListener('afterprint', () => {
        document.title = "jobby MD Editor";
    });

    window.addEventListener('resize', autoFitZoom);

    // --- Modal Overlay Listeners ---
    btnAbout.addEventListener('click', () => {
        aboutModal.classList.add('show');
        startOpeningFireworks();
    });

    btnCloseModal.addEventListener('click', () => {
        aboutModal.classList.remove('show');
    });

    aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) aboutModal.classList.remove('show');
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && aboutModal.classList.contains('show')) {
            aboutModal.classList.remove('show');
        }
    });

    // --- Lazy load Developer Tools brick on authentication ---
    let devToolsInitialized = false;

    async function loadDeveloperToolsBrick(token) {
        if (devToolsInitialized) return true;

        const developerModal = document.getElementById('developer-modal');
        if (!developerModal) return false;

        try {
            const res = await fetch('/api/developer-tools-html', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.status === 401) {
                showToast("Unauthorized: Invalid Developer Token.");
                localStorage.removeItem('developer_token');
                updateSyncButtonState();
                return false;
            }

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const htmlText = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            developerModal.replaceChildren(...doc.body.childNodes);

            bindDeveloperToolsEvents();
            devToolsInitialized = true;
            return true;
        } catch (err) {
            console.error("Error loading developer tools brick:", err);
            showToast("Error loading Developer Tools.");
            return false;
        }
    }

    function bindDeveloperToolsEvents() {
        const developerModal = document.getElementById('developer-modal');
        const btnCloseDeveloperModal = document.getElementById('btn-close-developer-modal');
        const prodWebhookUrl = document.getElementById('prod-webhook-url');
        const prodWebhookToken = document.getElementById('prod-webhook-token');
        const devWebhookUrl = document.getElementById('dev-webhook-url');
        const devWebhookToken = document.getElementById('dev-webhook-token');
        const bookmarkletDragLinkProd = document.getElementById('bookmarklet-drag-link-prod');
        const bookmarkletDragLinkDev = document.getElementById('bookmarklet-drag-link-dev');
        const btnSaveDevSettings = document.getElementById('btn-save-dev-settings');

        // Load saved settings into fields
        prodWebhookUrl.value = localStorage.getItem('prod_webhook_url') || 'https://n8n.eole.me/webhook/cv-factory';
        prodWebhookToken.value = localStorage.getItem('prod_webhook_token') || '';
        devWebhookUrl.value = localStorage.getItem('dev_webhook_url') || 'http://localhost:5678/webhook-test/cv-factory';
        devWebhookToken.value = localStorage.getItem('dev_webhook_token') || '';

        const triggerUpdateLinks = () => {
            updateBookmarkletLinks(
                prodWebhookUrl.value, prodWebhookToken.value,
                devWebhookUrl.value, devWebhookToken.value,
                bookmarkletDragLinkProd, bookmarkletDragLinkDev
            );
        };

        prodWebhookUrl.addEventListener('input', triggerUpdateLinks);
        prodWebhookToken.addEventListener('input', triggerUpdateLinks);
        devWebhookUrl.addEventListener('input', triggerUpdateLinks);
        devWebhookToken.addEventListener('input', triggerUpdateLinks);

        // Initial compile of links
        triggerUpdateLinks();

        if (btnCloseDeveloperModal) {
            btnCloseDeveloperModal.addEventListener('click', () => {
                developerModal.classList.remove('show');
            });
        }

        if (btnSaveDevSettings) {
            btnSaveDevSettings.addEventListener('click', () => {
                const prodUrl = prodWebhookUrl.value.trim();
                const prodToken = prodWebhookToken.value.trim();
                const devUrl = devWebhookUrl.value.trim();
                const devToken = devWebhookToken.value.trim();

                localStorage.setItem('prod_webhook_url', prodUrl);
                localStorage.setItem('prod_webhook_token', prodToken);
                localStorage.setItem('dev_webhook_url', devUrl);
                localStorage.setItem('dev_webhook_token', devToken);

                localStorage.setItem('n8n_webhook_url', prodUrl);
                localStorage.setItem('n8n_webhook_token', prodToken);

                showToast("Settings saved successfully!");
                developerModal.classList.remove('show');
            });
        }
    }

    // --- Developer Tools Modal Toggler ---
    if (btnDeveloperToggle) {
        btnDeveloperToggle.addEventListener('click', () => {
            const savedToken = localStorage.getItem('developer_token');
            
            const verifyAndOpen = async (token) => {
                const loaded = await loadDeveloperToolsBrick(token);
                if (loaded) {
                    localStorage.setItem('developer_token', token);
                    updateSyncButtonState();
                    developerModal.classList.add('show');
                }
            };

            const promptUserForToken = () => {
                const enteredToken = prompt("Enter Developer Token to access Developer Tools:");
                if (!enteredToken) return;
                verifyAndOpen(enteredToken);
            };

            if (savedToken) {
                verifyAndOpen(savedToken);
            } else {
                promptUserForToken();
            }
        });
    }

    if (developerModal) {
        developerModal.addEventListener('click', (e) => {
            if (e.target === developerModal) developerModal.classList.remove('show');
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && developerModal && developerModal.classList.contains('show')) {
            developerModal.classList.remove('show');
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
    if (btnCopyStandalone) {
        btnCopyStandalone.addEventListener('click', () => {
            const filename = currentResumeTitle;
            const inlineVariables = `
:root {
    --resume-font-family: ${styleConfig.fontFamily};
    --resume-font-size: ${styleConfig.fontSize}px;
    --resume-line-height: ${styleConfig.lineHeight};
    --resume-heading-scale: ${styleConfig.headingScale};
    --resume-margin-x: ${styleConfig.marginX}px;
    --resume-margin-y: ${styleConfig.marginY}px;
    --resume-section-spacing: ${styleConfig.sectionSpacing}px;
    --resume-color-bg: ${styleConfig.colorBg || '#ffffff'};
    --resume-color-headings: ${styleConfig.colorHeadings};
    --resume-color-body: ${styleConfig.colorBody};
    --resume-color-links: ${styleConfig.colorLinks};
    --resume-color-accent: ${styleConfig.colorAccent};
    --resume-sidebar-bg: ${styleConfig.sidebarBg || '#2d3748'};
    --resume-sidebar-text: ${styleConfig.sidebarText || '#ffffff'};
}`;
            const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Raleway:wght@300;400;500;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=JetBrains+Mono:wght@400;500;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
  <style>
    ${inlineVariables}
    ${templatesCssText}
    @media print {
      body {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        background: #ffffff !important;
      }
      .a4-sheet {
        width: 100% !important;
        margin: 0 !important;
        box-shadow: none !important;
      }
    }
    body {
        background-color: var(--resume-color-bg, #ffffff);
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
    }
    .a4-sheet {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 auto;
    }
  </style>
</head>
<body>
  <article class="a4-sheet" id="resume-output">
    ${resumeOutput.innerHTML}
  </article>
</body>
</html>`;
            navigator.clipboard.writeText(standaloneHtml)
                .then(() => showToast("Standalone HTML document copied!"))
                .catch(err => console.error(err));
        });
    }

    if (btnCopyCss) {
        btnCopyCss.addEventListener('click', () => {
            const inlineVariables = `
:root {
    --resume-font-family: ${styleConfig.fontFamily};
    --resume-font-size: ${styleConfig.fontSize}px;
    --resume-line-height: ${styleConfig.lineHeight};
    --resume-heading-scale: ${styleConfig.headingScale};
    --resume-margin-x: ${styleConfig.marginX}px;
    --resume-margin-y: ${styleConfig.marginY}px;
    --resume-section-spacing: ${styleConfig.sectionSpacing}px;
    --resume-color-bg: ${styleConfig.colorBg || '#ffffff'};
    --resume-color-headings: ${styleConfig.colorHeadings};
    --resume-color-body: ${styleConfig.colorBody};
    --resume-color-links: ${styleConfig.colorLinks};
    --resume-color-accent: ${styleConfig.colorAccent};
    --resume-sidebar-bg: ${styleConfig.sidebarBg || '#2d3748'};
    --resume-sidebar-text: ${styleConfig.sidebarText || '#ffffff'};
}`;
            const combinedCss = `${inlineVariables}\n\n${templatesCssText}`;
            navigator.clipboard.writeText(combinedCss)
                .then(() => showToast("Styles CSS copied!"))
                .catch(err => console.error(err));
        });
    }

    if (btnCopyHtml) {
        btnCopyHtml.addEventListener('click', () => {
            navigator.clipboard.writeText(resumeOutput.innerHTML)
                .then(() => showToast("Inner resume HTML copied!"))
                .catch(err => console.error(err));
        });
    }

    if (btnDownloadMd) {
        btnDownloadMd.addEventListener('click', () => {
            const blob = new Blob([markdownInput.value], { type: 'text/markdown;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentResumeTitle}.md`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("Markdown download started!");
        });
    }

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
                const newWidth = Math.max(250, startWidth + dx);
                editorPanel.style.width = `${newWidth}px`;
                editorPanel.style.flex = 'initial';
                autoFitZoom();
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
                const newWidth = Math.max(250, startWidth - dx);
                controlsPanel.style.width = `${newWidth}px`;
                controlsPanel.style.flex = 'initial';
                autoFitZoom();
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

        if (!loadedMarkdown) {
            try {
                const mdResponse = await fetch('resume.md');
                if (mdResponse.ok) {
                    loadedMarkdown = await mdResponse.text();
                    const configResponse = await fetch('config.json');
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
                const sampleResponse = await fetch('sample.md');
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

        customColors.colorBg = styleConfig.colorBg || DEFAULT_STYLE_CONFIG.colorBg;
        customColors.colorHeadings = styleConfig.colorHeadings;
        customColors.colorBody = styleConfig.colorBody;
        customColors.colorLinks = styleConfig.colorLinks;
        customColors.colorAccent = styleConfig.colorAccent;
        customColors.sidebarBg = styleConfig.sidebarBg || DEFAULT_STYLE_CONFIG.sidebarBg;
        customColors.sidebarText = styleConfig.sidebarText || DEFAULT_STYLE_CONFIG.sidebarText;

        updateControlsFromConfig(styleConfig);
        runCompileMarkdown(loadedMarkdown);

        if (!savedMd) {
            localStorage.setItem('ats_resume_markdown', loadedMarkdown);
            localStorage.setItem('ats_resume_styles', JSON.stringify(styleConfig));
        }

        setTimeout(autoFitZoom, 300);
    }

    // --- Fireworks effect ---
    function startOpeningFireworks() {
        const canvas = document.createElement('canvas');
        canvas.id = 'opening-fireworks-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.zIndex = '99999';
        canvas.style.pointerEvents = 'none';
        canvas.style.transition = 'opacity 1s ease';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        class Particle {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                this.color = color;
                this.radius = Math.random() * 2.5 + 1;
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 6 + 2;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.gravity = 0.12;
                this.alpha = 1;
                this.decay = Math.random() * 0.015 + 0.01;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.restore();
            }

            update() {
                this.vx *= 0.98;
                this.vy *= 0.98;
                this.vy += this.gravity;
                this.x += this.vx;
                this.y += this.vy;
                this.alpha -= this.decay;
            }
        }

        class Firework {
            constructor() {
                this.x = Math.random() * width;
                this.y = height;
                this.targetY = Math.random() * (height * 0.5);
                this.vy = -(Math.random() * 5 + 12);
                this.color = `hsl(${Math.random() * 360}, 100%, 65%)`;
                this.exploded = false;
                this.particles = [];
            }

            update() {
                if (!this.exploded) {
                    this.y += this.vy;
                    this.vy += 0.08;
                    if (this.vy >= 0 || this.y <= this.targetY) {
                        this.explode();
                    }
                } else {
                    for (let i = this.particles.length - 1; i >= 0; i--) {
                        const p = this.particles[i];
                        p.update();
                        if (p.alpha <= 0) {
                            this.particles.splice(i, 1);
                        }
                    }
                }
            }

            explode() {
                this.exploded = true;
                const count = Math.random() * 40 + 60;
                for (let i = 0; i < count; i++) {
                    this.particles.push(new Particle(this.x, this.y, this.color));
                }
            }

            draw() {
                if (!this.exploded) {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                    ctx.fillStyle = this.color;
                    ctx.fill();
                } else {
                    this.particles.forEach(p => p.draw());
                }
            }
        }

        const fireworks = [];
        let isRunning = true;
        let animationFrameId;

        const launchInterval = setInterval(() => {
            if (fireworks.length < 5) {
                fireworks.push(new Firework());
            }
        }, 350);

        function loop() {
            if (!isRunning && fireworks.length === 0) return;
            animationFrameId = requestAnimationFrame(loop);
            ctx.clearRect(0, 0, width, height);

            for (let i = fireworks.length - 1; i >= 0; i--) {
                const f = fireworks[i];
                f.update();
                f.draw();
                if (f.exploded && f.particles.length === 0) {
                    fireworks.splice(i, 1);
                }
            }
        }

        loop();

        setTimeout(() => {
            clearInterval(launchInterval);
            isRunning = false;
            canvas.style.opacity = '0';
            setTimeout(() => {
                cancelAnimationFrame(animationFrameId);
                canvas.remove();
            }, 1000);
        }, 3000);
    }

    // Launch loading
    await loadWorkspaceData();
    updateSyncButtonState();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeJobby);
} else {
    initializeJobby();
}
