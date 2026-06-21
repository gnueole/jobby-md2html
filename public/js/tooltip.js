/**
 * Jobby Markdown Editor - tooltip.js
 * Premium, lightweight, global tooltip engine.
 * Replaces native browser tooltips with styled glassmorphism tooltips.
 */

let tooltipEl = null;

/**
 * Initialize the global tooltip engine.
 */
export function initTooltips() {
    // Create the global tooltip element if it doesn't exist
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'jobby-tooltip';
        tooltipEl.className = 'jobby-tooltip';
        document.body.appendChild(tooltipEl);
    }

    // Use event delegation on document body to handle dynamically loaded elements (bricks)
    document.body.addEventListener('mouseover', handleMouseOver, true);
    document.body.addEventListener('mouseout', handleMouseOut, true);
}

function handleMouseOver(e) {
    // Find closest element with a title attribute or data-tooltip
    const target = e.target.closest('[title], [data-tooltip]');
    if (!target) return;

    // Suppress browser default tooltip
    let tooltipText = target.getAttribute('data-tooltip');
    if (!tooltipText) {
        tooltipText = target.getAttribute('title');
        if (!tooltipText) return;
        target.setAttribute('data-tooltip', tooltipText);
        target.removeAttribute('title'); // Prevents browser native tooltip
    }

    // Set text and show tooltip
    tooltipEl.textContent = tooltipText;
    tooltipEl.classList.add('show');

    // Position tooltip
    positionTooltip(target);
}

function handleMouseOut(e) {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;

    // Restore title attribute if needed for accessibility (screen readers)
    const text = target.getAttribute('data-tooltip');
    if (text) {
        target.setAttribute('title', text);
    }

    tooltipEl.classList.remove('show');
}

function positionTooltip(target) {
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();

    // Default positioning: above the element
    let top = targetRect.top - tooltipRect.height - 8;
    let left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;

    // Fallback: if not enough space above, position below the element
    if (top < 8) {
        top = targetRect.bottom + 8;
    }

    // Viewport boundaries check (left and right)
    const viewportWidth = window.innerWidth;
    const margin = 8;

    if (left < margin) {
        left = margin;
    } else if (left + tooltipRect.width > viewportWidth - margin) {
        left = viewportWidth - tooltipRect.width - margin;
    }

    // Apply computed positioning (adding scroll offset since parent is body)
    tooltipEl.style.top = `${top + window.scrollY}px`;
    tooltipEl.style.left = `${left + window.scrollX}px`;
}
