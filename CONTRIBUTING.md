# Contributing to Jobby

Thank you for your interest in contributing to Jobby! Follow these guidelines to set up your environment, understand the design rules, and add features or translations.

---

## 🛠️ Development Philosophy

Jobby is built to be fast, self-contained, and highly maintainable:
- **No JS Build Step**: Jobby uses native browser ES Modules. No Webpack, Vite, rollup, or Babel configurations are needed. Keep JS modular and simple.
- **Vanilla CSS**: Global styling and canvas layouts are managed purely using Vanilla CSS. CSS variables (`--variable-name`) are preferred to support live slider customizers.
- **Minimal Server footprint**: The Node.js server (`server.js`) utilizes native APIs with zero external npm dependencies. Do not add npm packages unless absolutely necessary.

---

## 🚀 Setting Up Locally

To get Jobby running on your system, please read the **[Installation Guide (INSTALL.md)](INSTALL.md)**.

1. **Verify Prerequisites**: Ensure you have Node.js (v18+) and Docker (if running n8n pipelines) installed.
2. **Launch development server**:
   ```bash
   node server.js
   ```
3. **Open browser**: Go to `http://localhost:3010`.

---

## 🌐 Adding a New Translation Language

Jobby utilizes a client-side translation engine in [public/js/i18n.js](file:///c:/Projects/eole.me/jobby-md2html/public/js/i18n.js). To add support for a new language (e.g., `pt` for Portuguese):

1. **Register the Language**: Open `public/js/i18n.js` and append the language code to the `supportedLanguages` array:
   ```javascript
   const supportedLanguages = ['en', 'fr', 'cs', 'es', 'it', 'de', 'ro', 'pt'];
   ```
2. **Create Translation Dictionary**: Create a new file at `public/locales/pt.json` and copy keys from `public/locales/en.json` to translate them.
3. **Create Sample Resume Template**: Create a default sample resume template in that language at `public/sample.pt.md` (e.g., translating the placeholders and section headers so the resume defaults load correctly).

---

## 🎨 Adding Design Color Presets

Design presets are managed between [public/js/config.js](file:///c:/Projects/eole.me/jobby-md2html/public/js/config.js) and [public/js/styles.js](file:///c:/Projects/eole.me/jobby-md2html/public/js/styles.js):

1. **Default Configurations**: Check `defaultStyleConfig` in `config.js` to see the base settings.
2. **Adding Preset Elements**: Open `public/bricks/design-panel.html` (or where the UI presets are declared) and add your new preset button.
3. **Applying Styles**: Add listeners and update the active preset checks in the `updateActivePresetBtn` function inside `public/js/styles.js` to hook up the CSS variable modifiers.

---

## 📝 Coding Conventions

- **HTML Semantic Structure**: Keep HTML structured. Use landmark tags (`<header>`, `<main>`, `<section>`). Use `id` attributes for test automation selectors.
- **CSS Variables**: When writing custom styles, reuse current theme variables in [public/style.css](file:///c:/Projects/eole.me/jobby-md2html/public/style.css) to support dark/light theme blending.
- **Git Branching & Pull Requests**:
  - Keep commits clean and atomic.
  - Test print layouts in Headless Chrome/Gotenberg before pushing changes.
