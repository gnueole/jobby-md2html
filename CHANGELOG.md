# Changelog

*Author: Julien (Éole) Avarre (<hi@eole.me>)*


All notable changes to the Jobby project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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


