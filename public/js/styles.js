export function applyStyles(styleConfig) {
    const resumeOutput = document.getElementById('resume-output');
    if (!resumeOutput) return;

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
    const presetCustom = document.getElementById('preset-custom');

    if (!presetClassicNb || !presetDarkMode || !presetCleanBlue || !presetCustom) return;

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

    applyStyles(styleConfig);
}

