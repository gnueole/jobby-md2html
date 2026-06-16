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
import { initShortcuts } from './js/shortcuts.js';
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
    let appVersion = '1.5.0';
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
        { id: 'header-container', url: 'bricks/header.html' },
        { id: 'editor-container', url: 'bricks/editor.html' },
        { id: 'preview-container', url: 'bricks/preview.html' },
        { id: 'controls-container', url: 'bricks/controls.html' },
        { id: 'about-modal', url: 'bricks/about-modal.html' },
        { id: 'help-modal', url: 'bricks/help-modal.html' }
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
            brandH1.innerHTML = 'Jobby <span>Markdown</span> Editor <span style="font-size: 10px; background: #14b8a6; color: #0f172a; padding: 2px 6px; border-radius: 4px; margin-left: 8px; vertical-align: middle; font-weight: 700; letter-spacing: 0.05em;">DEV</span>';
        }
    }

    // --- State Variables ---
    let currentResumeTitle = "resume";
    let styleConfig = { ...DEFAULT_STYLE_CONFIG };
    let templatesCssText = "";

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

    let customPresets = {
        'custom-1': {
            name: localStorage.getItem('ats_custom_preset_name_1') || 'Custom 1',
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
            name: localStorage.getItem('ats_custom_preset_name_2') || 'Custom 2',
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
    const presetUpdate = document.getElementById('preset-update');
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
        const response = await fetch(`templates.css?v=${appVersion}`);
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
                const presetStyles = {
                    colorBg: styleConfig.colorBg,
                    colorHeadings: styleConfig.colorHeadings,
                    colorBody: styleConfig.colorBody,
                    colorLinks: styleConfig.colorLinks,
                    colorAccent: styleConfig.colorAccent,
                    sidebarBg: styleConfig.sidebarBg,
                    sidebarText: styleConfig.sidebarText,
                    cosmeticGradient: styleConfig.cosmeticGradient,
                    columnGradientColor: styleConfig.columnGradientColor,
                    columnGradientLength: styleConfig.columnGradientLength
                };
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
    }

    function sanitizePresetName(name) {
        name = name.trim();
        name = name.replace(/<[^>]*>/g, ''); // strip HTML tags
        
        if (name.length > 15) {
            return { error: "The name must not exceed 15 characters." };
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
 
    function handleCustomPresetRename(key) {
        const preset = customPresets[key];
        const oldName = preset.name;
        const newNameInput = prompt(`Rename preset "${oldName}":`, oldName);
        if (newNameInput === null) return;
        
        const result = sanitizePresetName(newNameInput);
        if (result.error) {
            alert(result.error);
            return;
        }
        
        preset.name = result.name;
        const indexStr = key === 'custom-1' ? '1' : '2';
        localStorage.setItem(`ats_custom_preset_name_${indexStr}`, preset.name);
        updateCustomPresetLabels();
        showToast(`Preset renamed to "${preset.name}"`);
    }

    function updateCustomPresetLabels() {
        if (presetCustom1) presetCustom1.textContent = customPresets['custom-1'].name;
        if (presetCustom2) presetCustom2.textContent = customPresets['custom-2'].name;
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
            } else {
                document.body.classList.remove('expert-mode-active');
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

    // Color presets
    if (presetClassicNb) {
        presetClassicNb.addEventListener('click', () => {
            applyPresetValues('classic', {
                colorBg: '#ffffff',
                colorHeadings: '#000000',
                colorBody: '#000000',
                colorLinks: '#000000',
                colorAccent: '#000000',
                sidebarBg: '#111111',
                sidebarText: '#ffffff'
            }, '#111111', { cosmeticShadow: false });
        });
    }

    if (presetDarkMode) {
        presetDarkMode.addEventListener('click', () => {
            applyPresetValues('dark', {
                colorBg: '#0f172a',
                colorHeadings: '#f8fafc',
                colorBody: '#cbd5e1',
                colorLinks: '#38bdf8',
                colorAccent: '#34d399',
                sidebarBg: '#1e293b',
                sidebarText: '#cbd5e1'
            }, '#0f172a', { cosmeticShadow: true });
        });
    }

    if (presetCleanBlue) {
        presetCleanBlue.addEventListener('click', () => {
            applyPresetValues('clean-blue', {
                colorBg: '#ffffff',
                colorHeadings: '#0f172a',
                colorBody: '#334155',
                colorLinks: '#2563eb',
                colorAccent: '#0ea5e9',
                sidebarBg: '#0f172a',
                sidebarText: '#ffffff'
            }, '#70aef0', { cosmeticShadow: true });
        });
    }

    if (presetSoftBlue) {
        presetSoftBlue.addEventListener('click', () => {
            applyPresetValues('soft-blue', {
                colorBg: '#f8fafc',
                colorHeadings: '#1e40af',
                colorBody: '#475569',
                colorLinks: '#2563eb',
                colorAccent: '#3b82f6',
                sidebarBg: '#e0f2fe',
                sidebarText: '#0369a1'
            }, '#bae6fd', { cosmeticShadow: true });
        });
    }

    if (presetGreen) {
        presetGreen.addEventListener('click', () => {
            applyPresetValues('green', {
                colorBg: '#fcfdfc',
                colorHeadings: '#166534',
                colorBody: '#374151',
                colorLinks: '#15803d',
                colorAccent: '#4ade80',
                sidebarBg: '#dcfce7',
                sidebarText: '#166534'
            }, '#bbf7d0', { cosmeticShadow: true });
        });
    }

    if (presetSoftRed) {
        presetSoftRed.addEventListener('click', () => {
            applyPresetValues('soft-red', {
                colorBg: '#ffffff',
                colorHeadings: '#7f1d1d',
                colorBody: '#374151',
                colorLinks: '#dc2626',
                colorAccent: '#f87171',
                sidebarBg: '#fee2e2',
                sidebarText: '#991b1b'
            }, '#fecaca', { cosmeticShadow: true });
        });
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

    if (presetUpdate) {
        presetUpdate.addEventListener('click', () => {
            const activePreset = styleConfig.activePreset;
            if (activePreset === 'custom-1' || activePreset === 'custom-2') {
                const indexStr = activePreset === 'custom-1' ? '1' : '2';
                const presetStyles = {
                    colorBg: styleConfig.colorBg,
                    colorHeadings: styleConfig.colorHeadings,
                    colorBody: styleConfig.colorBody,
                    colorLinks: styleConfig.colorLinks,
                    colorAccent: styleConfig.colorAccent,
                    sidebarBg: styleConfig.sidebarBg,
                    sidebarText: styleConfig.sidebarText,
                    cosmeticGradient: styleConfig.cosmeticGradient,
                    columnGradientColor: styleConfig.columnGradientColor,
                    columnGradientLength: styleConfig.columnGradientLength
                };
                customPresets[activePreset].styles = presetStyles;
                localStorage.setItem(`ats_custom_preset_${indexStr}`, JSON.stringify(presetStyles));
                showToast(`${customPresets[activePreset].name} updated with current design configuration!`);
            } else {
                showToast("Cannot update built-in read-only presets.");
            }
        });
    }

    let presetClickTimeouts = {};

    const executeSinglePresetClick = (key) => {
        const preset = customPresets[key];
        const defaultCoolGradient = key === 'custom-1' ? '#262626' : '#00ffff';
        if (!preset.styles) {
            preset.styles = {
                colorBg: styleConfig.colorBg,
                colorHeadings: styleConfig.colorHeadings,
                colorBody: styleConfig.colorBody,
                colorLinks: styleConfig.colorLinks,
                colorAccent: styleConfig.colorAccent,
                sidebarBg: styleConfig.sidebarBg,
                sidebarText: styleConfig.sidebarText,
                cosmeticGradient: styleConfig.cosmeticGradient,
                columnGradientColor: styleConfig.columnGradientColor || defaultCoolGradient,
                columnGradientLength: styleConfig.columnGradientLength || 150
            };
            const indexStr = key === 'custom-1' ? '1' : '2';
            localStorage.setItem(`ats_custom_preset_${indexStr}`, JSON.stringify(preset.styles));
            showToast(`${preset.name} saved with current colors!`);
        }
        styleConfig.activePreset = key;
        styleConfig.colorBg = preset.styles.colorBg;
        styleConfig.colorHeadings = preset.styles.colorHeadings;
        styleConfig.colorBody = preset.styles.colorBody;
        styleConfig.colorLinks = preset.styles.colorLinks;
        styleConfig.colorAccent = preset.styles.colorAccent;
        styleConfig.sidebarBg = preset.styles.sidebarBg;
        styleConfig.sidebarText = preset.styles.sidebarText;
        
        styleConfig.columnGradientColor = preset.styles.columnGradientColor || defaultCoolGradient;
        styleConfig.columnGradientLength = preset.styles.columnGradientLength || 150;
        if (styleConfig.layoutMode === '2-column') {
            styleConfig.cosmeticGradient = true;
        } else {
            styleConfig.cosmeticGradient = preset.styles.cosmeticGradient !== undefined ? preset.styles.cosmeticGradient : styleConfig.cosmeticGradient;
        }
        
        updateControlsFromConfig(styleConfig);
        applyStyles(styleConfig);
        runCompileMarkdown(markdownInput.value);
        saveToLocalStorage();
    };

    const handlePresetClick = (key) => {
        if (presetClickTimeouts[key]) {
            clearTimeout(presetClickTimeouts[key]);
            presetClickTimeouts[key] = null;
            // Execute double click rename
            handleCustomPresetRename(key);
            return;
        }
        
        presetClickTimeouts[key] = setTimeout(() => {
            presetClickTimeouts[key] = null;
            executeSinglePresetClick(key);
        }, 250);
    };

    if (presetCustom1) {
        presetCustom1.addEventListener('click', () => handlePresetClick('custom-1'));
    }
    if (presetCustom2) {
        presetCustom2.addEventListener('click', () => handlePresetClick('custom-2'));
    }

    // Zoom Handlers
    initZoom({
        zoomInBtn,
        zoomOutBtn,
        zoomResetBtn,
        zoomLevelText,
        previewCanvas,
        canvasWrapper,
        updatePageBreaks: () => updatePageBreaks(resumeOutput)
    });

    // Formatting outlines & printing format config
    initPrint({
        btnPrint,
        btnPageBreaks,
        selectPageFormat,
        resumeOutput,
        getCurrentResumeTitle: () => currentResumeTitle,
        autoFitZoom: () => autoFitZoom(canvasWrapper, previewCanvas, zoomLevelText, () => updatePageBreaks(resumeOutput)),
        triggerCompile: () => runCompileMarkdown(markdownInput.value)
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

    // Load changelog / updates
    if (btnLoadChangelog) {
        btnLoadChangelog.addEventListener('click', () => {
            if (confirm("Voulez-vous charger les nouveautés de Jobby ? Votre document actuel sera remplacé.")) {
                fetch('whatsnew.md')
                    .then(res => res.text())
                    .then(changelogText => {
                        markdownInput.value = changelogText;
                        runCompileMarkdown(changelogText);
                        saveToLocalStorage();
                        showToast("Nouveautés de Jobby chargées !");
                    })
                    .catch(err => console.error(err));
            }
        });
    }

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

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (aboutModal && aboutModal.classList.contains('show')) {
                aboutModal.classList.remove('show');
            }
            if (helpModal && helpModal.classList.contains('show')) {
                helpModal.classList.remove('show');
            }
        }
    });

    // --- Lazy load Developer Tools brick on authentication ---
    initDeveloperTools(btnDeveloperToggle, developerModal, appVersion, updateSyncButtonState);

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
                const response = await fetch(fileName);
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

        // Migrate legacy activePreset
        if (styleConfig.activePreset === 'custom' || !styleConfig.activePreset) {
            styleConfig.activePreset = 'custom-1';
        }

        // Initialize custom presets styles if empty and it matches activePreset
        if (styleConfig.activePreset === 'custom-1' && !customPresets['custom-1'].styles) {
            customPresets['custom-1'].styles = {
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
            localStorage.setItem('ats_custom_preset_1', JSON.stringify(customPresets['custom-1'].styles));
        } else if (styleConfig.activePreset === 'custom-2' && !customPresets['custom-2'].styles) {
            customPresets['custom-2'].styles = {
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
            localStorage.setItem('ats_custom_preset_2', JSON.stringify(customPresets['custom-2'].styles));
        }

        updateCustomPresetLabels();
        updateControlsFromConfig(styleConfig);
        runCompileMarkdown(loadedMarkdown);

        if (!localStorage.getItem('ats_resume_markdown') || isSampleRoute || isWhatsNewRoute) {
            localStorage.setItem('ats_resume_markdown', loadedMarkdown);
            localStorage.setItem('ats_resume_styles', JSON.stringify(styleConfig));
        }

        setTimeout(() => autoFitZoom(canvasWrapper, previewCanvas, zoomLevelText, () => updatePageBreaks(resumeOutput)), 300);
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
