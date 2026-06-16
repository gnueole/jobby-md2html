/**
 * Jobby Markdown Editor - theme.js
 * App Theme toggle handling (Light / Dark / System Auto).
 * Refactored from app.js to modularize the application theme manager.
 */

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

export function applyAppTheme(theme, themeBtnIcon, themeBtnText) {
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

export function initThemeToggle(btnThemeToggle, themeBtnIcon, themeBtnText) {
    let appTheme = localStorage.getItem('app-theme') || 'system';

    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            if (appTheme === 'system') {
                appTheme = 'light';
            } else if (appTheme === 'light') {
                appTheme = 'dark';
            } else {
                appTheme = 'system';
            }
            localStorage.setItem('app-theme', appTheme);
            applyAppTheme(appTheme, themeBtnIcon, themeBtnText);
        });
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (appTheme === 'system') {
            applyAppTheme('system', themeBtnIcon, themeBtnText);
        }
    });

    applyAppTheme(appTheme, themeBtnIcon, themeBtnText);
}
