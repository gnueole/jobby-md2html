/**
 * Jobby Markdown Editor - styles.js
 * Dynamic CSS rules and customization controls.
 */

export function applyStyles(styleConfig) {
    const resumeOutput = document.getElementById('resume-output');
    if (!resumeOutput) return;

    // Update body classes for print layout gradients
    document.body.classList.remove('layout-2-column', 'sidebar-left', 'sidebar-right');
    if (styleConfig.layoutMode === '2-column') {
        document.body.classList.add('layout-2-column');
        if (styleConfig.sidebarPosition === 'left') {
            document.body.classList.add('sidebar-left');
        } else {
            document.body.classList.add('sidebar-right');
        }
    }

    // Apply cosmetic classes
    if (styleConfig.cosmeticShadow !== false) {
        resumeOutput.classList.add('has-shadow');
    } else {
        resumeOutput.classList.remove('has-shadow');
    }

    if (styleConfig.cosmeticBorder) {
        resumeOutput.classList.add('has-border');
    } else {
        resumeOutput.classList.remove('has-border');
    }

    if (styleConfig.cosmeticGradient) {
        resumeOutput.classList.add('has-gradient');
    } else {
        resumeOutput.classList.remove('has-gradient');
    }


    // Update button group toggles active state
    const syncGroup = (groupId, val) => {
        const group = document.getElementById(groupId);
        if (!group) return;
        const buttons = group.querySelectorAll('.toggle-btn');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-value') === val) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    };
    syncGroup('layout-mode-group', styleConfig.layoutMode || '1-column');
    syncGroup('sidebar-position-group', styleConfig.sidebarPosition || 'right');
    syncGroup('column-font-size-group', styleConfig.columnFontSize || 'normal');
    syncGroup('column-font-style-group', styleConfig.columnFontStyle || 'inherit');

    resumeOutput.style.setProperty('--resume-font-family', styleConfig.fontFamily);
    resumeOutput.style.setProperty('--resume-font-size', styleConfig.fontSize + 'px');
    resumeOutput.style.setProperty('--resume-line-height', styleConfig.lineHeight);
    resumeOutput.style.setProperty('--resume-heading-scale', styleConfig.headingScale);
    resumeOutput.style.setProperty('--resume-margin-x', styleConfig.marginX + 'px');
    resumeOutput.style.setProperty('--resume-margin-y', styleConfig.marginY + 'px');
    resumeOutput.style.setProperty('--resume-section-spacing', styleConfig.sectionSpacing + 'px');

    resumeOutput.style.setProperty('--resume-color-bg', styleConfig.colorBg || '#ffffff');
    resumeOutput.style.setProperty('--resume-color-headings', styleConfig.colorHeadings);
    resumeOutput.style.setProperty('--resume-color-body', styleConfig.colorBody);
    resumeOutput.style.setProperty('--resume-color-links', styleConfig.colorLinks);
    resumeOutput.style.setProperty('--resume-color-accent', styleConfig.colorAccent);

    resumeOutput.style.setProperty('--resume-sidebar-bg', styleConfig.sidebarBg || '#2d3748');
    resumeOutput.style.setProperty('--resume-sidebar-text', styleConfig.sidebarText || '#ffffff');

    // Dynamic Column and Cosmetic Styling Variables
    resumeOutput.style.setProperty('--column-split-main', (styleConfig.columnSplit || 58) + '%');
    resumeOutput.style.setProperty('--column-split-sidebar', (100 - (styleConfig.columnSplit || 58)) + '%');
    resumeOutput.style.setProperty('--column-shadow-distance', (styleConfig.columnShadowDistance || 10) + 'px');
    resumeOutput.style.setProperty('--column-shadow-color', styleConfig.columnShadowColor || '#000000');
    resumeOutput.style.setProperty('--column-gradient-length', (styleConfig.columnGradientLength || 150) + '%');
    resumeOutput.style.setProperty('--column-gradient-color', styleConfig.columnGradientColor || '#000000');
    resumeOutput.style.setProperty('--column-border-width', (styleConfig.columnBorderWidth || 2) + 'px');
    resumeOutput.style.setProperty('--column-border-opacity', (styleConfig.columnBorderOpacity || 100) + '%');

    // Apply Live Column Classes
    const sidebarCol = resumeOutput.querySelector('.resume-sidebar-col');
    if (sidebarCol) {
        if (styleConfig.columnFontSize === 'smaller') {
            sidebarCol.classList.add('column-font-smaller');
        } else {
            sidebarCol.classList.remove('column-font-smaller');
        }
        if (styleConfig.columnFontStyle === 'alternative') {
            sidebarCol.classList.add('column-font-alternative');
        } else {
            sidebarCol.classList.remove('column-font-alternative');
        }
    }

    // Update page standard locked/unlocked state
    const btnPageFormat = document.getElementById('btn-page-format');
    if (btnPageFormat) {
        if (!styleConfig.expertMode) {
            btnPageFormat.classList.add('locked');
            btnPageFormat.setAttribute('title', 'Choose Page Format (Locked to A4 - Requires Expert Mode)');
        } else {
            btnPageFormat.classList.remove('locked');
            btnPageFormat.setAttribute('title', 'Choose Page Format');
        }
    }

    // Update dynamic print margins style
    let printPageStyle = document.getElementById('print-page-style');
    if (!printPageStyle) {
        printPageStyle = document.createElement('style');
        printPageStyle.id = 'print-page-style';
        document.head.appendChild(printPageStyle);
    }
    const selectPageFormat = document.getElementById('select-page-format');
    const format = styleConfig.pageFormat || (selectPageFormat ? selectPageFormat.value : 'A4');
    
    // Apply sheet classes
    resumeOutput.classList.remove('format-a4', 'format-letter', 'format-legal', 'format-a5', 'letter-format');
    const formatClasses = {
        'letter': ['letter-format', 'format-letter'],
        'legal': ['format-legal'],
        'a5': ['format-a5']
    };
    const classesToAdd = formatClasses[format] || ['format-a4'];
    resumeOutput.classList.add(...classesToAdd);

    // Update active class in dropdown options
    const formatOptions = document.querySelectorAll('.format-option');
    formatOptions.forEach(opt => {
        if (opt.getAttribute('data-value') === format) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });

    const pageSizes = {
        'letter': 'letter',
        'legal': 'legal',
        'a5': 'A5'
    };
    const pageSize = pageSizes[format] || 'A4';
    const formatWidths = {
        'letter': '8.5in',
        'legal': '8.5in',
        'a5': '148mm'
    };
    const pageWidth = formatWidths[format] || '210mm';

    printPageStyle.textContent = `
        @media print {
            @page {
                size: ${pageSize} portrait;
                margin: 0 !important;
            }
            html, body {
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .a4-sheet.format-a4,
            .a4-sheet {
                width: 210mm !important;
            }
            .a4-sheet.format-letter,
            .a4-sheet.letter-format {
                width: 8.5in !important;
            }
            .a4-sheet.format-legal {
                width: 8.5in !important;
            }
            .a4-sheet.format-a5 {
                width: 148mm !important;
            }
            .a4-sheet.format-a4,
            .a4-sheet.format-letter,
            .a4-sheet.letter-format,
            .a4-sheet.format-legal,
            .a4-sheet.format-a5,
            .a4-sheet {
                padding-top: ${styleConfig.marginY}px !important;
                padding-bottom: ${styleConfig.marginY}px !important;
                padding-left: ${styleConfig.marginX}px !important;
                padding-right: ${styleConfig.marginX}px !important;
                box-shadow: none !important;
                border-radius: 0 !important;
            }
        }
    `;

    // Update Slider Labels
    const valFontSize = document.getElementById('val-font-size');
    const valLineHeight = document.getElementById('val-line-height');
    const valHeadingScale = document.getElementById('val-heading-scale');
    const valMarginX = document.getElementById('val-margin-x');
    const valMarginY = document.getElementById('val-margin-y');
    const valSectionSpacing = document.getElementById('val-section-spacing');

    if (valFontSize) valFontSize.textContent = styleConfig.fontSize + 'px';
    if (valLineHeight) valLineHeight.textContent = styleConfig.lineHeight;
    if (valHeadingScale) valHeadingScale.textContent = styleConfig.headingScale;
    if (valMarginX) valMarginX.textContent = styleConfig.marginX + 'px';
    if (valMarginY) valMarginY.textContent = styleConfig.marginY + 'px';
    if (valSectionSpacing) valSectionSpacing.textContent = styleConfig.sectionSpacing + 'px';

    // Update expert mode slider labels and visuals
    const valColShadow = document.getElementById('val-column-shadow');
    if (valColShadow) valColShadow.textContent = (styleConfig.columnShadowDistance || 10) + 'px';

    const valShadowColor = document.getElementById('val-column-shadow-color');
    if (valShadowColor) valShadowColor.textContent = styleConfig.columnShadowColor || '#000000';

    const valColGradient = document.getElementById('val-column-gradient');
    if (valColGradient) valColGradient.textContent = (styleConfig.columnGradientLength || 150) + '%';

    const valGradientColor = document.getElementById('val-column-gradient-color');
    if (valGradientColor) valGradientColor.textContent = styleConfig.columnGradientColor || '#000000';

    const valBorderWidth = document.getElementById('val-column-border-width');
    if (valBorderWidth) valBorderWidth.textContent = (styleConfig.columnBorderWidth || 2) + 'px';

    const valBorderOpacity = document.getElementById('val-column-border-opacity');
    if (valBorderOpacity) valBorderOpacity.textContent = (styleConfig.columnBorderOpacity || 100) + '%';

    const splitMainPct = document.getElementById('split-main-pct');
    const splitSidebarPct = document.getElementById('split-sidebar-pct');
    const splitMainVisual = document.getElementById('split-main-visual');
    const splitSidebarVisual = document.getElementById('split-sidebar-visual');

    const splitVal = styleConfig.columnSplit || 58;
    const isLeft = (styleConfig.sidebarPosition === 'left');
    const uiSliderVal = isLeft ? (100 - splitVal) : splitVal;

    const columnSplitSlider = document.getElementById('column-split');
    if (columnSplitSlider) {
        columnSplitSlider.value = uiSliderVal;
    }

    if (isLeft) {
        if (splitMainVisual) {
            splitMainVisual.style.width = (100 - splitVal) + '%';
            const nameEl = splitMainVisual.querySelector('.col-name');
            if (nameEl) nameEl.textContent = "Sidebar";
            if (splitMainPct) splitMainPct.textContent = (100 - splitVal) + '%';
        }
        if (splitSidebarVisual) {
            splitSidebarVisual.style.width = splitVal + '%';
            const nameEl = splitSidebarVisual.querySelector('.col-name');
            if (nameEl) nameEl.textContent = "Main";
            if (splitSidebarPct) splitSidebarPct.textContent = splitVal + '%';
        }
    } else {
        if (splitMainVisual) {
            splitMainVisual.style.width = splitVal + '%';
            const nameEl = splitMainVisual.querySelector('.col-name');
            if (nameEl) nameEl.textContent = "Main";
            if (splitMainPct) splitMainPct.textContent = splitVal + '%';
        }
        if (splitSidebarVisual) {
            splitSidebarVisual.style.width = (100 - splitVal) + '%';
            const nameEl = splitSidebarVisual.querySelector('.col-name');
            if (nameEl) nameEl.textContent = "Sidebar";
            if (splitSidebarPct) splitSidebarPct.textContent = (100 - splitVal) + '%';
        }
    }

    // Update active class on cosmetic-group elements to collapse/expand details
    const shadowGroup = document.getElementById('group-cosmetic-shadow');
    if (shadowGroup) {
        if (styleConfig.cosmeticShadow !== false) {
            shadowGroup.classList.add('active');
        } else {
            shadowGroup.classList.remove('active');
        }
    }
    const borderGroup = document.getElementById('group-cosmetic-border');
    if (borderGroup) {
        if (styleConfig.cosmeticBorder) {
            borderGroup.classList.add('active');
        } else {
            borderGroup.classList.remove('active');
        }
    }
    const gradientGroup = document.getElementById('group-cosmetic-gradient');
    if (gradientGroup) {
        if (styleConfig.cosmeticGradient) {
            gradientGroup.classList.add('active');
        } else {
            gradientGroup.classList.remove('active');
        }
    }

    // Update Hex Texts
    const hexBg = document.getElementById('hex-bg');
    const hexHeadings = document.getElementById('hex-headings');
    const hexBody = document.getElementById('hex-body');
    const hexLinks = document.getElementById('hex-links');
    const hexAccent = document.getElementById('hex-accent');
    const hexSidebarBg = document.getElementById('hex-sidebar-bg');
    const hexSidebarText = document.getElementById('hex-sidebar-text');

    if (hexBg) hexBg.textContent = styleConfig.colorBg || '#ffffff';
    if (hexHeadings) hexHeadings.textContent = styleConfig.colorHeadings;
    if (hexBody) hexBody.textContent = styleConfig.colorBody;
    if (hexLinks) hexLinks.textContent = styleConfig.colorLinks;
    if (hexAccent) hexAccent.textContent = styleConfig.colorAccent;
    if (hexSidebarBg) hexSidebarBg.textContent = styleConfig.sidebarBg || '#2d3748';
    if (hexSidebarText) hexSidebarText.textContent = styleConfig.sidebarText || '#ffffff';

    // Show/hide sidebar only controls
    const sidebarOnlyControls = document.getElementById('sidebar-only-controls');
    if (sidebarOnlyControls) {
        if (styleConfig.layoutMode === '2-column') {
            sidebarOnlyControls.style.display = 'block';
        } else {
            sidebarOnlyControls.style.display = 'none';
        }
    }

    // Active font tile
    const fontTiles = document.querySelectorAll('.font-tile');
    fontTiles.forEach(tile => {
        if (tile.getAttribute('data-font') === styleConfig.fontFamily) {
            tile.classList.add('active');
        } else {
            tile.classList.remove('active');
        }
    });

    // Active preset button
    updateActivePresetBtn(styleConfig);
}

export function updateActivePresetBtn(styleConfig) {
    const presetClassicNb = document.getElementById('preset-classic-nb');
    const presetDarkMode = document.getElementById('preset-dark-mode');
    const presetCleanBlue = document.getElementById('preset-clean-blue');
    const presetSoftBlue = document.getElementById('preset-soft-blue');
    const presetGreen = document.getElementById('preset-green');
    const presetSoftRed = document.getElementById('preset-soft-red');
    const presetCustom1 = document.getElementById('preset-custom-1');
    const presetCustom2 = document.getElementById('preset-custom-2');

    if (!presetClassicNb || !presetDarkMode || !presetCleanBlue) return;

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

    Object.values(presetButtons).forEach(btn => {
        if (btn) btn.classList.remove('active');
    });

    if (styleConfig.activePreset) {
        const btn = presetButtons[styleConfig.activePreset];
        if (btn) {
            btn.classList.add('active');
            return;
        }
    }

    const bg = (styleConfig.colorBg || '#ffffff').toLowerCase();
    const headings = styleConfig.colorHeadings.toLowerCase();
    const body = styleConfig.colorBody.toLowerCase();
    const links = styleConfig.colorLinks.toLowerCase();
    const accent = styleConfig.colorAccent.toLowerCase();
    const sidebarBg = (styleConfig.sidebarBg || '#2d3748').toLowerCase();
    const sidebarText = (styleConfig.sidebarText || '#ffffff').toLowerCase();

    if (bg === '#ffffff' && headings === '#000000' &&
        body === '#000000' && links === '#000000' &&
        accent === '#000000' && sidebarBg === '#ffffff' &&
        sidebarText === '#000000') {
        presetClassicNb.classList.add('active');
    } else if (bg === '#0f172a' && headings === '#f8fafc' &&
        body === '#cbd5e1' && links === '#38bdf8' &&
        accent === '#34d399' && sidebarBg === '#1e293b' &&
        sidebarText === '#cbd5e1') {
        presetDarkMode.classList.add('active');
    } else if (bg === '#ffffff' && headings === '#0f172a' &&
        body === '#334155' && links === '#2563eb' &&
        accent === '#0ea5e9' && sidebarBg === '#0f172a' &&
        sidebarText === '#ffffff') {
        presetCleanBlue.classList.add('active');
    } else if (bg === '#f8fafc' && headings === '#1e40af' &&
        body === '#475569' && links === '#2563eb' &&
        accent === '#3b82f6' && sidebarBg === '#e0f2fe' &&
        sidebarText === '#0369a1') {
        if (presetSoftBlue) presetSoftBlue.classList.add('active');
    } else if (bg === '#fcfdfc' && headings === '#166534' &&
        body === '#374151' && links === '#15803d' &&
        accent === '#4ade80' && sidebarBg === '#dcfce7' &&
        sidebarText === '#166534') {
        if (presetGreen) presetGreen.classList.add('active');
    } else if (bg === '#ffffff' && headings === '#7f1d1d' &&
        body === '#374151' && links === '#dc2626' &&
        accent === '#f87171' && sidebarBg === '#fee2e2' &&
        sidebarText === '#991b1b') {
        if (presetSoftRed) presetSoftRed.classList.add('active');
    }
}

export function updateControlsFromConfig(styleConfig) {
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

    if (fontSizeSlider) fontSizeSlider.value = styleConfig.fontSize;
    if (lineHeightSlider) lineHeightSlider.value = styleConfig.lineHeight;
    if (headingScaleSlider) headingScaleSlider.value = styleConfig.headingScale;
    if (marginXSlider) marginXSlider.value = styleConfig.marginX;
    if (marginYSlider) marginYSlider.value = styleConfig.marginY;
    if (sectionSpacingSlider) sectionSpacingSlider.value = styleConfig.sectionSpacing;

    if (layoutModeSelect) layoutModeSelect.value = styleConfig.layoutMode || "1-column";
    if (sidebarPositionSelect) sidebarPositionSelect.value = styleConfig.sidebarPosition || "right";
    if (colorSidebarBg) colorSidebarBg.value = styleConfig.sidebarBg || "#2d3748";
    if (colorSidebarText) colorSidebarText.value = styleConfig.sidebarText || "#ffffff";

    if (colorBg) colorBg.value = styleConfig.colorBg || "#ffffff";
    if (colorHeadings) colorHeadings.value = styleConfig.colorHeadings;
    if (colorBody) colorBody.value = styleConfig.colorBody;
    if (colorLinks) colorLinks.value = styleConfig.colorLinks;
    if (colorAccent) colorAccent.value = styleConfig.colorAccent;

    const cosmeticShadow = document.getElementById('cosmetic-shadow');
    const cosmeticBorder = document.getElementById('cosmetic-border');
    const cosmeticGradient = document.getElementById('cosmetic-gradient');
    const showVersion = document.getElementById('show-version');

    if (cosmeticShadow) cosmeticShadow.checked = styleConfig.cosmeticShadow !== false;
    if (cosmeticBorder) cosmeticBorder.checked = !!styleConfig.cosmeticBorder;
    if (cosmeticGradient) cosmeticGradient.checked = !!styleConfig.cosmeticGradient;
    if (showVersion) showVersion.checked = !!styleConfig.showVersion;

    // Expert Mode sync
    const advancedModeToggle = document.getElementById('advanced-mode-toggle');
    if (advancedModeToggle) {
        advancedModeToggle.checked = !!styleConfig.expertMode;
        if (styleConfig.expertMode) {
            document.body.classList.add('expert-mode-active');
        } else {
            document.body.classList.remove('expert-mode-active');
        }
    }

    const columnSplitSlider = document.getElementById('column-split');
    if (columnSplitSlider) {
        const isLeft = (styleConfig.sidebarPosition === 'left');
        columnSplitSlider.value = isLeft ? (100 - (styleConfig.columnSplit || 58)) : (styleConfig.columnSplit || 58);
    }

    const columnShadowDistanceSlider = document.getElementById('column-shadow-distance');
    if (columnShadowDistanceSlider) columnShadowDistanceSlider.value = styleConfig.columnShadowDistance || 10;

    const columnShadowColorPicker = document.getElementById('column-shadow-color');
    if (columnShadowColorPicker) columnShadowColorPicker.value = styleConfig.columnShadowColor || '#000000';

    const columnGradientLengthSlider = document.getElementById('column-gradient-length');
    if (columnGradientLengthSlider) columnGradientLengthSlider.value = styleConfig.columnGradientLength || 150;

    const columnGradientColorPicker = document.getElementById('column-gradient-color');
    if (columnGradientColorPicker) columnGradientColorPicker.value = styleConfig.columnGradientColor || '#000000';

    const columnBorderWidthSlider = document.getElementById('column-border-width');
    if (columnBorderWidthSlider) columnBorderWidthSlider.value = styleConfig.columnBorderWidth || 2;

    const columnBorderOpacitySlider = document.getElementById('column-border-opacity');
    if (columnBorderOpacitySlider) columnBorderOpacitySlider.value = styleConfig.columnBorderOpacity || 100;

    applyStyles(styleConfig);
}

