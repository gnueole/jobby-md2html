# Jobby: Premium Markdown Resume Editor

*Author: Julien (Éole) Avarre (<hi@eole.me>) & Antigravity (Google DeepMind team)*  
*Special thanks to **Maround Boutanos** for the shortcuts tooltip and design folding suggestions.*

> A premium, modern Markdown resume editor that respects ATS (Applicant Tracking System) standards, designed to run locally with zero heavy external dependencies.

Jobby serves as an instant manual override for immediate layout tweaks and content changes, while also acting as the HTML/CSS rendering configuration plane for a self-hosted PDF engine. All configurations and documents are safely stored in browser `localStorage` and can be downloaded or version-controlled directly.

👉 **Production URL:** **[https://cv.eole.me](https://cv.eole.me)**

<p align="center">
  <a href="public/screenshots/screenshot01-simple.png">
    <img src="public/screenshots/screenshot01-simple_small.png" alt="Jobby Markdown Editor" width="850" />
  </a>
</p>

---

## ✨ Key Features

- **Buttery-Smooth Preview**: Real-time syntax-highlighted editor with a decoupled, debounced preview pane. Unbalanced brackets are flagged as you write.
- **ATS-Compliant by Design**: Outputs semantic HTML optimized for applicant tracking systems.
- **A4/Letter Canvas Emulation**: Clear visual page breaks indicating exactly where content will split.
- **Modern Layout Controls**: Customizer panel for spacing, margins, shadows, column positioning, borders, and gradient backdrops.
- **Native File Integration**: Save and open Markdown files directly on disk in Chrome and Edge (File System Access API). Firefox and Safari do not offer that API: there, Save downloads a copy. Everything you type is also kept in the browser (`localStorage`).
- **Cosmetic Customization**: Dynamic color presets, double-click renameable color buttons, and custom theme exports.
- **Multi-language Support (i18n)**: Instantly translate the interface to English, French, Spanish, German, Romanian, Italian, or Czech.
- **Interactive Markdown Tutorial**: A 20-second step-by-step interactive onboarding workflow.

---

## 🚀 Quick Start

For detailed setup options, prerequisite lists, and WSL/Docker configuration steps, refer directly to the **[Installation Guide (INSTALL.md)](INSTALL.md)**.

### Option A: Local Node.js (Lightweight Editor Only)
No Docker or dependencies required.
```bash
node server.js
```
👉 Access at: **[http://localhost:3010](http://localhost:3010)**

### Option B: Docker Compose (Full Stack with n8n & PDF Engine)
Launches the editor, n8n, Gotenberg PDF engine, and Vector.
```bash
make up
```
👉 Access Editor at: **[http://localhost:3010](http://localhost:3010)**  
👉 Access n8n at: **[http://localhost:5678](http://localhost:5678)**

---

## 🖨️ PDF Generation

When you are ready to export your resume:
1. Click the **Print / PDF** button in the top-right header actions.
2. In the browser print dialog, select **Save as PDF** as the destination.
3. Check **Background graphics** (to preserve colors and sidebars) and uncheck **Headers and footers** for a clean page.

---

## 📝 Custom Markdown Directives

Jobby extends standard Markdown with shortcodes to style and structure elements without adding raw HTML:

| Syntax | Output / Action | Example |
| :--- | :--- | :--- |
| `:accent[text]` | Styles text with your chosen main layout accent color. | `Status: :accent[Available Immediately]` |
| `:muted[text]` | De-emphasizes secondary information (remains crawlable by ATS). | `:muted[Driver's license B · Own vehicle]` |
| `[CONTACT : email • phone • link]` | Renders a clean, centered, list-separated contact card. Separate values with `•`, `·` or `\|`, and end the line with `]`. | `[CONTACT : hi@eole.me • +33 6... • linkedin.com/in/...]` |
| **H2 (`##`) & H3 (`###`)** | In 2-column mode: H3 forms the sidebar (left); H2 forms the body (right). | *Toggle columns to auto-arrange.* |

Shortcodes written between backticks are displayed as-is, never interpreted. A `[CONTACT : …]` line missing its closing `]` stays raw text on its own line: the preview shows a warning above the sheet and the ATS checklist names the fix, rather than Jobby guessing where the line ends.

The editor also marks unbalanced brackets once you pause typing: an unclosed `[` in red, an extra `]` in magenta with a wavy underline, and a link missing its closing `)`. Parentheses in ordinary text are never flagged.

---

## ⌨️ Keyboard Shortcuts

Speed up composition and layout reorganization:

| Shortcut | Description |
| :--- | :--- |
| `Ctrl + B` / `Ctrl + I` | Toggle **Bold** / *Italics* |
| `Ctrl + K` | Insert Link / Wrap selection in `[text](url)` |
| `Ctrl + 1` / `2` / `3` | Apply Heading level (`#`, `##`, `###`) to the current line |
| `Ctrl + Up` / `Down` | Move current line or **entire heading section** (with contents) up or down |
| `Ctrl + Z` / `Ctrl + Y` | Undo / Redo content edits (supports 100 history steps) |
| `Ctrl + S` / `Ctrl + O` | Save changes back to disk (downloads a copy on Firefox/Safari) / Open a Markdown file |

---

## 🧪 Testing

Non-regression tests drive a real browser (Playwright) against a local server:

```bash
npm ci && npx playwright install chromium
npm run dev              # serves http://localhost:3010
npm run test:contact     # contact line: closed, unclosed, separators, code spans
npm run test:brackets    # editor marks for unbalanced brackets
npm run test:menus       # a real click on every header menu option
npm run test:overlay     # caret layer and highlight layer wrap alike
npm run test:contrast    # every UI text meets WCAG AA, in both themes
```

`BASE_URL` points them at another server, production included. `npm run lint` and `npm run validate:i18n` run in CI; the browser tests do not yet. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📸 Screenshot Gallery

| Advanced Spacing Panels | Light Theme with Right Sidebar | Ambient Contrast Modes |
| :---: | :---: | :---: |
| <a href="public/screenshots/screenshot02-advancedmode.png"><img src="public/screenshots/screenshot02-advancedmode_small.png" alt="Jobby Advanced Mode" width="260" /></a> | <a href="public/screenshots/screenshot03-lightmode-colright.png"><img src="public/screenshots/screenshot03-lightmode-colright_small.png" alt="Jobby Light Mode" width="260" /></a> | <a href="public/screenshots/screenshot-04-lightmode-darkpage.png"><img src="public/screenshots/screenshot-04-lightmode-darkpage_small.png" alt="Jobby Dark Mode" width="260" /></a> |
| *Cosmetic collapsible cards, column shadows, and border configs.* | *Alternative column background styles, font sizes, and paddings.* | *Dual-tone high-contrast layouts tailored for printing and presentation.* |

---

## 📁 Reference Documentation

- 🧠 **[AI Context & History (CONTEXT.md)](CONTEXT.md)**: Developer and AI bootstrap file containing codebase tenets, guidelines, and resolutions to historical bugs.
- 📂 **[System Architecture & Workflows (ARCHITECTURE.md)](ARCHITECTURE.md)**: Read details about file layout, n8n automation pipelines, telemetry, SEO indexing, and Axiom/Vector docker logging configs.
- 🚀 **[Installation & Setup Guide (INSTALL.md)](INSTALL.md)**: Find details on environment settings, n8n syncing CLI, and Docker stacks.
- 🛠️ **[Troubleshooting & FAQ (TROUBLESHOOTING.md)](TROUBLESHOOTING.md)**: Find answers to common errors, Gotenberg bugs, and LinkedIn bookmarklet CSP blocks.
- 🧑‍💻 **[Developer Guidelines (CONTRIBUTING.md)](CONTRIBUTING.md)**: Learn how to add languages, extend color presets, and build native features.
- 🤖 **[n8n Workflows Guide (n8n/README.md)](n8n/README.md)**: Explore JSON workflow mappings, database structures, and n8n sync commands.
- 📊 **[Changelog (CHANGELOG.md)](CHANGELOG.md)**: Review released version updates and history.
- 🛡️ **[Security Policy (SECURITY.md)](SECURITY.md)**: Report vulnerabilities or read safety disclosures.
- 📄 **[License (LICENSE)](LICENSE)**: Open-source MIT License terms.
