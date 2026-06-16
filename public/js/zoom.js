/**
 * Jobby Markdown Editor - zoom.js
 * Zoom adjustments and canvas sizing auto-fit.
 * Refactored from app.js to modularize layout zoom/scaling controls.
 */

let zoomFactor = 1.0;
let isUserZoomed = false;

export function getZoomFactor() {
    return zoomFactor;
}

export function getIsUserZoomed() {
    return isUserZoomed;
}

export function setIsUserZoomed(val) {
    isUserZoomed = val;
}

export function autoFitZoom(canvasWrapper, previewCanvas, zoomLevelText, updatePageBreaks) {
    if (isUserZoomed) return;
    if (!canvasWrapper) return;

    const wrapperWidth = canvasWrapper.clientWidth - 60;
    const sheetWidth = 794;

    if (wrapperWidth < sheetWidth) {
        zoomFactor = wrapperWidth / sheetWidth;
    } else {
        zoomFactor = 1.0;
    }

    updateZoomDisplay(previewCanvas, zoomLevelText);
    if (updatePageBreaks) updatePageBreaks();

    const centerScroll = () => {
        canvasWrapper.scrollLeft = (canvasWrapper.scrollWidth - canvasWrapper.clientWidth) / 2;
        canvasWrapper.scrollTop = 0;
    };
    centerScroll();
    setTimeout(centerScroll, 50);
}

export function updateZoomDisplay(previewCanvas, zoomLevelText) {
    if (previewCanvas) {
        previewCanvas.style.setProperty('--zoom-factor', zoomFactor);
    }
    if (zoomLevelText) {
        zoomLevelText.textContent = `${Math.round(zoomFactor * 100)}%`;
    }
}

export function initZoom({
    zoomInBtn,
    zoomOutBtn,
    zoomResetBtn,
    zoomLevelText,
    previewCanvas,
    canvasWrapper,
    updatePageBreaks
}) {
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            isUserZoomed = true;
            if (zoomFactor < 1.8) {
                zoomFactor += 0.1;
                updateZoomDisplay(previewCanvas, zoomLevelText);
            }
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            isUserZoomed = true;
            if (zoomFactor > 0.4) {
                zoomFactor -= 0.1;
                updateZoomDisplay(previewCanvas, zoomLevelText);
            }
        });
    }

    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', () => {
            isUserZoomed = false;
            autoFitZoom(canvasWrapper, previewCanvas, zoomLevelText, updatePageBreaks);
        });
    }

    if (zoomLevelText) {
        zoomLevelText.addEventListener('dblclick', () => {
            isUserZoomed = false;
            autoFitZoom(canvasWrapper, previewCanvas, zoomLevelText, updatePageBreaks);
        });
    }

    window.addEventListener('resize', () => {
        autoFitZoom(canvasWrapper, previewCanvas, zoomLevelText, updatePageBreaks);
    });
}
