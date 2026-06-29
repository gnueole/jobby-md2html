# Changelog

*Author: Julien (Éole) Avarre (<hi@eole.me>)*


All notable changes to the Jobby project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.7] - 2026-06-29

### Added
- **Split column layout for Developer Tools:** Reorganized the Developer Tools modal by widening the card and placing Webhooks and Notion Database Mappings in side-by-side columns.
- **Unified input styling:** Styled active/test webhook URL and security token inputs to match the monospace font layout of database IDs.

### Fixed
- **n8n parallel branch path error:** Changed n8n database lookup connections layout from parallel to sequential series, resolving the NodeOperationError ("No path back to referenced node") on Get CV data.

## [1.10.6] - 2026-06-29

### Added
- **Dynamic Atomic CV & Seeds configuration:** Added support for dynamic Notion Database ID variables for both Atomic CV and CV Seeds, bypassing n8n sandboxing environment restrictions in production.
- **Terminal Sync Commands:** Introduced `make n8n-dbs-push`, `make n8n-dbs-pull`, and `make n8n-dbs-list` commands to easily sync and compare Doppler config with n8n tables side-by-side (with ANSI color highlight warnings).
- **Auto-Formatted Database IDs:** Pasting or loading a 32-character hex database ID now automatically segments it with hyphens into standard UUID layout.

### Changed
- **Developer modal input styling:** Increased label font size to 13px, and set inputs to a smaller, less white monospace font layout to enhance legibility.

## [1.10.5] - 2026-06-29

### Added
- **Developer Tools SPA Routing:** Added support for a direct `/developer` URL path that auto-launches the Developer Tools panel.
- **Dynamic Notion Database UIDs:** Migrated all Notion Database UIDs to a dynamic n8n Data Table system, configurable directly from the Developer Tools UI.
- **Local Telemetry Bypass Flag:** Added a checkbox setting inside the Developer Tools modal to easily disable telemetry during development or local testing.

### Fixed
- **Color Swatch contrast borders:** Added 35% neutral gray borders to customizer color picker swatches, preventing them from blending invisibly on light/dark backgrounds.

## [1.10.4] - 2026-06-25

### Added
- **Direct Gotenberg PDF Download:** Implemented a direct PDF generation and download pipeline powered by Gotenberg, resolving print background and layout mismatch issues.
- **Editor Font Size Controls:** Added controls in the editor panel to dynamically adjust editor text font size.
- **Dynamic Dropdowns & Tooltips Position:** Implemented auto-adjusting drop-downs and tooltip popups to prevent screen boundary overflows.
- **Docker Image Version Querying:** Configured the deployment system to query and log pulled Docker image versions dynamically during VPS target deployment.
- **Multi-Language Synced Locales:** Fully updated translation assets, printing options, custom styles, and layouts across all 7 supported language files.
- **Workflow Tagging and Conventions in n8n:** Sanitized Notion database IDs, renamed workflows to follow standard naming conventions, and tagged all workflows with the `jobby` identifier.

### Fixed
- **Gotenberg Print Backgrounds:** Resolved layout mismatch bugs when rendering PDF files using Gotenberg.
- **n8n Public API Constraints:** Bypassed tags and active status read-only constraints in the public API when synchronizing workflow configurations, and added documentation for tag API limitations.
- **VPS Deployment Conflicting Names:** Configured deployment script to automatically remove conflicting Docker container names before restarting services.
- **Routing Mismatches:** Resolved `DOMAIN_NAME` mismatch issues for Jobby routing by introducing `ROOT_DOMAIN` fallback logic.

## [1.10.1] - 2026-06-21

### Added
- **Shareable Tutorial Routes:** Enabled direct routing to `/tutorial` and `/tutorial/` paths that automatically launch the interactive typewriter tutorial popup.
- **Dynamic Server-Side SEO:** Configured the backend Node server to dynamically generate and inject tailored SEO metadata tags (custom page title, canonical link, meta description, and social OpenGraph tags) when serving the `/tutorial` path.
- **Client-Side Navigation & Back Button State:** Implemented smooth history state pushing and popping using `history.pushState` on tutorial mount/exit and registered `popstate` event listeners to close the tutorial overlay automatically when using browser back-button navigation.
- **Responsive A4 Tutorial Sizing:** Added custom CSS media queries and height-bounding rules inside the tutorial styles to prevent modal scrolling on mobile devices and narrow viewports.
- **Locale Replication & Multi-Language Support:** Synchronized exact bold (`**`) Markdown syntax details across all newly added locale translation files (`fr.json`, `de.json`, `es.json`, `it.json`, `cs.json`, `ro.json`).
- **Expanded Design panel width:** Widened the `.controls-panel` container by 20px (width 340px, min-width 320px) to provide comfortable spacing for advanced layout options.
- **Client-side HTML Sanitization (XSS Mitigation):** Integrated **DOMPurify** to sanitize compiled Markdown HTML output before DOM injection, securing the app against XSS vulnerabilities while preserving the vital `data-token-index` sync attribute.
- **Advanced Telemetry Triggers:** Added telemetry tracking events for opening the About Modal (`'About Open'`), Help Modal (`'Help Open'`), and tutorial interactions (starting, exit, `'Tutorial Complete'`, and `'Tutorial Replay'`).

### Fixed
- **Help Link in About Modal:** Resolved a bug where the "Help Guide & Markdown Syntax" link inside the About Modal was broken after language translation by using event delegation.
- **Refined About Modal Design:** Cleaned up header layout emojis, expanded About modal width, and eliminated unwanted vertical scrollbars.

## [1.10.0] - 2026-06-21

### Added
- **Subtle Header Gradient Top Line:** Added an elegant, subtle animated gradient bar (2.5px height) at the top of the header, dynamically shifting between indigo, violet, and pink for a premium aesthetic.
- **Icon-Only Theme Toggle:** Simplified the theme toggle button in the header by removing text labels, making it completely visual.
- **Auto Theme Icon:** Implemented the classic contrast/split circle icon (`lucide-contrast`) for the system `auto` theme.
- **Localized Sample Resumes:** Created individual sample resume templates for all 5 new languages (`sample.cs.md`, `sample.es.md`, `sample.it.md`, `sample.de.md`, `sample.ro.md`) and wired the editor to load them dynamically based on the current active locale.
- **Dark Mode Option List Readability:** Added custom styling to style option elements inside `#select-lang` to prevent white text rendering over white background in dark mode dropdown list.

## [1.9.3] - 2026-06-21

### Added
- **Multi-Language Support (i18n):** Added support for 5 new languages: Czech (`cs`), Spanish (`es`), Italian (`it`), German (`de`), and Romanian (`ro`). Created matching translation files under `public/locales/` and updated the header dropdown selection menu.
- **Axiom Docker Dashboard Upgrades:** Updated APL query configurations for the `n8n` dashboard (`63794d3a-2e77-47e8-af4f-fd6cd662620c`) to support unstructured log formats across all docker project containers (`jobby-editor`, `gotenberg`, `n8n-server`, `traefik-n8n`), showing log volumes, error logs, and stream distribution.
- **Persistent Telemetry and Privacy:** Added persistent session ID in local storage and updated the GDPR privacy disclosures in the About modal.

### Changed
- **Code Refactoring:** Refactored `syncStyleConfigFromUI` and `handlePresetRename` in `public/app.js` using Javascript object maps for cleaner and more maintainable control mappings instead of cascade `if` statements.

## [1.9.2] - 2026-06-21

### Added
- **Non-Intrusive Dynamic Toaster:** Replaced the single static bottom-center toast notification element with a dynamic, bottom-right stacking `#toast-container` wrapper. Notifications are appended as separate cards, supporting multiple simultaneous messages, automatic classification (Success, Error, Warning, Info) with custom icons and left-border indicators based on text content, and manual close buttons (`×`).
- **Refined Vertical Sweep Icon:** Integrated a new vertical broom icon design for the clear button (`#btn-clear`) featuring a centered handle, collar, geometric sweep brush outline, bristle texture slits, and dual sparkles, optimized for clean vector rendering.

### Changed
- **Page Format Alert:** Migrated the manual DOM manipulation for page format warning alerts in `public/js/print.js` to use the unified `showToast` utility.

## [1.9.1] - 2026-06-20

### Added
- **Advanced Telemetry Metrics:** Extended the telemetry pipeline to collect richer user insights. The client now tracks `initialAtsScore`, `atsScoreDelta` (improvement delta), `atsFixesCount` (number of failed rules resolved), `presetSwitches` (history of loaded presets), `themePreference` (active light/dark theme), `undoRedoClicks` (history stack operations), and `markdownRenderTimeMs` (markdown compile performance).
- **Notion Schema Expansion:** Added 7 new properties to the *Jobby Telemetry* Notion database via the Notion REST API.
- **n8n Workflow Upgrades:** Updated `n8n/jobby-telemetry.json` with mapping configurations for the new telemetry properties and pushed the active workflow to production.

## [1.9.0] - 2026-06-20

### Added
- **User Feedback Pipeline:** Implemented an interactive, premium feedback form modal (triggered from the header action bar) allowing users to rate Jobby (1 to 5 stars), categorize comments (general feedback, feature suggestions, or bug report), and submit details. The modal contains form validation error styling, gold star hover effects, submission spinner loaders, and glassmorphic success checkmarks.
- **Feedback n8n Workflow & Proxy:** Added a `/api/feedback` backend proxy route on the Node server and a new n8n workflow file (`n8n/jobby-feedback.json`) that maps and saves feedback records to the Notion *Jobby Feedback* database.
- **Telemetry Upgrades:** Upgraded the telemetry subsystem to collect session-wide print counts and keep a list of used buttons, along with browser/OS version and device type details.
- **Broom Icon:** Swapped the "Clear Editor" trash can SVG with a Lucide "broom" icon.

## [1.8.3] - 2026-06-20

### Changed
- **SEO & Semantic HTML Upgrades:** Refactored Jobby to comply with modern SEO and accessibility standards. Wrapped application action buttons in a semantic `<nav>` element, introduced logical heading levels (`h2` landmark headings), associated labels with range sliders and color pickers, and added standard screen-reader-only `.sr-only` styles to unlabeled inputs.
- **Noscript and Crawlable Placeholders:** Added an elegant `<noscript>` fallback screen for clients with JavaScript disabled, and populated `#header-container`, `#editor-container`, `#preview-container`, and `#controls-container` with detailed crawlable fallback descriptions to optimize Jobby for basic web crawlers.
- **Improved Rich Snippets:** Enriched JSON-LD structured data with author, softwareVersion, licensing, and key capabilities metadata.
- **Enhanced Testability:** Assigned unique `id` attributes to modal close actions, external guides, and formatting toolbar buttons to support robust non-regression automated browser testing.

## [1.8.2] - 2026-06-20

### Added
- **Native File System Access Editor Integration:** Replaced the local draft browser storage system with the browser's native File System Access API. Users can now open, save, and "Save As" actual `.md` or `.txt` files directly on their system explorer (with automatic fallbacks for non-supported browsers). This provides a standard desktop editor feel that is much more intuitive for non-power users.
- **Save Dropdown Menu:** Grouped Save, Save As..., and Open options inside a neat, tactile save options dropdown menu next to the "Format" toolbar button, freeing up space in the header actions.
- **Telemetry Pipeline (n8n & Notion):** Added a secure usage and event telemetry pipeline. Editor actions (e.g., session start, file open/save, print, copy, and ATS score changes) are captured by the client and sent to a secure backend proxy route `/api/telemetry`, which asynchronously forwards them to a self-hosted n8n webhook workflow (`n8n/jobby-telemetry.json`) to log insights directly into a Notion database.

### Fixed
- **Printed Floating Menu:** Hid the folded controls dock, floating action buttons, and modal overlays in `@media print` queries to prevent them from showing on the exported PDF.

## [1.8.1] - 2026-06-19

### Added
- **PWA Web App Manifest:** Created standard `manifest.json` under the public directory.
- **Dynamic Manifest Versioning:** Updated the server (`server.js`) to dynamically serve `/manifest.json` and inject the application version from `package.json` at runtime, ensuring `package.json` remains the single source of truth.

### Changed
- **Translucent Controls Dock:** Restyled the vertical preview controls dock to have a modern glassmorphic frosted-glass background in both light and dark themes using `backdrop-filter`. The circular buttons inside the dock are also translucent in the light theme for better aesthetic integration.
- **Improved Dark Mode Readability:** Restyled the Markdown help link `"What is markdown?"` to use a high-contrast bright violet color (`#a78bfa`) in dark mode, solving its previous unreadability against dark slate backgrounds.
- **Polished Folded Layout:** Configured the `.preview-controls` wrapper to hide when folded, removing the empty pill outline caret that appeared on the top right next to the settings cog.
- **Modernized Action Flow (Alert-free):** Removed blocking native `confirm()` popups when loading the Sample, Jobby Updates ("What's New"), clearing the editor, or loading drafts. These actions are now executed instantly.
- **Pre-emptive Undo History States:** Modified overwrite actions to save the current editor state to the history stack *before* applying the new text, ensuring users can instantly reverse accidental overwrites by pressing `Ctrl+Z` or the Undo toolbar button.

## [1.8.0] - 2026-06-19

### Added
- **Design Panel Hiding & Floating Restore Button:** Integrated a close button (with SVG icon) in the customizer panel's header to collapse the panel and maximize the preview workspace. Added a glassmorphic floating "Design" button at the bottom-right of the window to unfold it. Collapsed/expanded state is persisted in local storage, and the preview canvas dynamically auto-fits its zoom level on state changes. *Special thanks to Maround Boutanos for the tooltip and design folding suggestions.*
- **Markdown Editor Formatting Toolbar:** Integrated an icon-based rich-text formatting toolbar unfolding above the writing canvas, including shortcuts helper tooltips, Undo/Redo, H1, H2, H3, Bold, Italic, Link, Lists, Accent/Muted styling, and Section Move Up/Down.
- **Custom History Stack (Undo/Redo):** Implemented client-side history state tracking to support local undo and redo actions in the editor, bound both to visual toolbar buttons and hotkeys (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`).
- **AI Wording & Prompting Reminders:** Added dedicated subsections in the About Modal and Help Documentation educating users on using Markdown with AI tools, highlighting that they should tailor their resumes with AI and explicitly prompt it with `"generate in MD format"` for clean, copy-paste compatibility.

## [1.7.0] - 2026-06-16

### Added
- **Save/Load Local Markdown Drafts:** Introduced "Save" and "Load" buttons in the editor actions toolbar to allow users to bank a local copy of their Markdown to `localStorage` and load it at any time with a confirmation prompt.
- **Why Markdown (Why MD) Info:** Added an educational section to the "About" modal detailing the benefits of Markdown (e.g. content-formatting separation, ATS compliance, portable, and easily readable by machines).
- **All Preset Buttons Renameable:** Expanded the double-click rename functionality to *all* built-in color presets (B&W, Dark, Corporate Blue, Soft Blue, Soft Green, Soft Red, Custom, and Funky). Custom names are persisted locally.
- **Import/Export Design Configurations:** Added JSON export and import options in the Developer Tools modal, permitting developers to download their styling settings or upload existing JSON styles to apply them instantly.
- **Enhanced Print Margins & Page Size Sync:** Rewrote print layout margin management to set browser `@page { margin: 0; }` and dynamically translate margins into `.a4-sheet` paddings. This avoids white margin borders on color themes/sidebars. Synchronized `@page` size to Letter or A4 based on the preview's format choice.
- **Visual Polishing:** Reordered custom slots (`Custom`, `Funky (please edit yours)`), removed the redundant manual "Update" button, repositioned the page format selector directly next to the zoom indicator in the preview header, and replaced the "Clear Editor" icon with a standard trash-can SVG.

## [1.6.5] - 2026-06-16

### Added
- **Help Modal & Detailed Markdown Documentation:** Added a dedicated Help modal accessible via a link in the About dialog. It fully explains standard Markdown formatting, layout split rules, custom Jobby tags, and links to Markdown best practices.
- **3 Renameable Design Preset Slots:** Replaced the single custom slot with Custom 1, Custom 2, and Custom 3 presets arranged in a 3x2 grid. Supports click-to-load/save, auto-save synchronization, and double-click to rename with strict input validation (character allowlist, length limit, XSS tag stripping).
- **SPA Client-Side Routing:** Configured Node server and frontend loader to support direct routing for `/sample` and `/whatsnew` to load template documents automatically without prompt warnings.
- **Header & Editor Layout Polishing:** Simplified editor header actions (Copy/Clear) to be icon-only. Configured CSS Container Queries on `.editor-panel` to hide button text and toggle labels dynamically when the panel is narrow.
- **Editor Navigation Cursor Echo:** Added cursor tracking to trigger the flashing cursor radar echo immediately on ArrowUp/Down/Left/Right navigations (keydown/keyup).
- **Logo Roll Easter Egg:** Embedded a 360-degree rotation animation when clicking the Jobby logo icon in the main header, About modal, or Help modal.

---

## [1.6.0] - 2026-06-16

### Added
- **Markdown Editor Syntax Highlighting:** Interactive syntax coloring (headers, lists, bold, italic, links, code blocks, and blockquotes) custom-designed for Dark and Light (Paper Cream) themes.
- **Syntax Highlighting Toggle:** "Syntax Color" switch in the editor's header to enable or disable the overlay.
- **Keyboard Shortcuts:**
  - `Ctrl + B` for Bold
  - `Ctrl + I` for Italic
  - `Ctrl + K` for Link (with prompting for URL)
  - `Ctrl + 1` / `2` / `3` for H1 / H2 / H3 headers
  - `Ctrl + UpArrow` / `DownArrow` to move lines or **entire sections** structurally.
- **Interactive Guide:** Floating keyboard shortcuts legend/tooltip helper `ⓘ Shortcuts` inside the editor header.
- **Layout Button groups:** Sleek pill-style toggle button groups replacing traditional layout dropdown selects.
- **Expert Mode (Advanced Mode):** Added an Expert Mode toggle switch at the top of the controls panel with a popover help menu detailing the unlocked settings. Unlocks advanced color pickers, section spacing, dynamic column splits, alternate fonts, and n8n webhook sync.
- **Dynamic Column Split Slider:** A modern, slick visual percentage split slider allowing real-time column resizing. Styled with a vertical divider bar handle fitting the widget height (46px) to cover gaps and vertical dividers, 1-to-1 mouse drag tracking (no parallax), and automatic value inversion when swapping Sidebar Position (Left <> Right) to keep the split aligned.
- **Column Cosmetic Options:** Redesigned options into aligned, card-styled `.cosmetic-group` collapsible detail containers. Added a **Shadow Color** picker with CSS `color-mix` soft 15% opacity support, alongside distance, border width/opacity, and gradient controls.
- **Column Layout Alignment:** Fixed CSS Grid auto-placement wrapping in `2-column` mode by forcing both main and sidebar columns to stay in `grid-row: 1` to guarantee perfect vertical alignment.
- **Optimized Typing Performance:** Decoupled syntax highlighting from preview compilation. Syntax highlighting updates synchronously on keystrokes for instant visual feedback, while the heavy preview layout rendering and saving are debounced by 200ms to eliminate all typing lag.
- **Column Font Preferences:** Options to adjust the column font size (smaller/standard) and apply a clean alternative sans-serif font family, grouped side-by-side in a compact row.
- **Blockquote Editor Highlighting:** Added support for blockquote `> text` syntax highlighting in the editor with a bold colored `>` symbol and italicized quote body.
- **Colors before Layout:** Reordered sections in the Customizer panel to present color palettes before structural settings.
- **Centralized Versioning:** Read and inject `version` from `package.json` dynamically into static resource imports cache-busting, header about badge, API endpoints, and Makefile.
- **Client JS Modularization:** Refactored monolithic `app.js` into modular ES modules (`syntax.js`, `developer.js`, `exports.js`, `theme.js`, `zoom.js`, `print.js`) under `public/js/`.
- **Developer Auth Modal:** Replaced old browser `window.prompt()` authorization with a beautifully integrated inline modal form styled with existing modal components.
- **Workflow Versioning Support:** Updated n8n PDF rendering nodes to support dynamic daily document increments and optional resume version footer or sidebar displays based on `config.showVersion`.
- **Automated Publish Info Injection:** Enhanced n8n sync script to automatically inject current timestamps and git commit hashes as root level comments and visual sticky notes (`Last Publish Info`) onto the workflow canvases.

---

## [1.5.0] - 2026-06-11

### Fixed
- Updated Google Tag ID regex validation inside `public/index.html` to support `GT-` prefixes.
- Docker compose execution fixes in `Makefile` passing `--env-file` flags.
- Makefile shortcut targets (`prod-up`, `prod-down`, `dev-up`, `dev-down`) and compatibility aliases.
- Introduction of [doppler](https://www.doppler.com/) for secrets management.

---

## [1.4.0] - 2026-06-11

### Changed
- **Docker Infrastructure Reorganization:** Consolidated Dev and Prod docker files inside parent `docker/` folder and setup `.env.dev` / `.env.prod` environment structures.
- **n8n Core Upgrade:** Upgraded n8n containers to `v2.25.2` with full support for AI nodes and MCP servers.
- **Vector Logging:** Configured local Vector agent for secure, project-segregated log shipping to Axiom.

---

## [1.3.0] - 2026-06-11

### Changed
- **Web App Modularization:** Split raw `index.html` into component bricks (`header.html`, `editor.html`, `preview.html`, `controls.html`, `about-modal.html`) loaded dynamically on start.
- **Developer Tools Security:** Added developer authentication token stored inside local storage to restrict developer panel access.

---

## [1.0.0] - 2026-06-11

### Added
- Initial release of Jobby ATS resume markdown editor with side-by-side live A4 sheet preview, bidirectional cursor sync mapping, local storage auto-save, and pdf printing support.

---

## 🔗 Jobby Project Links
* **[README](README.md)** - Project overview, architecture, directives and guide.
* **[Installation Guide](INSTALL.md)** - Learn how to set up Jobby locally or via Docker.
* **[Security Policy](SECURITY.md)** - View our security policy and vulnerability reporting instructions.
* **[License](LICENSE)** - View the MIT License terms.


