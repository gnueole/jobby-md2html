/**
 * Jobby Markdown Editor - config.js
 * Default style configuration and constants.
 */

// --- Default Configurations ---
export const DEFAULT_STYLE_CONFIG = {
    showVersion: false,
    fontFamily: "'Raleway', 'Inter', sans-serif",
    fontSize: "14",
    lineHeight: "1.45",
    headingScale: "1.6",
    marginX: "30",
    marginY: "25",
    sectionSpacing: "12",
    colorBg: "#ffffff",
    colorHeadings: "#0f172a",
    colorBody: "#334155",
    colorLinks: "#2563eb",
    colorAccent: "#0ea5e9",
    layoutMode: "1-column",
    sidebarBg: "#0f172a",
    sidebarText: "#ffffff",
    sidebarPosition: "right",
    sidebarSections: "EDUCATION,TECHNICAL SKILLS",
    cosmeticShadow: true,
    cosmeticBorder: false,
    cosmeticGradient: false,
    columnSplit: 58,
    columnFontSize: "normal",
    columnFontStyle: "inherit",
    expertMode: false,
    columnShadowDistance: 10,
    columnShadowColor: "#000000",
    columnGradientLength: 150,
    columnGradientColor: "#70aef0",
    columnBorderWidth: 2,
    columnBorderOpacity: 100,
    activePreset: "clean-blue"
};

// SVG Icons for the ATS Checklist
export const ICONS = {
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-top:2px; flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-top:2px; flex-shrink:0;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-top:2px; flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
};
