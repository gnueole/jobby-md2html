/* ==========================================
   ATS MARKDOWN RESUME STUDIO - APP ENGINE
   ========================================== */

// --- Default Configurations ---
const DEFAULT_STYLE_CONFIG = {
    fontFamily: "'Raleway', 'Inter', sans-serif",
    fontSize: "14",
    lineHeight: "1.45",
    headingScale: "1.6",
    marginX: "30",
    marginY: "25",
    sectionSpacing: "12",
    colorBg: "#ffffff",
    colorHeadings: "#1e293b",
    colorBody: "#334155",
    colorLinks: "#7c3aed",
    colorAccent: "#0d9488",
    layoutMode: "1-column",
    sidebarBg: "#2d3748",
    sidebarText: "#ffffff",
    sidebarPosition: "right",
    sidebarSections: "EDUCATION,TECHNICAL SKILLS"
};

// SVG Icons for the ATS Checklist
const ICONS = {
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-top:2px; flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-top:2px; flex-shrink:0;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-top:2px; flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
};

document.addEventListener('DOMContentLoaded', async () => {
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

    let currentResumeTitle = "resume";

    // --- DOM Elements Cache ---
    const markdownInput = document.getElementById('markdown-input');
    const resumeOutput = document.getElementById('resume-output');
    const btnPanToggle = document.getElementById('btn-pan-toggle');
    const btnPageBreaks = document.getElementById('btn-page-breaks');
    const selectPageFormat = document.getElementById('select-page-format');

    // Highlight Sync State
    let lastCleanHTML = "";
    let isHighlightActive = false;
    let currentTokens = [];

    // Page breaks and formats state
    let showPageBreaks = localStorage.getItem('show_page_breaks') === 'true';
    let pageFormat = localStorage.getItem('page_format') || 'A4';

    // Zoom Controls
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomLevelText = document.getElementById('zoom-level');
    const previewCanvas = document.getElementById('preview-canvas');
    const canvasWrapper = document.querySelector('.preview-canvas-wrapper');
    const zoomResetBtn = document.getElementById('zoom-reset');

    // Toolbar Actions
    const btnLoadSample = document.getElementById('btn-load-sample');
    const btnCopyMd = document.getElementById('btn-copy-md');
    const btnClear = document.getElementById('btn-clear');
    const btnPrint = document.getElementById('btn-print');

    // Theme switch elements
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const themeBtnIcon = document.getElementById('theme-btn-icon');
    const themeBtnText = document.getElementById('theme-btn-text');

    // About Modal Elements
    const btnAbout = document.getElementById('btn-about');
    const aboutModal = document.getElementById('about-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');

    // Style Customizer Controls
    const fontTiles = document.querySelectorAll('.font-tile');
    const fontSizeSlider = document.getElementById('font-size');
    const lineHeightSlider = document.getElementById('line-height');
    const headingScaleSlider = document.getElementById('heading-scale');
    const marginXSlider = document.getElementById('margin-x');
    const marginYSlider = document.getElementById('margin-y');
    const sectionSpacingSlider = document.getElementById('section-spacing');

    const layoutModeSelect = document.getElementById('layout-mode');
    const sidebarOnlyControls = document.getElementById('sidebar-only-controls');
    const sidebarPositionSelect = document.getElementById('sidebar-position');
    const colorSidebarBg = document.getElementById('color-sidebar-bg');
    const hexSidebarBg = document.getElementById('hex-sidebar-bg');
    const colorSidebarText = document.getElementById('color-sidebar-text');
    const hexSidebarText = document.getElementById('hex-sidebar-text');
    const sidebarChecklistContainer = document.getElementById('sidebar-sections-checklist');

    const colorBg = document.getElementById('color-bg');
    const hexBg = document.getElementById('hex-bg');
    const colorHeadings = document.getElementById('color-headings');
    const colorBody = document.getElementById('color-body');
    const colorLinks = document.getElementById('color-links');
    const colorAccent = document.getElementById('color-accent');

    // Color preset buttons
    const presetClassicNb = document.getElementById('preset-classic-nb');
    const presetDarkMode = document.getElementById('preset-dark-mode');
    const presetCleanBlue = document.getElementById('preset-clean-blue');
    const presetCustom = document.getElementById('preset-custom');

    // Sliders value label updates
    const valFontSize = document.getElementById('val-font-size');
    const valLineHeight = document.getElementById('val-line-height');
    const valHeadingScale = document.getElementById('val-heading-scale');
    const valMarginX = document.getElementById('val-margin-x');
    const valMarginY = document.getElementById('val-margin-y');
    const valSectionSpacing = document.getElementById('val-section-spacing');

    // Hex Color Labels
    const hexHeadings = document.getElementById('hex-headings');
    const hexBody = document.getElementById('hex-body');
    const hexLinks = document.getElementById('hex-links');
    const hexAccent = document.getElementById('hex-accent');

    // ATS Checklist and Score
    const scoreRingProgress = document.getElementById('score-ring-progress');
    const scoreValueText = document.getElementById('score-value');
    const verdictTitle = document.getElementById('verdict-title');
    const verdictDesc = document.getElementById('verdict-desc');
    const atsChecklistContainer = document.getElementById('ats-checklist');
    const charWordCount = document.getElementById('char-word-count');

    // Export Clipboard buttons
    const btnCopyStandalone = document.getElementById('btn-copy-standalone');
    const btnCopyCss = document.getElementById('btn-copy-css');
    const btnCopyHtml = document.getElementById('btn-copy-html');
    const btnDownloadMd = document.getElementById('btn-download-md');
    const btnSyncN8n = document.getElementById('btn-sync-n8n');
    const n8nWebhookUrl = document.getElementById('n8n-webhook-url');
    const n8nWebhookToken = document.getElementById('n8n-webhook-token');

    // Developer Tools Modal
    const btnDeveloperToggle = document.getElementById('btn-developer-toggle');
    const developerModal = document.getElementById('developer-modal');
    const btnCloseDeveloperModal = document.getElementById('btn-close-developer-modal');
    const bookmarkletDragLink = document.getElementById('bookmarklet-drag-link');
    const devWebhookUrl = document.getElementById('dev-webhook-url');
    const devWebhookToken = document.getElementById('dev-webhook-token');
    const btnSaveDevSettings = document.getElementById('btn-save-dev-settings');

    // Toast Alert
    const toast = document.getElementById('toast');

    // --- State Variables ---
    let zoomFactor = 1.0;
    let isUserZoomed = false; // Tracks if user manually changed zoom
    let styleConfig = { ...DEFAULT_STYLE_CONFIG };
    let templatesCssText = "";

    // Load templates.css stylesheet code for n8n embedding
    try {
        const response = await fetch('templates.css?v=1.2.6');
        if (response.ok) {
            templatesCssText = await response.text();
        }
    } catch (e) {
        console.error("Failed to preload templates.css:", e);
    }

    // --- Core Methods ---

    // Toast helper
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // Apply Style Configuration to preview
    function applyStyles() {
        const root = resumeOutput;
        root.style.setProperty('--resume-font-family', styleConfig.fontFamily);
        root.style.setProperty('--resume-font-size', styleConfig.fontSize + 'px');
        root.style.setProperty('--resume-line-height', styleConfig.lineHeight);
        root.style.setProperty('--resume-heading-scale', styleConfig.headingScale);
        root.style.setProperty('--resume-margin-x', styleConfig.marginX + 'px');
        root.style.setProperty('--resume-margin-y', styleConfig.marginY + 'px');
        root.style.setProperty('--resume-section-spacing', styleConfig.sectionSpacing + 'px');

        root.style.setProperty('--resume-color-bg', styleConfig.colorBg || '#ffffff');
        root.style.setProperty('--resume-color-headings', styleConfig.colorHeadings);
        root.style.setProperty('--resume-color-body', styleConfig.colorBody);
        root.style.setProperty('--resume-color-links', styleConfig.colorLinks);
        root.style.setProperty('--resume-color-accent', styleConfig.colorAccent);

        root.style.setProperty('--resume-sidebar-bg', styleConfig.sidebarBg || '#2d3748');
        root.style.setProperty('--resume-sidebar-text', styleConfig.sidebarText || '#ffffff');

        // Update dynamic print margins style
        let printPageStyle = document.getElementById('print-page-style');
        if (!printPageStyle) {
            printPageStyle = document.createElement('style');
            printPageStyle.id = 'print-page-style';
            document.head.appendChild(printPageStyle);
        }
        printPageStyle.textContent = `
            @media print {
                @page {
                    size: A4 portrait;
                    margin-top: ${styleConfig.marginY}px;
                    margin-bottom: ${styleConfig.marginY}px;
                    margin-left: ${styleConfig.marginX}px;
                    margin-right: ${styleConfig.marginX}px;
                }
                .a4-sheet {
                    padding: 0 !important;
                }
            }
        `;

        // Update Slider Labels
        valFontSize.textContent = styleConfig.fontSize + 'px';
        valLineHeight.textContent = styleConfig.lineHeight;
        valHeadingScale.textContent = styleConfig.headingScale;
        valMarginX.textContent = styleConfig.marginX + 'px';
        valMarginY.textContent = styleConfig.marginY + 'px';
        valSectionSpacing.textContent = styleConfig.sectionSpacing + 'px';

        // Update Hex Texts
        hexBg.textContent = styleConfig.colorBg || '#ffffff';
        hexHeadings.textContent = styleConfig.colorHeadings;
        hexBody.textContent = styleConfig.colorBody;
        hexLinks.textContent = styleConfig.colorLinks;
        hexAccent.textContent = styleConfig.colorAccent;
        hexSidebarBg.textContent = styleConfig.sidebarBg || '#2d3748';
        hexSidebarText.textContent = styleConfig.sidebarText || '#ffffff';

        // Show/hide sidebar only controls
        if (styleConfig.layoutMode === '2-column') {
            sidebarOnlyControls.style.display = 'block';
        } else {
            sidebarOnlyControls.style.display = 'none';
        }

        // Active font tile
        fontTiles.forEach(tile => {
            if (tile.getAttribute('data-font') === styleConfig.fontFamily) {
                tile.classList.add('active');
            } else {
                tile.classList.remove('active');
            }
        });

        // Active preset button
        updateActivePresetBtn();
    }

    function updateActivePresetBtn() {
        presetClassicNb.classList.remove('active');
        presetDarkMode.classList.remove('active');
        presetCleanBlue.classList.remove('active');
        presetCustom.classList.remove('active');

        if (styleConfig.activePreset) {
            if (styleConfig.activePreset === 'classic') {
                presetClassicNb.classList.add('active');
                return;
            } else if (styleConfig.activePreset === 'dark') {
                presetDarkMode.classList.add('active');
                return;
            } else if (styleConfig.activePreset === 'clean-blue') {
                presetCleanBlue.classList.add('active');
                return;
            } else if (styleConfig.activePreset === 'custom') {
                presetCustom.classList.add('active');
                return;
            }
        }

        const bg = (styleConfig.colorBg || '#ffffff').toLowerCase();
        const headings = styleConfig.colorHeadings.toLowerCase();
        const body = styleConfig.colorBody.toLowerCase();
        const links = styleConfig.colorLinks.toLowerCase();
        const accent = styleConfig.colorAccent.toLowerCase();

        if (bg === '#ffffff' && headings === '#111111' &&
            body === '#222222' && links === '#000000' &&
            accent === '#444444') {
            presetClassicNb.classList.add('active');
        } else if (bg === '#0f172a' && headings === '#f8fafc' &&
            body === '#cbd5e1' && links === '#38bdf8' &&
            accent === '#34d399') {
            presetDarkMode.classList.add('active');
        } else if (bg === '#ffffff' && headings === '#0f172a' &&
            body === '#334155' && links === '#2563eb' &&
            accent === '#0ea5e9') {
            presetCleanBlue.classList.add('active');
        } else {
            presetCustom.classList.add('active');
        }
    }

    let customColors = {
        colorBg: DEFAULT_STYLE_CONFIG.colorBg,
        colorHeadings: DEFAULT_STYLE_CONFIG.colorHeadings,
        colorBody: DEFAULT_STYLE_CONFIG.colorBody,
        colorLinks: DEFAULT_STYLE_CONFIG.colorLinks,
        colorAccent: DEFAULT_STYLE_CONFIG.colorAccent,
        sidebarBg: DEFAULT_STYLE_CONFIG.sidebarBg,
        sidebarText: DEFAULT_STYLE_CONFIG.sidebarText
    };

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

    // Debounce helper for server saves
    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    // Save configuration and markdown to localStorage
    const saveToLocalStorage = debounce(() => {
        try {
            localStorage.setItem('ats_resume_markdown', markdownInput.value);
            localStorage.setItem('ats_resume_styles', JSON.stringify(styleConfig));
            console.log("Configuration and markdown saved to localStorage.");
        } catch (e) {
            console.error("Failed to save to localStorage:", e);
        }
    }, 1000);

    // Import configurations from controls values
    function updateConfigFromControls() {
        styleConfig.fontSize = fontSizeSlider.value;
        styleConfig.lineHeight = lineHeightSlider.value;
        styleConfig.headingScale = headingScaleSlider.value;
        styleConfig.marginX = marginXSlider.value;
        styleConfig.marginY = marginYSlider.value;
        styleConfig.sectionSpacing = sectionSpacingSlider.value;

        styleConfig.layoutMode = layoutModeSelect.value;

        // Detect if any color picker changed
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

        // Save current color states to custom colors
        saveCustomColorsState();

        applyStyles();

        // Recompile markdown since layout modes affect DOM structure
        compileMarkdown(markdownInput.value);

        saveToLocalStorage();
    }

    // Sync GUI controls with current active state
    function updateControlsFromConfig() {
        fontSizeSlider.value = styleConfig.fontSize;
        lineHeightSlider.value = styleConfig.lineHeight;
        headingScaleSlider.value = styleConfig.headingScale;
        marginXSlider.value = styleConfig.marginX;
        marginYSlider.value = styleConfig.marginY;
        sectionSpacingSlider.value = styleConfig.sectionSpacing;

        layoutModeSelect.value = styleConfig.layoutMode || "1-column";
        colorSidebarBg.value = styleConfig.sidebarBg || "#2d3748";
        colorSidebarText.value = styleConfig.sidebarText || "#ffffff";
        sidebarPositionSelect.value = styleConfig.sidebarPosition || "right";

        colorBg.value = styleConfig.colorBg || "#ffffff";
        colorHeadings.value = styleConfig.colorHeadings;
        colorBody.value = styleConfig.colorBody;
        colorLinks.value = styleConfig.colorLinks;
        colorAccent.value = styleConfig.colorAccent;

        applyStyles();
    }

    // Auto-Fit Zoom calculation to prevent canvas clipping
    function autoFitZoom() {
        if (isUserZoomed) return; // Don't override manual zooms

        if (!canvasWrapper) return;

        const wrapperWidth = canvasWrapper.clientWidth - 60; // Include margins
        const sheetWidth = 794; // 210mm in pixels at 96dpi (793.7px)

        if (wrapperWidth < sheetWidth) {
            zoomFactor = wrapperWidth / sheetWidth;
        } else {
            zoomFactor = 1.0;
        }

        updateZoomDisplay();
        updatePageBreaks();

        // Center scroll horizontally and reset vertical scroll to top
        const centerScroll = () => {
            canvasWrapper.scrollLeft = (canvasWrapper.scrollWidth - canvasWrapper.clientWidth) / 2;
            canvasWrapper.scrollTop = 0;
        };
        centerScroll();
        setTimeout(centerScroll, 50); // Ensure layout is fully computed
    }

    let lastSectionsJSON = "";

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function updateHeaderInMarkdown(title, toSidebar) {
        const mdText = markdownInput.value;
        const lines = mdText.split('\n');
        const targetTitle = title.trim().toLowerCase();

        let updated = false;
        const newLines = lines.map(line => {
            const trimmed = line.trim();
            const isHeading = trimmed.startsWith('## ') || trimmed.startsWith('### ');
            if (isHeading) {
                const currentHeadingTitle = trimmed.replace(/^###?\s+/, '').trim().toLowerCase();
                if (currentHeadingTitle === targetTitle) {
                    updated = true;
                    const prefix = toSidebar ? '###' : '##';
                    return `${prefix} ${title.toUpperCase()}`;
                }
            }
            return line;
        });

        if (updated) {
            markdownInput.value = newLines.join('\n');
            // Recompile markdown to update preview
            compileMarkdown(markdownInput.value);
            saveToLocalStorage();
        }
    }

    function updateSidebarChecklist(sections) {
        const sectionsJSON = JSON.stringify(sections);
        if (sectionsJSON === lastSectionsJSON) {
            // Keep checkbox states in sync with current section states
            const checkboxes = sidebarChecklistContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach((cb, index) => {
                if (sections.at(index)) {
                    cb.checked = sections.at(index).isSidebar;
                }
            });
            return;
        }

        lastSectionsJSON = sectionsJSON;
        sidebarChecklistContainer.innerHTML = '';

        if (sections.length === 0) {
            sidebarChecklistContainer.innerHTML = '<span style="font-size:10px; color:var(--text-muted); font-style:italic; padding: 4px;">No sections detected (headers starting with "##" or "###")</span>';
            return;
        }

        sections.forEach(section => {
            const title = section.title;
            const isSidebar = section.isSidebar;

            const item = document.createElement('label');
            item.className = 'sidebar-checklist-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = title;
            checkbox.checked = isSidebar;

            checkbox.addEventListener('change', () => {
                updateHeaderInMarkdown(title, checkbox.checked);
            });

            item.appendChild(checkbox);
            item.appendChild(document.createTextNode(title));
            sidebarChecklistContainer.appendChild(item);
        });
    }

    // Markdown Parser with Guide Custom Directives & delimiters
    function compileMarkdown(mdText) {
        isHighlightActive = false;
        if (!mdText.trim()) {
            resumeOutput.innerHTML = `<p style="color:#64748b; font-style:italic;">Start typing Markdown on the left to preview...</p>`;
            lastCleanHTML = resumeOutput.innerHTML;
            return;
        }

        // Configure Marked.js
        marked.setOptions({
            gfm: true,
            breaks: true
        });

        // 1. Pre-process custom directives: :accent[text] and :muted[text]
        let processedMd = mdText;
        processedMd = processedMd.replace(/:accent\[([^\]]+)\]/g, '<span class="resume-accent">$1</span>');
        processedMd = processedMd.replace(/:muted\[([^\]]+)\]/g, '<span class="resume-muted">$1</span>');

        // Tokenize and calculate raw source offsets
        const tokens = marked.lexer(processedMd);
        let currentOffset = 0;
        tokens.forEach(token => {
            token.startOffset = currentOffset;
            token.endOffset = currentOffset + token.raw.length;
            currentOffset += token.raw.length;
        });
        currentTokens = tokens;

        // Compile markdown to HTML
        let html = marked.parse(processedMd);

        // Inject data-token-index into the top-level HTML elements
        const docParser = new DOMParser();
        const doc = docParser.parseFromString(html, 'text/html');
        const bodyElements = Array.from(doc.body.children);
        const nonSpaceTokens = tokens.filter(t => t.type !== 'space');

        bodyElements.forEach((el, idx) => {
            const token = nonSpaceTokens.at(idx);
            if (token) {
                const tokenIndex = tokens.indexOf(token);
                el.setAttribute('data-token-index', tokenIndex);
            }
        });
        html = doc.body.innerHTML;

        // 2. Post-process contact block if present: e.g. [CONTACT : text]
        html = html.replace(/\[CONTACT\s*:\s*([^\]]+)\]/gi, (match, contents) => {
            const parts = contents.split('|').map(p => p.trim());
            const formattedParts = parts.map(part => {
                if (part.includes('@') && !part.includes(' ')) {
                    return `<a href="mailto:${part}">${part}</a>`;
                }
                if (part.startsWith('http://') || part.startsWith('https://')) {
                    const cleanUrl = part.replace(/^https?:\/\/(www\.)?/, '');
                    return `<a href="${part}" target="_blank">${cleanUrl}</a>`;
                }
                return `<span>${part}</span>`;
            });
            return `<div class="resume-contact-bar">${formattedParts.join(' &nbsp;•&nbsp; ')}</div>`;
        });

        // RESTRUCTURE FOR 2 COLUMNS IF ENABLED
        let finalHtml = html;
        if (styleConfig.layoutMode === '2-column') {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const bodyElements = Array.from(doc.body.children);

            const headerElements = [];
            const mainColElements = [];
            const sidebarColElements = [];

            let currentDest = null;
            let foundFirstHeading = false;

            for (let el of bodyElements) {
                if (el.tagName === 'H2') {
                    foundFirstHeading = true;
                    currentDest = mainColElements;
                    currentDest.push(el.cloneNode(true));
                } else if (el.tagName === 'H3') {
                    foundFirstHeading = true;
                    currentDest = sidebarColElements;
                    currentDest.push(el.cloneNode(true));
                } else if (!foundFirstHeading) {
                    headerElements.push(el.cloneNode(true));
                } else {
                    if (currentDest) {
                        currentDest.push(el.cloneNode(true));
                    } else {
                        headerElements.push(el.cloneNode(true));
                    }
                }
            }

            // Build checklist of all sections (all H2 and H3 headings)
            const allSections = Array.from(doc.querySelectorAll('h2, h3')).map(h => ({
                title: h.textContent.trim(),
                isSidebar: h.tagName.toLowerCase() === 'h3'
            }));
            updateSidebarChecklist(allSections);

            const headerHtml = headerElements.map(el => el.outerHTML).join('\n');
            const mainHtml = mainColElements.map(el => el.outerHTML).join('\n');
            const sidebarHtml = sidebarColElements.map(el => el.outerHTML).join('\n');

            finalHtml = `
                <div class="resume-header">
                    ${headerHtml}
                </div>
                <div class="resume-columns ${styleConfig.sidebarPosition === 'left' ? 'sidebar-left' : ''}">
                    <div class="resume-main-col">
                        ${mainHtml}
                    </div>
                    <div class="resume-sidebar-col" style="background-color: ${styleConfig.sidebarBg || '#2d3748'}; color: ${styleConfig.sidebarText || '#ffffff'};">
                        ${sidebarHtml}
                    </div>
                </div>
            `;
        } else {
            // In 1-column mode, all H2 and H3 are rendered sequentially
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const allSections = Array.from(doc.querySelectorAll('h2, h3')).map(h => ({
                title: h.textContent.trim(),
                isSidebar: h.tagName.toLowerCase() === 'h3'
            }));
            updateSidebarChecklist(allSections);
        }

        resumeOutput.innerHTML = finalHtml;

        // Auto-justify paragraph blocks that contain inline lists / separators (e.g. skills)
        const paragraphs = resumeOutput.querySelectorAll('p');
        paragraphs.forEach(p => {
            const text = p.textContent;
            if (text.includes('•') || text.includes('·')) {
                p.style.textAlign = 'justify';
                p.style.textJustify = 'inter-word';
            }
        });

        // Dynamic title configuration for PDF filename proposal on printing
        const titleParser = new DOMParser();
        const titleDoc = titleParser.parseFromString(finalHtml, 'text/html');
        const firstHeader = titleDoc.querySelector('h1');
        let nameKey = "resume";
        if (firstHeader) {
            const cleanNameText = firstHeader.textContent.replace(/\([^)]*\)/g, '');
            const slugify = (text) => {
                return text.toString().toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]/g, '');
            };
            const nameParts = cleanNameText.split(/\s+/).map(slugify).filter(Boolean);
            if (nameParts.length >= 2) {
                nameKey = nameParts.at(0).charAt(0) + nameParts.at(-1);
            } else if (nameParts.length === 1) {
                nameKey = nameParts[0];
            }
        }

        let positionKey = "";
        if (firstHeader) {
            let sibling = firstHeader.nextElementSibling;
            while (sibling && (sibling.classList.contains('resume-contact-bar') || sibling.tagName !== 'P')) {
                sibling = sibling.nextElementSibling;
            }
            if (sibling && sibling.tagName === 'P') {
                const slugifyPosition = (text) => {
                    return text.toString().toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]+/g, '_')
                        .replace(/^_+|_+$/g, '');
                };
                positionKey = slugifyPosition(sibling.textContent);
            }
        }

        if (positionKey) {
            currentResumeTitle = `${nameKey}_${positionKey}`;
        } else {
            currentResumeTitle = nameKey;
        }

        // Perform ATS validation on the actual structured HTML content
        runAtsChecker(mdText, finalHtml);
        lastCleanHTML = resumeOutput.innerHTML;

        // Refresh page break indicators
        updatePageBreaks();
    }

    // Dynamic ATS Checker Engine
    function runAtsChecker(md, html) {
        let score = 100;
        const checks = [];

        // Textual representation of compiled HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const plainText = doc.body.textContent || "";

        // Count words/chars
        const wordCount = plainText.trim().split(/\s+/).filter(w => w.length > 0).length;
        const charCount = plainText.length;
        charWordCount.textContent = `Words: ${wordCount} | Characters: ${charCount}`;

        // 1. Email Check
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        if (emailRegex.test(plainText)) {
            checks.push({ status: 'pass', text: 'Valid email address present.' });
        } else {
            score -= 15;
            checks.push({ status: 'fail', text: 'No email address detected.' });
        }

        // 2. Phone Check
        const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}/;
        if (phoneRegex.test(plainText)) {
            checks.push({ status: 'pass', text: 'Phone number present.' });
        } else {
            score -= 15;
            checks.push({ status: 'fail', text: 'No phone number detected.' });
        }

        // 3. Tables Warning (ATS parsing blocker)
        if (md.includes('| --- |') || html.includes('<table')) {
            score -= 15;
            checks.push({ status: 'fail', text: 'Table detected: Avoid tables (ATS scanners read table cells out of order).' });
        } else {
            checks.push({ status: 'pass', text: 'Table-free structure (Compliant).' });
        }

        // 4. Image Check
        if (md.includes('![]') || md.includes('![') || html.includes('<img')) {
            score -= 10;
            checks.push({ status: 'fail', text: 'Image detected: Avoid graphics/images (ATS scanners ignore images and text inside them).' });
        } else {
            checks.push({ status: 'pass', text: 'No graphics/images (Compliant).' });
        }

        // 5. Headings Check
        const standardHeaders = ['experience', 'education', 'formation', 'skills', 'competenc', 'project', 'projet', 'summary', 'profile', 'profil', 'resume', 'résumé'];
        const headers = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent.toLowerCase());
        let standardHeadingCount = 0;
        headers.forEach(h => {
            if (standardHeaders.some(sh => h.includes(sh))) {
                standardHeadingCount++;
            }
        });

        if (standardHeadingCount >= 2) {
            checks.push({ status: 'pass', text: 'Standard section headings identified.' });
        } else {
            score -= 15;
            checks.push({ status: 'fail', text: 'Use standard section headings (e.g., "Experience", "Education").' });
        }

        // 6. Candidates full name check (First Heading should be candidate name)
        const firstHeader = doc.querySelector('h1');
        if (firstHeader && firstHeader.textContent.trim().length > 2) {
            checks.push({ status: 'pass', text: 'Candidate full name identified in H1.' });
        } else {
            score -= 15;
            checks.push({ status: 'fail', text: 'Start your resume with your Name in H1.' });
        }

        // 7. Bullet points formatting check
        const lists = doc.querySelectorAll('li');
        if (lists.length >= 3) {
            checks.push({ status: 'pass', text: 'Standardized bullet point structure.' });
        } else {
            score -= 15;
            checks.push({ status: 'fail', text: 'Use bullet point lists (at least 3 items) for professional experience.' });
        }

        // Ensure score bounds
        score = Math.max(0, Math.min(100, score));

        // Render checklist UI with proper mapping of c.status to icon keys
        atsChecklistContainer.innerHTML = checks.map(c => {
            const iconKey = c.status === 'pass' ? 'check' : (c.status === 'fail' ? 'error' : 'info');
            const icon = iconKey === 'check' ? ICONS.check : (iconKey === 'error' ? ICONS.error : ICONS.info);
            return `<li class="${c.status}">${icon} <span>${c.text}</span></li>`;
        }).join('');

        // Update radial progress circle
        const circumference = 163.36;
        const offset = circumference - (score / 100) * circumference;
        scoreRingProgress.style.strokeDashoffset = offset;
        scoreValueText.textContent = `${score}%`;

        // Style score indicators based on score
        if (score >= 90) {
            scoreRingProgress.setAttribute('stroke', '#10b981'); // success green
            verdictTitle.textContent = "Perfect Formatting!";
            verdictDesc.textContent = "Ready to be parsed by recruiters and ATS scanners.";
        } else if (score >= 70) {
            scoreRingProgress.setAttribute('stroke', '#fbbf24'); // warning yellow
            verdictTitle.textContent = "Average Formatting";
            verdictDesc.textContent = "Fix critical warnings to optimize parsing.";
        } else {
            scoreRingProgress.setAttribute('stroke', '#ef4444'); // danger red
            verdictTitle.textContent = "Optimization Required";
            verdictDesc.textContent = "Your resume may not be parsed correctly by ATS.";
        }
    }

    // Zoom Handlers
    function updateZoomDisplay() {
        previewCanvas.style.setProperty('--zoom-factor', zoomFactor);
        zoomLevelText.textContent = `${Math.round(zoomFactor * 100)}%`;
    }

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
        canvasWrapper.scrollLeft = (canvasWrapper.scrollWidth - canvasWrapper.clientWidth) / 2;
        canvasWrapper.scrollTop = 0;
    });

    zoomLevelText.addEventListener('dblclick', () => {
        isUserZoomed = false;
        autoFitZoom();
        canvasWrapper.scrollLeft = (canvasWrapper.scrollWidth - canvasWrapper.clientWidth) / 2;
        canvasWrapper.scrollTop = 0;
    });

    // --- About Modal Listeners ---
    btnAbout.addEventListener('click', () => {
        aboutModal.classList.add('show');
        startOpeningFireworks();
    });

    btnCloseModal.addEventListener('click', () => {
        aboutModal.classList.remove('show');
    });

    // Close modal on clicking backdrop
    aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
            aboutModal.classList.remove('show');
        }
    });

    // Close modal on Escape key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && aboutModal.classList.contains('show')) {
            aboutModal.classList.remove('show');
        }
    });

    // --- Developer Tools Modal Listeners ---
    if (btnDeveloperToggle) {
        btnDeveloperToggle.addEventListener('click', () => {
            const enteredToken = prompt("Enter Developer Token to access Developer Tools:");
            if (!enteredToken) return;

            fetch('/api/verify-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: enteredToken })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    developerModal.classList.add('show');
                    // Sync values with current state
                    devWebhookUrl.value = localStorage.getItem('n8n_webhook_url') || '';
                    devWebhookToken.value = localStorage.getItem('n8n_webhook_token') || '';
                    updateBookmarkletLink();
                } else {
                    showToast("Unauthorized: Invalid Developer Token.");
                }
            })
            .catch(err => {
                console.error(err);
                showToast("Error verifying token.");
            });
        });
    }

    if (btnCloseDeveloperModal) {
        btnCloseDeveloperModal.addEventListener('click', () => {
            developerModal.classList.remove('show');
        });
    }

    if (developerModal) {
        developerModal.addEventListener('click', (e) => {
            if (e.target === developerModal) {
                developerModal.classList.remove('show');
            }
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && developerModal && developerModal.classList.contains('show')) {
            developerModal.classList.remove('show');
        }
    });

    function updateBookmarkletLink() {
        if (!bookmarkletDragLink) return;
        const url = devWebhookUrl.value.trim() || 'https://n8n.eole.me/webhook/cv-factory';
        const token = devWebhookToken.value.trim() || '';

        // Compile bookmarklet dynamically
        const bookmarkletCode = `javascript:(function(){const token="${token}";const webhookUrl="${url}";const getTxt=(s)=>document.querySelector(s)?.innerText?.trim()||"";let description=getTxt('#job-details')||getTxt('.jobs-description')||getTxt('.jobs-box__html-content')||"";if(description.length<50){description=window.getSelection().toString();}const title=encodeURIComponent(getTxt('.job-details-jobs-unified-top-card__job-title')||document.title);const company=encodeURIComponent(getTxt('.job-details-jobs-unified-top-card__company-name')||"");const url=encodeURIComponent(window.location.href);const shortDesc=encodeURIComponent(description.substring(0,1800));const n8nUrl=\`\${webhookUrl}?token=\${token}&job_title=\${title}&company=\${company}&job_url=\${url}&job_description=\${shortDesc}\`;window.open(n8nUrl,'_blank');})();`;

        bookmarkletDragLink.setAttribute('href', bookmarkletCode);
    }

    if (devWebhookUrl) {
        devWebhookUrl.addEventListener('input', updateBookmarkletLink);
    }
    if (devWebhookToken) {
        devWebhookToken.addEventListener('input', updateBookmarkletLink);
    }

    if (btnSaveDevSettings) {
        btnSaveDevSettings.addEventListener('click', () => {
            const url = devWebhookUrl.value.trim();
            const token = devWebhookToken.value.trim();

            localStorage.setItem('n8n_webhook_url', url);
            localStorage.setItem('n8n_webhook_token', token);

            // Also keep standard inputs updated
            if (n8nWebhookUrl) n8nWebhookUrl.value = url;
            if (n8nWebhookToken) n8nWebhookToken.value = token;

            showToast("Settings saved successfully!");
            developerModal.classList.remove('show');
        });
    }

    // --- Action Listeners ---
    markdownInput.addEventListener('input', (e) => {
        const mdText = e.target.value;
        compileMarkdown(mdText);
        saveToLocalStorage();
    });

    // Wire customizer sliders and pickers
    const uiElements = [
        fontSizeSlider, lineHeightSlider, headingScaleSlider,
        marginXSlider, marginYSlider, sectionSpacingSlider,
        layoutModeSelect, sidebarPositionSelect,
        colorSidebarBg, colorSidebarText,
        colorBg, colorHeadings, colorBody, colorLinks, colorAccent
    ];

    uiElements.forEach(el => {
        el.addEventListener('input', updateConfigFromControls);
        el.addEventListener('change', updateConfigFromControls);
    });

    // Wire font tiles selection
    fontTiles.forEach(tile => {
        tile.addEventListener('click', () => {
            styleConfig.fontFamily = tile.getAttribute('data-font');
            applyStyles();

            // Recompile markdown since typography changes might affect auto zoom
            compileMarkdown(markdownInput.value);
            saveToLocalStorage();
        });
    });

    // Wire color presets
    presetClassicNb.addEventListener('click', () => {
        styleConfig.activePreset = 'classic';
        styleConfig.colorBg = '#ffffff';
        styleConfig.colorHeadings = '#111111';
        styleConfig.colorBody = '#222222';
        styleConfig.colorLinks = '#000000';
        styleConfig.colorAccent = '#444444';
        updateControlsFromConfig();
        compileMarkdown(markdownInput.value);
        saveToLocalStorage();
    });

    presetDarkMode.addEventListener('click', () => {
        styleConfig.activePreset = 'dark';
        styleConfig.colorBg = '#0f172a';
        styleConfig.colorHeadings = '#f8fafc';
        styleConfig.colorBody = '#cbd5e1';
        styleConfig.colorLinks = '#38bdf8';
        styleConfig.colorAccent = '#34d399';
        updateControlsFromConfig();
        compileMarkdown(markdownInput.value);
        saveToLocalStorage();
    });

    presetCleanBlue.addEventListener('click', () => {
        styleConfig.activePreset = 'clean-blue';
        styleConfig.colorBg = '#ffffff';
        styleConfig.colorHeadings = '#0f172a';
        styleConfig.colorBody = '#334155';
        styleConfig.colorLinks = '#2563eb';
        styleConfig.colorAccent = '#0ea5e9';
        updateControlsFromConfig();
        compileMarkdown(markdownInput.value);
        saveToLocalStorage();
    });

    presetCustom.addEventListener('click', () => {
        styleConfig.activePreset = 'custom';
        styleConfig.colorBg = customColors.colorBg;
        styleConfig.colorHeadings = customColors.colorHeadings;
        styleConfig.colorBody = customColors.colorBody;
        styleConfig.colorLinks = customColors.colorLinks;
        styleConfig.colorAccent = customColors.colorAccent;
        styleConfig.sidebarBg = customColors.sidebarBg;
        styleConfig.sidebarText = customColors.sidebarText;
        updateControlsFromConfig();
        compileMarkdown(markdownInput.value);
        saveToLocalStorage();
    });

    // App Theme Toggle (Auto / Light / Dark)
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
        themeBtnIcon.innerHTML = theme === 'system' ? themeIcons.system : (theme === 'light' ? themeIcons.light : themeIcons.dark);
        themeBtnText.textContent = theme === 'system' ? themeTexts.system : (theme === 'light' ? themeTexts.light : themeTexts.dark);
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

    btnLoadSample.addEventListener('click', () => {
        if (confirm("Do you want to reload the default Julien Avarre sample? Your local changes will be replaced.")) {
            // Load from sample.md
            fetch('sample.md')
                .then(res => res.text())
                .then(sampleText => {
                    markdownInput.value = sampleText;
                    compileMarkdown(sampleText);
                    saveToLocalStorage();
                    showToast("Julien Avarre sample reloaded!");
                })
                .catch(err => console.error(err));
        }
    });

    btnClear.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear the editor?")) {
            markdownInput.value = "";
            compileMarkdown("");
            saveToLocalStorage();
        }
    });

    if (btnCopyMd) {
        btnCopyMd.addEventListener('click', () => {
            const mdContent = markdownInput.value;
            navigator.clipboard.writeText(mdContent)
                .then(() => showToast("Markdown copied to clipboard!"))
                .catch(err => console.error("Clipboard copy error:", err));
        });
    }

    btnPrint.addEventListener('click', () => {
        window.print();
    });

    // Handle Auto-Fit Zoom on window resize
    window.addEventListener('resize', autoFitZoom);

    // Print helper to temporarily set document.title for browser print PDF naming
    window.addEventListener('beforeprint', () => {
        document.title = currentResumeTitle;
    });
    window.addEventListener('afterprint', () => {
        document.title = "jobby MD Editor";
    });

    // --- Panning Hand Mode Feature ---
    let isPanMode = true; // Enabled by default
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;

    if (btnPanToggle && canvasWrapper) {
        // Ensure initial classes are in sync
        canvasWrapper.classList.add('pan-mode');
        btnPanToggle.classList.add('active');

        btnPanToggle.addEventListener('click', () => {
            isPanMode = !isPanMode;
            if (isPanMode) {
                btnPanToggle.classList.add('active');
                canvasWrapper.classList.add('pan-mode');
            } else {
                btnPanToggle.classList.remove('active');
                canvasWrapper.classList.remove('pan-mode');
                isDragging = false;
            }
        });

        canvasWrapper.addEventListener('mousedown', (e) => {
            if (!isPanMode) return;
            if (e.button !== 0) return; // Only left click

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startScrollLeft = canvasWrapper.scrollLeft;
            startScrollTop = canvasWrapper.scrollTop;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !isPanMode) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            canvasWrapper.scrollLeft = startScrollLeft - dx;
            canvasWrapper.scrollTop = startScrollTop - dy;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // --- Selection Sync & Highlight ---
    function cleanMarkdown(text) {
        if (!text) return "";
        return text
            .replace(/^(#+\s*|-\s*|\*\s*|\+\s*)/gm, '') // Remove list bullets/headers at beginning of lines
            .replace(/[\*\#_`~]/g, '')                // Remove inline markdown markers
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links [text](url) to just text
            .trim();
    }

    function countNonWsChars(text) {
        if (!text) return 0;
        return text.replace(/\s/g, '').length;
    }

    function highlightNonWsRangeInElement(element, startNonWsCount, targetNonWsLen) {
        if (targetNonWsLen <= 0) return;

        let currentNonWsCount = 0;
        const endNonWsCount = startNonWsCount + targetNonWsLen;

        function walk(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const content = node.nodeValue;
                const parent = node.parentNode;

                let nodeNonWsCount = 0;
                const nonWsIndices = [];
                for (let i = 0; i < content.length; i++) {
                    if (!/\s/.test(content.charAt(i))) {
                        nonWsIndices.push(i);
                        nodeNonWsCount++;
                    }
                }

                const nodeStartNonWs = currentNonWsCount;
                const nodeEndNonWs = currentNonWsCount + nodeNonWsCount;

                if (nodeEndNonWs > startNonWsCount && nodeStartNonWs < endNonWsCount) {
                    const overlapStartNonWsIdx = Math.max(0, startNonWsCount - nodeStartNonWs);
                    const overlapEndNonWsIdx = Math.min(nodeNonWsCount, endNonWsCount - nodeStartNonWs);

                    const charStart = nonWsIndices.at(overlapStartNonWsIdx);
                    const charEnd = nonWsIndices.at(overlapEndNonWsIdx - 1) + 1;

                    if (parent && parent.tagName !== 'MARK' && parent.tagName !== 'SCRIPT' && parent.tagName !== 'STYLE') {
                        const fragment = document.createDocumentFragment();

                        if (charStart > 0) {
                            fragment.appendChild(document.createTextNode(content.substring(0, charStart)));
                        }

                        const mark = document.createElement('mark');
                        mark.className = 'editor-twin-highlight';
                        mark.textContent = content.substring(charStart, charEnd);
                        fragment.appendChild(mark);

                        if (charEnd < content.length) {
                            fragment.appendChild(document.createTextNode(content.substring(charEnd)));
                        }

                        parent.replaceChild(fragment, node);
                    }
                }
                currentNonWsCount += nodeNonWsCount;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName !== 'MARK' && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                    const children = Array.from(node.childNodes);
                    for (let child of children) {
                        walk(child);
                    }
                }
            }
        }

        walk(element);
    }

    function handleSelectionChange() {
        if (!markdownInput || !resumeOutput || !currentTokens || currentTokens.length === 0) return;

        const start = markdownInput.selectionStart;
        const end = markdownInput.selectionEnd;

        if (start === end) {
            if (isHighlightActive) {
                resumeOutput.innerHTML = lastCleanHTML;
                isHighlightActive = false;
            }
            return;
        }

        // Find all tokens overlapping with the selection [start, end]
        const overlappingTokens = currentTokens.filter(token => {
            return token.endOffset > start && token.startOffset < end;
        });

        if (overlappingTokens.length === 0) return;

        // Restore HTML first
        resumeOutput.innerHTML = lastCleanHTML;
        isHighlightActive = false;

        let firstHighlightEl = null;

        overlappingTokens.forEach(token => {
            const tokenIndex = currentTokens.indexOf(token);
            const activeEl = resumeOutput.querySelector(`[data-token-index="${tokenIndex}"]`);
            if (!activeEl) return;

            const overlapStart = Math.max(token.startOffset, start);
            const overlapEnd = Math.min(token.endOffset, end);

            if (overlapStart >= overlapEnd) return;

            const tokenRelativeStart = overlapStart - token.startOffset;
            const tokenRelativeEnd = overlapEnd - token.startOffset;

            const prefix = token.raw.substring(0, tokenRelativeStart);
            const selectedText = token.raw.substring(tokenRelativeStart, tokenRelativeEnd);

            const cleanPrefix = cleanMarkdown(prefix);
            const cleanSelected = cleanMarkdown(selectedText);

            const startNonWsCount = countNonWsChars(cleanPrefix);
            const targetNonWsLen = countNonWsChars(cleanSelected);

            if (targetNonWsLen > 0) {
                highlightNonWsRangeInElement(activeEl, startNonWsCount, targetNonWsLen);

                if (!firstHighlightEl) {
                    firstHighlightEl = activeEl.querySelector('.editor-twin-highlight');
                }
                isHighlightActive = true;
            }
        });

        if (firstHighlightEl) {
            firstHighlightEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    let selectionTimeout;
    document.addEventListener('selectionchange', () => {
        if (document.activeElement === markdownInput) {
            clearTimeout(selectionTimeout);
            selectionTimeout = setTimeout(handleSelectionChange, 150);
        }
    });

    // --- Editor Cursor Flashing Radar Echo Helper ---
    function getCursorCoordinates(textarea, selectionStart) {
        let mirror = document.getElementById('textarea-mirror');
        if (!mirror) {
            mirror = document.createElement('div');
            mirror.id = 'textarea-mirror';
            document.body.appendChild(mirror);
        }

        const styles = window.getComputedStyle(textarea);

        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.wordBreak = 'break-word';
        mirror.style.overflow = 'hidden';

        // Match physical layout and padding
        mirror.style.width = textarea.clientWidth + 'px';
        mirror.style.boxSizing = 'border-box';

        mirror.style.fontFamily = styles.fontFamily;
        mirror.style.fontSize = styles.fontSize;
        mirror.style.fontWeight = styles.fontWeight;
        mirror.style.fontStyle = styles.fontStyle;
        mirror.style.lineHeight = styles.lineHeight;
        mirror.style.paddingTop = styles.paddingTop;
        mirror.style.paddingRight = styles.paddingRight;
        mirror.style.paddingBottom = styles.paddingBottom;
        mirror.style.paddingLeft = styles.paddingLeft;

        const text = textarea.value.substring(0, selectionStart);
        mirror.textContent = text;

        const marker = document.createElement('span');
        marker.textContent = '|';
        mirror.appendChild(marker);

        const markerOffsetLeft = marker.offsetLeft;
        const markerOffsetTop = marker.offsetTop;

        const rect = textarea.getBoundingClientRect();

        // Center the radar vertically relative to the line height
        let lineHeight = parseFloat(styles.lineHeight);
        if (isNaN(lineHeight)) {
            const fontSize = parseFloat(styles.fontSize) || 12.5;
            lineHeight = fontSize * 1.5;
        }

        const x = rect.left + window.scrollX + markerOffsetLeft - textarea.scrollLeft;
        const y = rect.top + window.scrollY + markerOffsetTop - textarea.scrollTop + (lineHeight / 2);

        return { x, y };
    }

    let cursorRadarTimeout;
    function showFlashingCursorRadar() {
        if (!markdownInput) return;

        const selectionStart = markdownInput.selectionStart;
        const coords = getCursorCoordinates(markdownInput, selectionStart);

        let radar = document.getElementById('editor-cursor-radar');
        if (!radar) {
            radar = document.createElement('div');
            radar.id = 'editor-cursor-radar';
            radar.className = 'cursor-radar';

            const r1 = document.createElement('div');
            r1.className = 'ripple ripple-1';
            const r2 = document.createElement('div');
            r2.className = 'ripple ripple-2';
            const r3 = document.createElement('div');
            r3.className = 'ripple ripple-3';

            radar.appendChild(r1);
            radar.appendChild(r2);
            radar.appendChild(r3);
            document.body.appendChild(radar);
        }

        radar.style.left = `${coords.x}px`;
        radar.style.top = `${coords.y}px`;

        radar.classList.remove('show');
        void radar.offsetWidth; // Force animation reflow
        radar.classList.add('show');

        clearTimeout(cursorRadarTimeout);
        cursorRadarTimeout = setTimeout(() => {
            radar.classList.remove('show');
        }, 2000);
    }

    // Wire editor cursor movement triggers (clicks and arrow navigations)
    if (markdownInput) {
        markdownInput.addEventListener('click', () => {
            setTimeout(() => {
                showFlashingCursorRadar();
            }, 50);
        });

        markdownInput.addEventListener('keyup', (e) => {
            const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'];
            if (arrowKeys.includes(e.key)) {
                showFlashingCursorRadar();
            }
        });
    }

    // --- Bidirectional Cursor Sync: Preview Click to Editor Cursor Position ---
    let clickStartX = 0;
    let clickStartY = 0;
    if (canvasWrapper) {
        canvasWrapper.addEventListener('mousedown', (e) => {
            clickStartX = e.clientX;
            clickStartY = e.clientY;
        });
    }

    if (resumeOutput) {
        resumeOutput.addEventListener('click', (e) => {
            // Prevent cursor mapping if user was dragging/panning
            const deltaX = Math.abs(e.clientX - clickStartX);
            const deltaY = Math.abs(e.clientY - clickStartY);
            if (deltaX > 5 || deltaY > 5) return;

            const targetEl = e.target;
            if (!targetEl || targetEl === resumeOutput) return;

            // Find the closest ancestor block mapped to an AST token
            const tokenEl = targetEl.closest('[data-token-index]');
            if (!tokenEl) return;

            const tokenIndex = parseInt(tokenEl.getAttribute('data-token-index'), 10);
            if (isNaN(tokenIndex) || !currentTokens || !currentTokens[tokenIndex]) return;

            const token = currentTokens[tokenIndex];
            const mdText = markdownInput.value;
            const tokenRaw = mdText.substring(token.startOffset, token.endOffset);

            let offset = token.startOffset;
            const targetText = targetEl.textContent.trim();

            if (targetText.length > 0) {
                // Try exact match within the token raw block
                let relativeIdx = tokenRaw.indexOf(targetText);

                // If not found, try a fuzzy match by stripping formatting chars from a snippet
                if (relativeIdx === -1) {
                    const cleanSnippet = targetText.substring(0, 15).replace(/[\*\#_`~\[\]]/g, '').trim();
                    if (cleanSnippet.length >= 3) {
                        relativeIdx = tokenRaw.indexOf(cleanSnippet);
                    }
                }

                if (relativeIdx !== -1) {
                    offset = token.startOffset + relativeIdx;
                }
            }

            // Focus the editor and set cursor position
            if (markdownInput) {
                markdownInput.focus();
                markdownInput.setSelectionRange(offset, offset);

                // Scroll the editor to make the cursor visible
                const textUpToCursor = mdText.substring(0, offset);
                const lineCount = textUpToCursor.split('\n').length;
                const lineHeight = parseFloat(window.getComputedStyle(markdownInput).lineHeight);
                markdownInput.scrollTop = Math.max(0, (lineCount - 4) * lineHeight);

                // Show flashing cursor radar echo
                setTimeout(() => {
                    showFlashingCursorRadar();
                }, 100);
            }
        });
    }

    // --- Page Guidelines & Breaks Feature ---
    function updatePageBreaks() {
        if (!resumeOutput) return;

        // Remove any existing page break indicators
        const existingBreaks = resumeOutput.querySelectorAll('.page-break-indicator');
        existingBreaks.forEach(el => el.remove());

        // Toggle letter-format class on the sheet
        if (pageFormat === "letter") {
            resumeOutput.classList.add('letter-format');
        } else {
            resumeOutput.classList.remove('letter-format');
        }

        if (!showPageBreaks) return;

        // Calculate total content height
        const sheetHeight = resumeOutput.scrollHeight;
        let pageHeightPx = 0;

        // Measure actual page height dynamically using a temp element
        const tempDiv = document.createElement('div');
        tempDiv.style.height = pageFormat === "A4" ? '297mm' : '11in';
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        resumeOutput.appendChild(tempDiv);
        pageHeightPx = tempDiv.offsetHeight;
        tempDiv.remove();

        if (pageHeightPx <= 0) return;

        // Draw page break elements
        const numPages = Math.ceil(sheetHeight / pageHeightPx);
        for (let i = 1; i < numPages; i++) {
            const breakLine = document.createElement('div');
            breakLine.className = 'page-break-indicator';
            breakLine.style.top = `${i * pageHeightPx}px`;

            const labelSpan = document.createElement('span');
            labelSpan.textContent = `Page ${i} / ${i + 1}`;
            breakLine.appendChild(labelSpan);

            resumeOutput.appendChild(breakLine);
        }
    }

    if (btnPageBreaks && selectPageFormat) {
        selectPageFormat.value = pageFormat;

        if (showPageBreaks) {
            btnPageBreaks.classList.add('active');
            selectPageFormat.style.display = 'inline-block';
        } else {
            btnPageBreaks.classList.remove('active');
            selectPageFormat.style.display = 'none';
        }

        btnPageBreaks.addEventListener('click', () => {
            showPageBreaks = !showPageBreaks;
            localStorage.setItem('show_page_breaks', showPageBreaks);

            if (showPageBreaks) {
                btnPageBreaks.classList.add('active');
                selectPageFormat.style.display = 'inline-block';
            } else {
                btnPageBreaks.classList.remove('active');
                selectPageFormat.style.display = 'none';
            }
            updatePageBreaks();
        });

        selectPageFormat.addEventListener('change', (e) => {
            pageFormat = e.target.value;
            localStorage.setItem('page_format', pageFormat);
            updatePageBreaks();
            autoFitZoom();
        });
    }

    // --- Export Node formats for n8n ---

    // 1. Copy Standalone HTML (CSS Embedded in Style tag)
    btnCopyStandalone.addEventListener('click', () => {
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

        const compiledHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${currentResumeTitle || 'Resume'}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Raleway:wght@300;400;500;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=JetBrains+Mono:wght@400;500;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
    <style>
        ${inlineVariables}
        ${templatesCssText}
        
        @media print {
            @page {
                size: A4 portrait;
                margin-top: ${styleConfig.marginY}px;
                margin-bottom: ${styleConfig.marginY}px;
                margin-left: ${styleConfig.marginX}px;
                margin-right: ${styleConfig.marginX}px;
            }
            .a4-sheet {
                padding: 0 !important;
            }
        }
        
        /* Layout overrides for clean full-screen rendering */
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
        
        /* Contact Header styling */
        .resume-contact-bar {
            font-size: calc(var(--resume-font-size) * 0.85);
            color: var(--resume-color-links);
            background-color: rgba(0, 0, 0, 0.02);
            border: 1px solid rgba(0, 0, 0, 0.04);
            padding: 6px 12px;
            border-radius: 4px;
            margin-top: 8px;
            margin-bottom: 16px;
            text-align: center;
        }
    </style>
</head>
<body>
    <article class="a4-sheet" id="resume-output">
        ${resumeOutput.innerHTML}
    </article>
</body>
</html>`;

        navigator.clipboard.writeText(compiledHtml)
            .then(() => showToast("Standalone HTML copied to clipboard!"))
            .catch(err => console.error("Clipboard copy error:", err));
    });

    // 2. Copy Raw CSS Only
    btnCopyCss.addEventListener('click', () => {
        const inlineVariables = `/* Custom Config Variables */
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
}
`;
        const cssContent = inlineVariables + "\n" + templatesCssText;
        navigator.clipboard.writeText(cssContent)
            .then(() => showToast("CSS styles copied to clipboard!"))
            .catch(err => console.error("Clipboard copy error:", err));
    });

    // 3. Copy Raw Resume Inner HTML only
    btnCopyHtml.addEventListener('click', () => {
        const markup = resumeOutput.innerHTML;
        navigator.clipboard.writeText(markup)
            .then(() => showToast("Inner HTML markup copied to clipboard!"))
            .catch(err => console.error("Clipboard copy error:", err));
    });

    // 4. Download Source Markdown (.md)
    btnDownloadMd.addEventListener('click', () => {
        const mdContent = markdownInput.value;
        const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'resume.md';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Markdown download started!");
    });

    // 5. Sync Config to n8n Webhook
    if (n8nWebhookUrl) {
        n8nWebhookUrl.value = localStorage.getItem('n8n_webhook_url') || '';
    }
    if (n8nWebhookToken) {
        n8nWebhookToken.value = localStorage.getItem('n8n_webhook_token') || '';
    }

    if (btnSyncN8n && n8nWebhookUrl) {
        btnSyncN8n.addEventListener('click', () => {
            const url = n8nWebhookUrl.value.trim();
            if (!url) {
                showToast("Please enter an n8n webhook URL first!");
                return;
            }

            const token = n8nWebhookToken ? n8nWebhookToken.value.trim() : '';

            localStorage.setItem('n8n_webhook_url', url);
            localStorage.setItem('n8n_webhook_token', token);

            const payload = {
                config: styleConfig,
                css: templatesCssText
            };

            btnSyncN8n.disabled = true;
            const originalText = btnSyncN8n.textContent;
            btnSyncN8n.textContent = "Syncing...";

            const headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

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
                    btnSyncN8n.disabled = false;
                    btnSyncN8n.textContent = originalText;
                });
        });
    }

    // --- Column Resizing Handles ---
    const handleLeft = document.getElementById('handle-left');
    const handleRight = document.getElementById('handle-right');
    const editorPanel = document.querySelector('.editor-panel');
    const controlsPanel = document.querySelector('.controls-panel');

    if (handleLeft && handleRight) {
        // Left handle (resizes editorPanel width)
        handleLeft.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = editorPanel.getBoundingClientRect().width;

            handleLeft.classList.add('dragging');

            function onMouseMove(moveEvent) {
                const deltaX = moveEvent.clientX - startX;
                const newWidth = Math.max(250, Math.min(600, startWidth + deltaX));
                editorPanel.style.width = `${newWidth}px`;
                autoFitZoom();
            }

            function onMouseUp() {
                handleLeft.classList.remove('dragging');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Right handle (resizes controlsPanel width)
        handleRight.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = controlsPanel.getBoundingClientRect().width;

            handleRight.classList.add('dragging');

            function onMouseMove(moveEvent) {
                // Dragging to the left increases controls panel width
                const deltaX = startX - moveEvent.clientX;
                const newWidth = Math.max(280, Math.min(600, startWidth + deltaX));
                controlsPanel.style.width = `${newWidth}px`;
                autoFitZoom();
            }

            function onMouseUp() {
                handleRight.classList.remove('dragging');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // --- API Startup Loader ---
    async function loadWorkspaceData() {
        let loadedMarkdown = null;
        let loadedConfig = null;

        // 1. Try reading from localStorage first
        const savedMd = localStorage.getItem('ats_resume_markdown');
        const savedStyles = localStorage.getItem('ats_resume_styles');

        if (savedMd) {
            loadedMarkdown = savedMd;
            if (savedStyles) {
                try {
                    loadedConfig = JSON.parse(savedStyles);
                } catch (e) {
                    console.error("Failed to parse saved styles from localStorage:", e);
                }
            }
        }

        // 2. If localStorage is empty, try to fetch from local files (for backward compatibility if user already has resume.md / config.json on disk)
        if (!loadedMarkdown) {
            try {
                const mdResponse = await fetch('resume.md');
                if (mdResponse.ok) {
                    loadedMarkdown = await mdResponse.text();

                    // Try fetching config.json as well
                    const configResponse = await fetch('config.json');
                    if (configResponse.ok) {
                        try {
                            loadedConfig = await configResponse.json();
                        } catch (e) {
                            console.error("Failed to parse config.json fetched from server:", e);
                        }
                    }
                    console.log("Loaded legacy resume.md and config.json from disk.");
                }
            } catch (e) {
                console.warn("Attempt to fetch legacy resume.md from server failed:", e);
            }
        }

        // 3. Fallback to sample.md if still empty
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

        // Populate the editor and state
        markdownInput.value = loadedMarkdown;
        compileMarkdown(loadedMarkdown);

        if (loadedConfig) {
            styleConfig = { ...DEFAULT_STYLE_CONFIG, ...loadedConfig };
        } else {
            styleConfig = { ...DEFAULT_STYLE_CONFIG };
        }

        // Initialize customColors from loaded config
        customColors.colorBg = styleConfig.colorBg || DEFAULT_STYLE_CONFIG.colorBg;
        customColors.colorHeadings = styleConfig.colorHeadings;
        customColors.colorBody = styleConfig.colorBody;
        customColors.colorLinks = styleConfig.colorLinks;
        customColors.colorAccent = styleConfig.colorAccent;
        customColors.sidebarBg = styleConfig.sidebarBg || DEFAULT_STYLE_CONFIG.sidebarBg;
        customColors.sidebarText = styleConfig.sidebarText || DEFAULT_STYLE_CONFIG.sidebarText;

        updateControlsFromConfig();

        // Save immediately to localStorage if it wasn't there already
        if (!savedMd) {
            localStorage.setItem('ats_resume_markdown', loadedMarkdown);
            localStorage.setItem('ats_resume_styles', JSON.stringify(styleConfig));
        }

        // Compute default canvas fitting scale on startup
        setTimeout(autoFitZoom, 300);
    }

    function startOpeningFireworks() {
        const canvas = document.createElement('canvas');
        canvas.id = 'opening-fireworks-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '99999';
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
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 5 + 2;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.gravity = 0.06;
                this.friction = 0.98;
                this.alpha = 1;
                this.decay = Math.random() * 0.015 + 0.008;
                this.size = Math.random() * 2.5 + 1;
            }
            update() {
                this.vx *= this.friction;
                this.vy *= this.friction;
                this.vy += this.gravity;
                this.x += this.vx;
                this.y += this.vy;
                this.alpha -= this.decay;
            }
            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.shadowBlur = 8;
                ctx.shadowColor = this.color;
                ctx.fill();
                ctx.restore();
            }
        }

        class Firework {
            constructor() {
                this.x = Math.random() * width;
                this.y = height;
                this.targetY = Math.random() * (height * 0.5) + height * 0.15;
                this.vy = - (Math.random() * 4 + 11);
                this.vx = Math.random() * 2 - 1;
                this.exploded = false;
                // Elegant vibrant colors (purple, teal, emerald, gold, blue, hotpink)
                const colors = ['#7c3aed', '#0d9488', '#10b981', '#fbbf24', '#3b82f6', '#ec4899', '#f43f5e'];
                this.color = colors.at(Math.floor(Math.random() * colors.length));
                this.particles = [];
            }
            update() {
                if (!this.exploded) {
                    this.y += this.vy;
                    this.x += this.vx;
                    this.vy += 0.12; // rocket gravity
                    if (this.vy >= 0 || this.y <= this.targetY) {
                        this.exploded = true;
                        this.explode();
                    }
                } else {
                    for (let i = this.particles.length - 1; i >= 0; i--) {
                        const p = this.particles.at(i);
                        p.update();
                        if (p.alpha <= 0) {
                            this.particles.splice(i, 1);
                        }
                    }
                }
            }
            explode() {
                const count = Math.floor(Math.random() * 40) + 50;
                for (let i = 0; i < count; i++) {
                    this.particles.push(new Particle(this.x, this.y, this.color));
                }
            }
            draw() {
                if (!this.exploded) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = this.color;
                    ctx.fill();
                    ctx.restore();
                } else {
                    for (let p of this.particles) {
                        p.draw();
                    }
                }
            }
        }

        const fireworks = [];
        let animationFrameId;
        let isRunning = true;

        // Launch rocket interval
        let launchInterval = setInterval(() => {
            if (isRunning && fireworks.length < 12) {
                fireworks.push(new Firework());
            }
        }, 320);

        // Pre-launch a few fireworks instantly on load for immediate effect
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                if (isRunning) fireworks.push(new Firework());
            }, i * 200);
        }

        function loop() {
            ctx.clearRect(0, 0, width, height);

            for (let i = fireworks.length - 1; i >= 0; i--) {
                const f = fireworks.at(i);
                f.update();
                f.draw();
                if (f.exploded && f.particles.length === 0) {
                    fireworks.splice(i, 1);
                }
            }

            if (isRunning || fireworks.length > 0) {
                animationFrameId = requestAnimationFrame(loop);
            }
        }

        loop();

        // Stop launching after 3 seconds, fade out and remove canvas after 4 seconds
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
});
