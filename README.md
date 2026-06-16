# jobby Project: An AI automated resume with a Markdown editor

*Author: Julien (Éole) Avarre (<hi@eole.me>)*


> A premium, modern Markdown resume editor that respects ATS (Applicant Tracking System) standards, designed to run locally without heavy external dependencies.

It serves as a **quick and clean manual overdrive** for immediate layout tweaks and content changes, while also acting as the **HTML/CSS rendering configuration plane** for the PDF engine.

👉 **Production URL:** **[https://cv.eole.me](https://cv.eole.me)**

<p align="center">
  <a href="public/screenshots/screenshot01-simple.png">
    <img src="public/screenshots/screenshot01-simple_small.png" alt="Jobby Markdown Editor - Simple Mode" width="850" />
  </a>
</p>

All your content and style changes (colors, fonts, margins) are safely stored in your browser's local storage (`localStorage`). You can copy your layout configurations or download your resume as Markdown from the UI.

## 🔍 Table of Contents

- [📋 Requirements](#-requirements)
- [📦 Installation & Setup](#-installation--setup)
- [⚙️ System Architecture & Automated Workflows](#️-system-architecture--automated-workflows)
- [📁 Project File Structure](#-project-file-structure)
- [📝 Specific Resume Directives (Guide)](#-specific-resume-directives-guide)
- [⚡ Interactive Editing & Layout Customizations](#-interactive-editing--layout-customizations)
- [🖨️ Generate PDF for Recruiters](#️-generate-pdf-for-recruiters)
- [📸 Screenshot Gallery](#-screenshot-gallery)
- [📑 Annex: Axiom Log Segregation & Configuration](#-annex-axiom-log-segregation--configuration)
- [✨ Wishlist & Future Improvements](#-wishlist--future-improvements)
- [🔗 Jobby Project Links](#-jobby-project-links)
- [📄 License](#-license)

## 📋 Requirements

Before setting up Jobby, review the following platform and service requirements:

* **Host / Infrastructure:** 
  * Localhost: **Free** (for local development and testing).
  * Host VPS: **Cheap / Low cost** (required if you want a public, custom domain name).
* **n8n:** **Free** (self-hosted workflow automation platform running in Docker).
* **Traefik:** **Free** (secure HTTPS reverse proxy used for SSL certificate management).
* **Gotenberg (PDF Engine):** **Free** (handles PDF printing and compilation from HTML).
* **Gemini / Claude APIs:** **Free tier** available (but note that free tiers can be very rate-limited).
* **Notion:** **Free tier** available (but note that using an AI agent to generate Markdown inside Notion is currently very limited on the free tier).

## 📦 Installation & Setup

For step-by-step local running instructions (using either local Node.js or Docker WSL), please refer to the:
👉 **[Installation Guide](INSTALL.md)**

---

## ⚙️ System Architecture & Automated Workflows

Jobby is designed to be an automated, AI-assisted resume personalization pipeline that integrates your editor, a scraper bookmarklet, n8n, and Notion.

```mermaid
---
config:
  theme: redux
  look: handDrawn
  fontFamily: '''Source Code Pro Variable'', monospace'
  themeVariables:
    fontFamily: '''Source Code Pro Variable'', monospace'
  layout: elk
---
flowchart TB
    A["LinkedIn Job Page"] L_A_n4_0@-- "1. Friendly Scraper Bookmarklet" --> n4["n8n workflow"]

    D["Notion CV DB"] -.-> C["Notion AI Agent"] & n5["Gemini"]

    C -- "3. Update database with md ready CV" --> B["Notion Collect Table"]
    B L_B_F_0@-- "4. Generate PDF" --> F["n8n md 2 pdf"]
    B L_B_C_0@-- "2. Notion Collect Table" --> C
    n4 L_n4_B_0@-- "2. Push analysis and details" --> B
    B -. "Manual Copy paste (for now)" .-> E["Jobby MD Editor"]
    E -. "update Print Layout Configuration" .-> F

    %% Anchor n7 directly below E on the right side
    E --> n7["Your bespoked CV"]
    F --> n6["Your bespoked CV"]
    n5 --> n4

    D@{ shape: disk }
    n5@{ shape: rect }
    B@{ shape: db }
    F@{ shape: lean-r }
    A@{ shape: div-proc }
    n4@{ shape: in-out }
    n7@{ shape: tag-doc }
    n6@{ shape: tag-doc }

    style C stroke:#D50000,stroke-width:4px,stroke-dasharray: 0
    style n5 stroke:#D50000,stroke-width:4px,stroke-dasharray: 0
    style E fill:transparent,stroke-width:4px,stroke-dasharray: 0,stroke:#FFD600
    style A stroke:#2962FF,stroke-width:4px,stroke-dasharray: 0

    L_B_F_0@{ animation: slow }
    L_B_C_0@{ animation: slow }
    L_A_n4_0@{ animation: slow }
    L_n4_B_0@{ animation: slow }
```

### 1. Friendly LinkedIn Scraper
* **What it is:** A dynamic JavaScript bookmarklet that you drag into your browser bookmarks bar (generated under the **Developer** panel).
* **How it works:** When viewing a job description on LinkedIn, click the bookmarklet. It scrapes the job title, company, job URL, and the full job description text, and instantly POSTs it to your local or production n8n webhook.

### 2. Notion Databases & Late Fillup Template
To manage your application history and personalize your CV, the system is backed by two primary Notion databases:
* **Notion CV DB (Baseline):** Stores your baseline resume content in Markdown format, along with your default styling configurations (fonts, margins, spacing, and colors).
* **Notion Collect Table (Jobs):** Acts as your inbox. This table automatically collects and logs the job listings sent by the LinkedIn bookmarklet (including scraped descriptions and URLs).

### 3. Notion Agent to Configure (AI Matching)
* **What it is:** An n8n workflow coupled with an LLM (AI Agent) connected to your Notion workspace.
* **How it works:** 
  1. The agent triggers when a new job is added to the **Notion Collect Table**.
  2. It reads the job requirements and compares them against your baseline resume in the **Notion CV DB**.
  3. It automatically updates layout configurations (like adjusting margins to fit onto a single page, choosing professional font sizes, or tailoring accent words `:accent[...]` to match the job's keywords) and saves them back to the CV DB.

### 4. Button MD to PDF (Notion Action)
* **What it is:** A button integrated directly inside your Notion workspace pages.
* **How it works:** 
  1. Clicking this button in Notion triggers an n8n workflow.
  2. The workflow fetches the personalized Markdown content and the HTML/CSS layout configuration from your **Notion CV DB**.
  3. It passes this data to the **Gotenberg PDF rendering engine** running in the container.
  4. Gotenberg compiles the documents into a clean, A4-formatted, ATS-compliant PDF which is then saved back to Notion or prepared for your download.


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
  - `theme.js`, `zoom.js`, `print.js`, `panning.js`, `utils.js`: Theme, zoom, scaling, panning, print previews, and core DOM utility helpers.
- `public/templates.css`: Rendering styles for A4 page (screen + PDF print rules).
- `public/sample.md`: Default resume template (example author) provided as a starting point.
- `public/resume.md`: **[Optional Backup]** A Markdown resume file placed on disk to bootstrap the editor if browser `localStorage` is empty.
- `public/config.json`: **[Optional Backup]** Custom layout configuration settings placed on disk to bootstrap the styles if browser `localStorage` is empty.

*Note: Placing `resume.md` and `config.json` in the `public` directory allows you to version-control and distribute default templates via Git.*

## 📝 Specific Resume Directives (Guide)

Following standard guidelines, you can use special shortcuts in your Markdown to style the output:

- **Accent Color**: Use `:accent[your text]` to color important elements (e.g., `:accent[Immediately available]`).
- **Muted Text (gray)**: Use `:muted[your text]` to visually de‑emphasize secondary information while keeping it indexable by ATS bots (e.g., `:muted[Driver's license B · Own vehicle]`).
- **Contact Bar**: The editor automatically detects the line containing your emails or links and formats it neatly. You can also force a centered contact block with the syntax `[CONTACT : email | phone | linkedin]`.
- **Two-Column Layout (Heading levels)**: When the **2-column layout** is enabled, section headers defined with `##` (H2) and `###` (H3) are styled identically but placed in separate columns:
  - `###` (H3) sections are placed in the **Sidebar Column (left)**.
  - `##` (H2) sections are placed in the **Main Column (right)**.
  *(Note: In 1-column layout, they are both displayed sequentially in a single column).*

---

## ⚡ Interactive Editing & Layout Customizations

The editor contains several premium UX enhancements to make document composition and layout adjustment seamless:

### 1. Keyboard Edition Shortcuts
Speed up your writing in the Markdown editor with the following shortcuts:
* **`Ctrl + B`**: Toggle **Bold** (adds/wraps selection in `**`).
* **`Ctrl + I`**: Toggle *Italic* (adds/wraps selection in `*`).
* **`Ctrl + K`**: Insert **Link** or transform selection to Link `[text](url)` (prompts for URL).
* **`Ctrl + 1` / `2` / `3`**: Set Heading level (`#`, `##`, or `###`) for the current line.
* **`Ctrl + UpArrow` / `DownArrow`**: 
  * If editing standard text: moves the current line above/below.
  * If inside/selecting a section (defined by a heading): moves the **entire section** (heading and text body) above/below the neighboring sections, maintaining complete structure.

### 2. Live Syntax Highlighting & Toggle
* The Markdown editor features a dynamic color highlighting system (customized for both Dark and Light UI modes) that color-codes headers, lists, links, and bold text as you type.
* To deactivate highlighting, simply uncheck the **Syntax Color** toggle in the editor's header to fallback to clean plain-text editing.

### 3. Layout Control Buttons
* Dropdown menus for **Resume Structure** and **Sidebar Position** have been replaced with modern, tactile active-toggle buttons.
* **Customizer Repositioning:** You can switch the customizer controls panel to the **Left Side** of your screen instead of the default **Right Side** to suit your preferred workflow.

### 4. Cosmetic Column Options (Expert Settings)
You can configure the appearance of your sidebar column in 2-column mode inside a set of beautifully aligned, card-styled collapsible groups:
* **Column Shadow:** Toggle a soft drop shadow (with customizable blur distance and shadow color picker, mixed with CSS `color-mix` for a professional soft ambient effect).
* **Column Border:** Toggle a border around the sidebar (with custom width in px and opacity/transparency percentage range sliders).
* **Column Gradient:** Toggle a background gradient starting from the sidebar base color and fading into a custom secondary color (with adjustable gradient length percentage).

### 5. Perfect Column Alignment
* Fixed vertical alignment between columns in 2-column mode by forcing both panels to occupy the same CSS Grid row (`grid-row: 1`). This prevents grid auto-placement from stacking columns vertically (e.g. when sidebar is toggled left).

### 6. Decoupled, Debounced Parser for Performance
* The Markdown editor syntax highlighter updates synchronously on typing for instant visual highlighting.
* The heavier HTML rendering engine, page-break layout engine, and saving operations are debounced by 200ms to keep the editing experience buttery-smooth even for long resumes.

### 7. Centralized Versioning
* Versioning is centralized dynamically in `package.json`. It is automatically parsed and injected as the single source of truth across the server, CLI, static resources (via query cache-busting), and the interface's "About" modal.

## 🖨️ Generate PDF for Recruiters

When you are satisfied with your layout:

1. Click the **Print / PDF** button at the top right.
2. In your browser’s print dialog, select **Save as PDF** as the destination.
3. Check **Background graphics** to preserve colors, and uncheck **Headers and footers** for a clean page.
4. Save the file!

---

## 📸 Screenshot Gallery

Here are some screenshots demonstrating Jobby's premium user interface in various configuration modes:

| Advanced Customizer Panel | Column Accent Alignments & Light Mode | Dark Canvas Mode & PDF Setup |
| :---: | :---: | :---: |
| <a href="public/screenshots/screenshot02-advancedmode.png"><img src="public/screenshots/screenshot02-advancedmode_small.png" alt="Jobby Advanced Mode" width="300" /></a> | <a href="public/screenshots/screenshot03-lightmode-colright.png"><img src="public/screenshots/screenshot03-lightmode-colright_small.png" alt="Jobby Light Mode Column Right" width="300" /></a> | <a href="public/screenshots/screenshot-04-lightmode-darkpage.png"><img src="public/screenshots/screenshot-04-lightmode-darkpage_small.png" alt="Jobby Dark Page Mode" width="300" /></a> |
| *Expert customizations, visual grid splitting, and cosmetic card dropdowns.* | *Alternate column backgrounds, margins/padding rules, and cream colors.* | *Dual-tone high-contrast layouts tailored for recruiters and dark-theme lovers.* |

---

## 📑 Annex: Axiom Log Segregation & Configuration

To monitor errors and logs, the system integrates **Vector** as a container log shipper and **Axiom** as the log storage and analysis platform.

To ensure logs from different environments (production, test, development) are kept completely separate—even when running on the same physical Docker daemon/host—we enforce two layers of segregation:

### 1. HTTP Endpoint Segregation (Axiom Datasets)
Each environment should write to its own separate dataset in Axiom. This is configured via the `AXIOM_DATASET` variable in the environment file:
* **Production (`.env.prod`):**
  ```env
  AXIOM_DATASET="your-dataset-name"
  AXIOM_TOKEN="your-axiom-token"
  ```
* **Test/Staging:**
  ```env
  AXIOM_DATASET="your-dataset-name-test"
  AXIOM_TOKEN="your-axiom-token"
  ```

### 2. Docker Daemon Log Filtering (Vector Project Isolation)
Since Vector mounts `/var/run/docker.sock` to listen to all container stdout/stderr events on the host, a single Vector agent would normally capture and forward logs for every container on the host indiscriminately.

To prevent cross-environment log mixing on shared hosts:
1. All containers are associated with their respective Docker Compose project.
2. Vector’s configuration ([vector.yaml](docker/vector.yaml)) contains a filter transform that matches the container’s Docker Compose project label against the current stack's name:
   ```yaml
   transforms:
     filter_project_logs:
       type: "filter"
       inputs:
         - "docker_logs"
       condition: '.label."com.docker.compose.project" == "${COMPOSE_PROJECT_NAME}"'
   ```
3. The `COMPOSE_PROJECT_NAME` is passed directly from [docker-compose.yml](docker/docker-compose.yml) into the Vector container environment (defaulting to the production project name `n8n-eole-prod`).

This ensures that only logs produced by containers belonging to the local environment stack are forwarded to the configured Axiom dataset.

---

## 🔗 Jobby Project Links
* **[Installation Guide](INSTALL.md)** - Learn how to set up Jobby locally or via Docker.
* **[Changelog](CHANGELOG.md)** - Review releases and change history.
* **[Security Policy](SECURITY.md)** - View our security policy and vulnerability reporting instructions.

## ✨ Wishlist & Future Improvements

Here is a list of features and enhancements planned for future versions of Jobby, ordered by implementation complexity (e.g., quick wins first, complex integrations last):

- [ ] **Add "Help" button in the UI:** Add a "Help" button in the interface that opens the Installation Guide and links back to the GitHub repository.
- [ ] **Locale (fr-FR translation):** Implement a simple language switcher (easy to do as French translations are already drafted).
- [ ] **Improve SEO:** Optimize meta tags, OpenGraph headers, and robot directives for public-facing resume pages.
- [ ] **Add GitHub Actions:** Automate syntax checking and dependency building for local developers.
- [ ] **Implement a download PDF button:** Download the PDF file directly via the running Gotenberg container instead of opening the browser's manual print dialog.
- [ ] **Automated PDF Sync to Drive:** Append an n8n node to save generated PDF resumes to Google Drive or Dropbox on build automatically.
- [ ] **Feedback Button:** Introduce a feedback button opening an inline questionnaire feeding into a Notion database.
- [ ] **Gemini Credits:** Allow users to use their own Gemini/Claude API keys for AI resume personalization.
- [ ] **Multi-Profile Support:** Switch between multiple resume profiles (e.g., Developer, Product Manager) stored in `localStorage`/Notion.
- [ ] **PDF Compression:** Integrate a ghostscript/pdfsizeopt wrapper within the PDF docker compiler to keep ATS files under 500KB.
- [ ] **Telemetry:** Collect anonymous stats on chosen resume layout presets and font pairings.
- [ ] **Cover Letter Generator:** Build a companion editor interface generating matching cover letters using identical color systems and spacing.
- [ ] **Interactive ATS Scanning:** Paste job descriptions inside the UI to calculate real-time keyword matching scores and improvements.
- [ ] **Google Account Sync:** Secure user authentication allowing resume backup/restore directly from Google Drive API storage.



## 📄 License
This project is open-source and available under the [MIT License](LICENSE).


