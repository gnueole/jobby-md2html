# 1.10.6 - Jobby Update
Jobby Update of 06/29/2026 · Dynamic Notion database variables for Atomic CV & Seeds, auto-formatting of database IDs in developer tools modal, and Makefile push/pull/list sync tools.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 🗃️ DYNAMIC ATOMIC CV & CV SEEDS VARIABLES
* **Full Sandbox Environment Compatibility**: Migrated the Atomic CV and CV Seeds Notion database IDs to the n8n Data Table configuration system, resolving production execution blocks due to environment variable sandboxing.

## 🔗 DUAL-MODE COMMAND LINE SYNC & COMPARE TOOLS
* **Local Terminal Utilities**: Created `make n8n-dbs-push`, `make n8n-dbs-pull`, and `make n8n-dbs-list` commands to easily push, pull, or compare your local Doppler database configs side-by-side with n8n with ANSI color highlight support.

## ✍️ AUTO-FORMATTED DATABASE UIDS
* **Enhanced Readability**: Added an automatic formatter inside the developer tools modal. Pasting or loading raw 32-character hex database IDs automatically segments them with hyphens into standard UUIDs.

## 🎨 DEVELOPER MODAL INPUT STYLING
* **Visual Tweaks**: Labels are now larger, and text boxes are smaller with a dimmed monospace font to enhance clarity.

---

# 1.10.5 - Jobby Update
Jobby Update of 06/29/2026 · SPA /developer route, dynamic Notion DB variables in n8n data tables, telemetry local disable toggle, and color picker contrast fixes.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]


## 📥 DIRECT GOTENBERG PDF DOWNLOAD
* **Clean & Dynamic PDF Generation**: Replaced external layout printing hacks with a direct PDF generation and download pipeline utilizing Gotenberg, fully resolving background printing bugs and layout mismatch issues.

## 🔎 EDITOR FONT SIZE CONTROLS
* **Dynamic Sizing**: Added interactive font-size adjusters inside the markdown editor container so you can customize the editor workspace layout to your liking.

## 🧭 DYNAMIC DROPDOWNS & TOOLTIPS POSITIONING
* **Adaptive Popups**: Implemented smart viewport checking to position dropdown select menus and tooltip elements dynamically, preventing any screen boundary overflows.

## 🌐 MULTI-LANGUAGE SYNCHRONIZATION
* **Robust Assets & Layouts**: Synchronized and updated translated locale configurations, style presets, and custom printing layouts across all 7 supported languages.

---

# 1.10.1 - Jobby Update
Jobby Update of 06/21/2026 · About Modal Help Link Fix & Design Refinements.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 🐛 ABOUT MODAL HELP LINK FIXED
* **Resolved Navigation Bug**: Fixed a bug where the "Help Guide & Markdown Syntax" link in the About Modal was broken after language translation. We now use event delegation to preserve click event listeners across dynamic DOM language updates.

## 🎨 ABOUT MODAL REFINEMENTS
* **Visual Polish**: Removed redundant emojis from headers, widened the layout to avoid scrollbars, and styled it with a premium glassmorphic sidebar.

---

# 1.10.0 - Jobby Update
Jobby Update of 06/21/2026 · Multi-Language Support, Static Header Accent, Visual Theme Switcher, Responsive Modals & Larger Toasts.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 🌐 MULTI-LANGUAGE SUPPORT (i18n)
* **New Locales Supported**: Added support for 5 new languages: Czech (`cs`), Spanish (`es`), Italian (`it`), German (`de`), and Romanian (`ro`). You can switch between all 7 supported languages using the dropdown selector in the header!
* **Localized Samples**: Clicking the "Sample" button now loads the template in your selected language and triggers a localized `"Sample loaded!"` toast!

## 🌈 HEADER ACCENT LINE
* **Premium Touch**: Added a thin, elegant 2.5px static gradient top-border running along the header bar, featuring a blend of blue, violet, and pink.

## 🌗 VISUAL THEME SWITCHER
* **Cleaner Header**: Removed the redundant "Theme: ..." text label from the theme toggle button for a cleaner header. It now displays only the icon.
* **Auto Theme Icon**: Upgraded the icon for the "Auto" (system prefers) setting to the classic contrast split circle (`lucide-contrast`), making theme states instantly recognizable.

## 🥞 RESPONSIVE MODALS & BIGGER TOASTS
* **Scrollable Modals**: Capped all modal card heights at `90vh` and set their body contents to scroll vertically, resolving readability issues on small screens.
* **Twice Larger Toasters**: Doubled the font-size of all toast notifications to `26px` (and icons/close buttons to `32px`) to enhance legibility.
* **Welcome Upgrade Toast**: Displays a localized welcome/upgrade toaster notification to returning users when a newer version is deployed.

---

# 1.9.2 - Jobby Update
Jobby Update of 06/21/2026 · Stackable Notifications and Refined Broom Icon.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 🥞 STACKABLE NOTIFICATIONS SYSTEM (TOASTER)
* **Fluid Notifications**: Alerts now slide in from the bottom right as stackable cards. They auto-dismiss or can be closed manually, and dynamically adapt (Success, Error, Warning, Info) with custom colors and emojis.
* **Test Compatibility**: The integration fully respects automated non-regression tests.

## 🧹 REFINED BROOM ICON
* **Modern Design**: The editor clear icon has been redesigned as a sleek vertical broom with sparkles, replacing the older, less legible icon.

---

# 1.9.1 - Jobby Update
Jobby Update of 06/20/2026 · Advanced Telemetry Metrics.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 📊 PERFORMANCE AND USAGE METRICS
* **Advanced Metrics**: We now anonymously track the progression of your ATS score (initial score, score improvements, number of corrected rules), design presets tested, undo/redo click counts, active theme (dark/light), and markdown render time in milliseconds to optimize performance.

---

# 1.9.0 - Jobby Update
Jobby Update of 06/20/2026 · User Feedback Form and n8n Integration.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 💬 USER FEEDBACK FORM
* **Interactive Form**: A new "Feedback" button has been added to the editor header. It opens an elegant modal allowing you to rate the app (interactive stars), categorize your feedback (Comment, Suggestion, Bug), and describe your comments.
* **Secure Processing**: Feedback is sent asynchronously to our Notion database via a secure server proxy and a dedicated n8n workflow, protecting the API keys.

---

# 1.8.2 - Jobby Update
Jobby Update of 06/20/2026 · Folded Controls Hidden on Print.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 🖨️ CLEAN PRINTING WITHOUT ARTIFACTS
* **Hidden Dock**: The side floating folded controls dock, the unfold "Design" button, and modal overlays are now automatically hidden during printing or PDF export. Your resume prints perfectly clean.

---

# 1.8.1 - Jobby Update
Jobby Update of 06/19/2026 · Glassmorphic Mode, Improved Accessibility, and Smooth Actions.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 🌌 GLASSMORPHIC EFFECTS AND VISUAL POLISH
* **Translucent Floating Dock**: The collapsed shortcut panel now features a beautiful frosted glass effect (glassmorphism) in both dark and light modes. Buttons adapt dynamically for perfect visual integration.
* **Interface Cleanup**: The empty control wrapper disappears completely when folded, eliminating visual layout gaps.

## 👁️ ACCESSIBILITY AND DARK MODE CONTRAST
* **"What is markdown?" Link**: The helper link in the Markdown editor header now lights up in light purple in dark mode to guarantee optimal contrast and legibility.

## 🚀 SMOOTH AND UNDOABLE ACTIONS
* **No More Blocking Dialogs**: The :accent[Sample], :accent[What's New], :accent[Clear], and :accent[Load] buttons now load content instantly without annoying, blocking browser confirm popups.
* **Safety Net**: Before any destructive overwrite action, your draft is saved to the editor history. A simple :accent[Ctrl + Z] or the Undo button lets you revert immediately!

---

# 1.8.0 - Jobby Update
Jobby Update of 06/19/2026 · Collapsible Design Panel, Rich Formatting Toolbar, History, and AI Synergy.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 🔍 COLLAPSIBLE DESIGN PANEL
* **Maximum Focus**: A new close button (SVG cross) has been added to the design panel header. Click it to collapse the customizer entirely and free up screen space for the preview!
* **Interactive Floating Button**: A sleek glassmorphic "Design" button appears at the bottom of the screen when the panel is hidden, letting you unfold it at any time.
* *Special thanks to Maround Boutanos for the shortcuts tooltips and panel folding suggestions!*

## 🛠️ RICH FORMATTING TOOLBAR
* **Quick Style Access**: The :accent[Format] button is now placed before :accent[Save] and expands a rich formatting toolbar directly above the editor textarea.
* **Dynamic Highlight**: The :accent[Format] button glows purple when the toolbar is closed to invite interaction, then returns to a neutral shade once opened.
* **One-Click Actions**: Insert headings (H1, H2, H3), bold, italic, links, bullet lists, apply accent or muted styles, or move lines up/down effortlessly.

## 🔄 INTEGRATED UNDO / REDO HISTORY
* **Safety First**: A custom Undo/Redo history stack has been integrated into the editor. Easily revert and redo edits using the toolbar buttons or standard keyboard shortcuts: :accent[Ctrl + Z] and :accent[Ctrl + Y] / :accent[Ctrl + Shift + Z].

## 🤖 AI SYSTEM SYNERGY
* **Edit Resumes with AI**: Markdown is the perfect format to use alongside AI tools (Gemini, ChatGPT, Claude...). To prevent layout issues when copying/pasting, always ask the model to :accent["generate in MD format"].

---

# 1.7.0 - Jobby Update
Jobby Update of 06/16/2026 · Simple & Smart Features.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 💾 LOCAL SAVE & LOAD
* **Draft Saving**: Save a local backup of your current resume to your browser's secure cache using the new :accent[Save] button.
* **Quick Restores**: Retrieve your saved version instantly by clicking the :accent[Load] button (requires confirmation to avoid accidental overwrites).

## 🎨 FLEXIBLE PRESETS AND CUSTOMIZATION
* **Universal Preset Renaming**: All color preset buttons (B&W, Dark, Corporate Blue, Soft Blue, Soft Green, Soft Red, Custom, etc.) can now be :accent[renamed by double-clicking] them! Custom names are automatically saved to local storage.
* **Import/Export Layout Configs**: Export your custom design configuration as a JSON file and re-import it instantly from the Developer Tools modal.

## 🖨️ FULL-BLEED PRINTING (NO BORDERS)
* **Eliminate White Borders**: Print margins are now handled internally as document paddings. This allows background colors (sidebars, dark themes) to print :accent[all the way to the edge of the paper]!
* **Dynamic Page Sizes**: Real-time A4 and US Letter page sizes are supported to match your layout preferences precisely.

## ✍️ SIMPLIFIED EDITING
* **Real-time Syntax Highlighting**: Your markdown text colors in :accent[real-time] as you type, helping you visualize document structure.
* **Keyboard Shortcuts**: Format text like a standard word processor without knowing Markdown:
  * :accent[Ctrl + B] : Bold text
  * :accent[Ctrl + I] : Italic text
  * :accent[Ctrl + K] : Insert hyperlink
  * :accent[Ctrl + E] : Apply accent color (`:accent[]`)
  * :accent[Ctrl + M] : Apply muted text (`:muted[]`)
  * :accent[Ctrl + 1 / 2 / 3] : Insert headings (H1 / H2 / H3)
  * :accent[Ctrl + ▲ / ▼] : Move current line or selected section up/down

## 🎨 SIDEBAR CUSTOMIZATION
* **Flexible Alignment**: Align your sidebar to the :accent[left or right] to suit your taste.
* **Custom Width**: Adjust sidebar size with a slider to balance the columns perfectly.
* **Premium Accents**: Customize borders, add shadows, or apply linear gradients to make your sidebar stand out.

## 🚀 EXPERT MODE
* **Powerful Yet Clean**: Toggle Expert Mode to reveal advanced options (line heights, heading scale, custom color pickers) while keeping the default interface clean and simple.

### 📑 AUTOMATIC VERSIONING
* **Never Lose Track**: An intelligent printing version indicator is stamped at the bottom of the document.
* **Auto Increments**: The version number automatically increments each time you print or download the PDF, ensuring recruiters always look at the :accent[latest version].
* **Daily Resets**: The print count counter resets automatically each morning.

### ⚡ INSTANT PERFORMANCE
* **Real-time Updates**: Edits reflect in the preview immediately with zero lag.
* **No Cache Delays**: Updates load :accent[instantly] without requiring page refreshes or cache clearing.

## 🔗 FIND OUT MORE
* **Source Code & Docs**: Explore details on the [README on GitHub](https://github.com/gnueole/jobby-md2html#readme).
* **Complete Changelog**: Read about all past updates in the [official CHANGELOG on GitHub](https://github.com/gnueole/jobby-md2html/blob/main/CHANGELOG.md).
