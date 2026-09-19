# Jobby: AI Context & Historical Handbook

Welcome! This document is designed for AI coding assistants (like Claude Code, Claude, Gemini, or ChatGPT) to quickly bootstrap context when entering this repository. It documents the core philosophy, codebase constraints, historical context, and resolutions to past critical issues.

---

## 🎯 Project Overview & Philosophy

Jobby is a premium Markdown resume editor built to design ATS-compliant, recruiter-ready resumes. It acts as both a local, real-time editor and an HTML/CSS configuration plane for an automated n8n/Notion/Gotenberg PDF rendering stack.

### Core Tenets
1. **Zero-Build Frontend**: All JavaScript in [public/js/](file:///c:/Projects/eole.me/jobby-md2html/public/js/) uses native browser ES Modules. No build steps, bundlers (Webpack, Vite, rollup), or transpilers (Babel) are allowed.
2. **Vanilla CSS Styling**: Spacing, sizing, borders, shadows, and color systems are handled through pure Vanilla CSS, utilizing CSS variables (custom properties) to support real-time slider controls in the Customizer panel.
3. **Dependency-Free Backend**: The Node.js server (`server.js`) uses native Node HTTP modules with zero external npm dependencies. It boots instantly (<50ms) and handles basic file/api routing.

---

## 🏛️ System & Automated Workflows

Jobby is designed to be an automated, AI-assisted resume personalization pipeline:
- **Friendly Scraper Bookmarklet**: Scrapes LinkedIn job requirements and posts details to n8n.
- **Notion CMS**:
  - `Notion Collect Table` (Jobs): Acts as the inbox for scraped listings.
  - `Notion CV DB` (Baseline): Stores Markdown resumes and style configurations.
- **n8n AI Agent Workflow**: Triggers when a new job is added, reads requirements, tailors the resume, adjusts padding/accent keywords, and updates the database.
- **Gotenberg PDF Engine**: Runs headless Chrome in a Docker container to render pixel-perfect, A4-formatted, ATS-compliant PDFs.

*For detailed file structure and schemas, refer to [ARCHITECTURE.md](file:///c:/Projects/eole.me/jobby-md2html/ARCHITECTURE.md).*

---

## 🧠 Historical Context & Hard-Won Lessons

When making edits or adding features, be mindful of the following resolutions to past critical bugs:

### 1. The Print Margins Solution (White Border Fix)
*   **The Problem**: Default browser print margins leave a white border around pages. When using colored sidebars or background gradients, this cuts off colors and breaks the premium aesthetic.
*   **The Resolution**: We set the CSS `@page { margin: 0; }` rule to eliminate default browser printer margins. We then translate print margins into paddings directly inside the `.a4-sheet` class. This allows backgrounds and sidebars to stretch to the absolute edges of the page ("full-bleed").

### 2. Column Grid Row Alignment (Vertical Stacking Fix)
*   **The Problem**: In 2-column mode, toggling sidebar positions or modifying customizer parameters would occasionally cause the columns to stack vertically instead of aligning side-by-side.
*   **The Resolution**: We resolved this by forcing both columns in 2-column mode to occupy the identical CSS Grid row (`grid-row: 1`) inside `public/templates.css`, ensuring CSS Grid does not auto-stack them.

### 3. Decoupled and Debounced Parser (Performance Lag Fix)
*   **The Problem**: Re-rendering the full markdown document, calculating page breaks, and saving to `localStorage` on every single keystroke caused significant typing latency.
*   **The Resolution**: We decoupled editor feedback. The syntax highlighter in the editor runs synchronously on input, but the heavy markdown-to-HTML parser, page-break layout engine, and disk/localStorage saving processes are debounced by 200ms.

### 4. Alert-Free Destructive Actions (UX Overwrite Protection)
*   **The Problem**: Native browser blocking dialogs (like `confirm()` or `alert()`) are intrusive and disrupt flow.
*   **The Resolution**: We replaced all confirmations when loading default samples, restoring drafts, or clearing the editor. Instead, the editor automatically snapshots the current document state and pushes it to the Undo/Redo history stack *before* applying the destructive change. Users can instantly revert any overwrite by pressing `Ctrl + Z`.

### 5. Single Source of Truth for App Version (Manifest Drift Fix)
*   **The Problem**: The app version had to be updated manually in both `package.json` and `public/manifest.json`, leading to sync drift.
*   **The Resolution**: `server.js` intercepts all incoming requests to `/manifest.json` at runtime. It reads `package.json`, dynamically patches the version field into the manifest object, and serves it, keeping `package.json` as the single source of truth.

### 6. Bounded Contact Line (Swallowed Resume Fix)
*   **The Problem**: The `[CONTACT : …]` pattern ran over the whole compiled HTML, up to the next `]` anywhere in the document. One missing bracket pulled the summary, the experience and the projects into the small contact bar (fixed in 1.14.0). The first bound, a single line, then broke a `]` typed on the next line (fixed in 1.14.2).
*   **The Resolution**: A contact line ends at its paragraph or block, and code spans are skipped. An unclosed line stays raw text and is reported (a warning above the preview, an entry in the ATS checklist); Jobby never guesses where it ends. `npm run test:contact`.

### 7. Two Editor Layers That Must Wrap Alike (Caret Drift Fix)
*   **The Problem**: The editor is a transparent `<textarea>` (caret, selection) over a highlighted `<pre>` (what is seen). The `<pre>` hid its scrollbar with `display: none`, which also removed the 6px gutter the textarea kept: at some editor widths a long line wrapped one line earlier under the caret than on screen, and the caret drifted onto lines that looked empty (fixed in 1.14.5).
*   **The Resolution**: The overlay's scrollbar is transparent, not removed. Anything drawn inside the overlay (syntax colours, bracket marks) may change colour, background or underline only, never a glyph's width. The overlay is rendered on every keystroke and again by the debounced compile ~200ms later, which wipes and re-schedules the bracket marks. `npm run test:overlay`.

### 8. Blurred Headers and Their Dropdowns (Unclickable Save Menu Fix)
*   **The Problem**: `.panel-header` carries a `backdrop-filter`, which makes it a stacking context: the `z-index` of its dropdowns only counted inside the header. The Save menu opened behind the editor, clicks on Save, Save As or Open landed in the textarea, and the page format menu had the same defect; only `Ctrl + S` worked (fixed in 1.15.1). A "menu is visible" check passed throughout.
*   **The Resolution**: Panel headers sit above their panel body (`position: relative; z-index: 10`). Menus are tested with real mouse clicks, checking what sits under the pointer. `npm run test:menus`.

### 9. Colours Tuned for One Theme Only (Light Theme Contrast Fix)
*   **The Problem**: Status colours picked for the dark theme (checklist, panel indicators, muted text) measured 1.4 to 3.9:1 on the light one, and the light modals were 70% opaque cards over a near-black overlay (fixed in 1.14.4).
*   **The Resolution**: Per-theme colour tokens and light-theme overrides. `npm run test:contrast` measures every visible text against its composited background, in both themes and in every modal.

### 10. Tests Live in the Repository, and Must Fail First
*   **The Problem**: The checks written for 1.14.0 lived in a scratch directory, did not cover a common gesture, and the regression shipped (1.14.2).
*   **The Resolution**: Every fix ships with a `toolkit/test_*.js` script and an `npm run test:*` entry, run once against the version it fixes to prove it catches the bug.

---

## 🤖 Instructions for AI Assistants

- **Do Not Add npm Dependencies**: Keep backend `server.js` dependency-free.
- **Maintain Testability Selectors**: Do not alter or remove element `id` attributes or `data-i18n` bindings unless specifically instructed; these are used for automated test suites.
- **Respect i18n Boundaries**: Localization is handled in `public/js/i18n.js` and loaded dynamically from `/locales/*.json`. Do not hardcode user-facing strings in HTML; use translation keys (`data-i18n="key"`).
- **Refer to Ecosystem Rules**: General ecosystem rules are maintained at the parent level in `../.agents/AGENTS.md`. Do not duplicate them here.
- **Update Changelog**: When implementing features or bug fixes, record version changes inside [CHANGELOG.md](file:///c:/Projects/eole.me/jobby-md2html/CHANGELOG.md).
- **Test Before Pushing**: Run `npm run lint`, `npm run validate:i18n` and the `npm run test:*` browser tests against `npm run dev`. A new test must fail on the version it fixes.
- **Preserve Line Endings**: `public/app.js`, `public/locales/*.json` and `package-lock.json` are committed with CRLF. Scripted rewrites must keep them (in Python, open with `newline=''`); a whole-file `git diff --stat` means they were lost.
- **Naming**: This repository is JME (Jobby MD Editor). "Jobby" alone refers to the LinkedIn → n8n → Notion pipeline.
