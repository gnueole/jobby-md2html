/**
 * Jobby Markdown Editor - panning.js
 * Preview canvas click-and-drag panning.
 */

export function initPanning(canvasWrapper, btnPanToggle) {
    if (!btnPanToggle || !canvasWrapper) return;

    let isPanMode = true; // Enabled by default
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;

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
