# jobby MD Editor

A premium, modern Markdown resume editor that respects ATS (Applicant Tracking System) standards, designed to run locally without heavy external dependencies.

👉 **Production URL:** **[https://cv.eole.me](https://cv.eole.me)**

All your content and style changes (colors, fonts, margins) are automatically saved in your working folder, allowing you to resume work across machines via Git.

## 🚀 Quick Start

To launch the editor on a new machine after performing a `git pull`:

1. Open your terminal (PowerShell / Command Prompt) in the project folder:
   ```powershell
   cd "path/to/resume MD2HTML"
   ```

2. Start the local server with Node.js:
   ```powershell
   node server.js
   ```

3. Open your browser and go to:
   👉 **[http://localhost:3000](http://localhost:3000)**

## 📁 Project File Structure

- `server.js`: Ultra‑lightweight local server written in Node.js. It serves the application.
- `index.html`, `style.css`, `app.js`: Source code for the editing UI, auto‑zoom system, and ATS analyzer.
- `templates.css`: Rendering styles for A4 page (screen + PDF print rules).
- `sample.md`: Default resume template (example author) provided as a starting point.
- `resume.md`: **[Generated]** Your Markdown resume content.
- `config.json`: **[Generated]** Your custom layout settings (chosen fonts, sizes, line spacing, colors).

*Note: Committing and pushing `resume.md` and `config.json` to Git lets you synchronize all your text and style changes across machines.*

## 📝 Specific Resume Directives (Guide)

Following standard guidelines, you can use special shortcuts in your Markdown to style the output:

- **Accent Color**: Use `:accent[your text]` to color important elements (e.g., `:accent[Immediately available]`).
- **Muted Text (gray)**: Use `:muted[your text]` to visually de‑emphasize secondary information while keeping it indexable by ATS bots (e.g., `:muted[Driver's license B · Own vehicle]`).
- **Contact Bar**: The editor automatically detects the line containing your emails or links and formats it neatly. You can also force a centered contact block with the syntax `[CONTACT : email | phone | linkedin]`.
- **Two-Column Layout (Heading levels)**: When the **2-column layout** is enabled, section headers defined with `##` (H2) and `###` (H3) are styled identically but placed in separate columns:
  - `###` (H3) sections are placed in the **Sidebar Column (left)**.
  - `##` (H2) sections are placed in the **Main Column (right)**.
  *(Note: In 1-column layout, they are both displayed sequentially in a single column).*

## 🖨️ Generate PDF for Recruiters

When you are satisfied with your layout:

1. Click the **Print / PDF** button at the top right.
2. In your browser’s print dialog, select **Save as PDF** as the destination.
3. Check **Background graphics** to preserve colors, and uncheck **Headers and footers** for a clean page.
4. Save the file!
