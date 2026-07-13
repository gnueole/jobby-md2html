# Troubleshooting & FAQ

Refer to this guide to resolve common issues encountered while setting up, using, or integrating Jobby.

---

## 🖨️ PDF Generation & Print Layout Issues

### Issue: PDF background colors or sidebars are missing (white page output)
* **Root Cause**: The browser's print engine disables background colors by default to save ink.
* **Solution**:
  1. Click **Print / PDF** to launch the browser print dialog.
  2. Expand **More Settings**.
  3. Ensure the **Background graphics** checkbox is **checked**.
  4. Ensure the **Headers and footers** checkbox is **unchecked**.

### Issue: Page breaks are cutting off text blocks mid-sentence
* **Root Cause**: Unbalanced content or oversized vertical margins in customizer settings.
* **Solution**:
  1. Adjust the **Page Margins** and **Text Spacing** sliders in the customizer to pull content back.
  2. Wrap sections neatly, or use the syntax shortcut `---` (horizontal rule) to force a page break before a section.
  3. Ensure the page format in the preview toolbar matches your browser print layout destination paper format (A4 vs Letter).

---

## 🔗 LinkedIn Bookmarklet & Webhook Failures

### Issue: Clicking the scraper bookmarklet on LinkedIn does nothing
* **Root Cause**: Content Security Policy (CSP) blocking or mismatched HTTP/HTTPS protocols.
* **Solution**:
  1. Check your browser's Developer Tools Console (`F12`).
  2. If you see a **CORS** or **Blocked by CSP** error:
     * Check that your n8n instance is running.
     * Ensure you are running Jobby over HTTPS in production. Most modern browsers block bookmarklets executing plain HTTP requests on HTTPS websites like LinkedIn.
     * If testing locally over HTTP, ensure your bookmarklet configuration points to a local domain or tunnel that resolves properly.

### Issue: Webhook times out or fails to deliver to n8n
* **Root Cause**: n8n container port mappings or firewall issues.
* **Solution**:
  1. Verify n8n is running by accessing `http://localhost:5678`.
  2. Ensure the bookmarklet's target endpoint matches the n8n webhook URL.
  3. If running n8n in Docker, ensure container ports are bound correctly (check `docker compose ps`).

---

## 🐳 Docker & n8n Local Setup Networking

### Issue: Containers cannot connect to host services (`localhost` mismatch)
* **Root Cause**: Inside a Docker container, `localhost` refers to the container itself, not the host machine.
* **Solution**:
  * For local WSL / Linux Docker, use **`host.docker.internal`** to point to the host machine (e.g. `http://host.docker.internal:3010` instead of `http://localhost:3010` in n8n workflows).
  * Ensure the host routing options are configured inside your compose file.

### Issue: Docker permission socket errors on WSL/Linux
* **Root Cause**: The current system user does not have permission to write to `/var/run/docker.sock`.
* **Solution**:
  ```bash
  sudo groupadd -f docker
  sudo usermod -aG docker $USER
  newgrp docker
  ```
  Restart your terminal session to apply.

---

## 💾 Local Storage & Draft Recovery

### Issue: I lost my resume configurations / content
* **Root Cause**: Cleared browser cookies/site data, or switched browsers.
* **Solution**:
  * Jobby caches content directly inside browser `localStorage`.
  * If you accidentally overwrite content: Press **`Ctrl + Z`** (Undo) or click the Undo button in the toolbar. Jobby automatically snapshots the canvas to the history stack before any full overwrite.
  * In the future, export your styling as a JSON config file using the **Developer Tools** panel, and save your markdown resume file (`.md`) locally using the **Save As** option.
