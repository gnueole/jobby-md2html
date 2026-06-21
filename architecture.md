# Jobby Project Architecture & File Structure

This document details the file structure and component architecture of the Jobby Project.

## 📁 Project File Structure

- `server.js`: Ultra‑lightweight local server written in Node.js. It serves the application.
- `public/index.html`, `public/style.css`: HTML structure and layout styles for the editor.
- `public/app.js`: Application entry point initializing ES modules.
- `public/js/`: Modular client-side JS subsystems:
  - `ats.js`: ATS scoring and resume analysis engine.
  - `bookmarklet.js`: Helper scripts to generate and compile LinkedIn scraper bookmarklets.
  - `config.js`: Configuration storage management, default styles, and sync states.
  - `developer.js`: Auth UX, inline credentials modal, and developer settings panel.
  - `exports.js`: Markdown, JSON import/export, and raw configuration copy handlers.
  - `highlight.js`, `syntax.js`: Synchronous syntax highlighting engine for the editor.
  - `parser.js`: Custom markdown-to-HTML parsing rules aligned with Gotenberg compiler.
  - `shortcuts.js`: Keyboard hotkeys and structural section swapping.
  - `styles.js`: Dynamic styling injector, cosmetics, and slider values handlers.
  - `tutorial.js`: Interactive animated popup tutorial demonstrating Markdown in 20 seconds, featuring path routing and dynamic theme/media styling.
  - `i18n.js`: Client-side internationalization engine that loads translation JSON files dynamically.
  - `tooltip.js`: Interactive markdown cheatsheet tooltip utility.
  - `theme.js`, `zoom.js`, `print.js`, `panning.js`, `utils.js`: Theme, zoom, scaling, panning, print previews, and core DOM utility helpers.
- `public/templates.css`: Rendering styles for A4 page (screen + PDF print rules).
- `public/sample.md`: Default resume template (example author) provided as a starting point.
- `public/resume.md`: **[Optional Backup]** A Markdown resume file placed on disk to bootstrap the editor if browser `localStorage` is empty.
- `public/config.json`: **[Optional Backup]** Custom layout configuration settings placed on disk to bootstrap the styles if browser `localStorage` is empty.

*Note: Placing `resume.md` and `config.json` in the `public` directory allows you to version-control and distribute default templates via Git.*

---

## 📊 Telemetry & Data Pipeline

Jobby includes a lightweight telemetry pipeline to monitor editor performance, calculate layout rendering speeds, and track feature adoption.

- **Strict Anonymity**: Telemetry collection is strictly anonymous. No personal information, name, email, IP address, or resume text is ever collected or transmitted. A random session identifier is used solely to correlate editor actions.
- **Experimental Abstractions**: The backend currently proxies telemetry events to an n8n webhook and stores logs. Please note that **Notion** (acting as the metrics database) and **Axiom** (used for centralized logging) are current experimental integrations that are subject to change in future iterations.

