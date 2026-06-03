# Jobby MD Editor - Installation Guide

This guide provides instructions to run the Jobby Markdown Resume Editor locally on your machine.

---

## 🚀 Quick Start

You can run the editor using local Node.js or run a containerized stack containing n8n via Docker.

### Option A: Local Node.js (Lightweight Editor Only)

Use this option if you only want to run the resume editor without local n8n workflows.

1. **Navigate to the project folder:**
   ```bash
   cd "path/to/resume-md2html"
   ```

2. **Start the local server:**
   ```bash
   node server.js
   ```

3. **Access the editor:**
   👉 **[http://localhost:3000](http://localhost:3000)**

---

### Option B: Docker (WSL / Local Linux)

Use this option to spin up the Jobby Editor along with a local `n8n` instance, `gotenberg` (PDF renderer), and `mcp-notion` support containers.

1. **Configure Docker Permissions (Recommended for WSL)**
   To run Docker without `sudo` and prevent socket connection permission errors:
   ```bash
   sudo groupadd -f docker
   sudo usermod -aG docker $USER
   ```
   *Note: Close and reopen your terminal or run `newgrp docker` to apply.*

2. **Start the services:**
   Run the following command at the root of the project:
   ```bash
   docker compose up -d
   ```

3. **Access the services in your browser:**
   - 👉 **Resume Editor:** [http://localhost:3000](http://localhost:3000)
   - 👉 **n8n Dashboard:** [http://localhost:5678](http://localhost:5678)

   *Note: For security, both ports are bound to `127.0.0.1` (localhost) on the host. We bypass Traefik entirely in development, so no domain configuration or SSL setup is required.*

4. **Stop the services:**
   ```bash
   docker compose down
   ```

---

## 🔗 Sync Bookmarklets Setup

To scrape jobs from LinkedIn and send them directly to your webhook:

1. Launch the editor and click the **Developer** button in the header.
2. Under **Jobby Webhook Bookmarklets**, you will find two pre-configured buttons:
   - 🚀 **Sync to Jobby (Prod)**: Points to your production n8n server.
   - 🛠️ **Sync to Jobby (Dev)**: Points to your local WSL n8n instance.
3. Drag either button to your browser's Bookmarks bar.
4. Go to any LinkedIn job post page and click the bookmarklet to sync the job details automatically.

---

## 🛠️ Syncing n8n Workflows (Toolkit Guide)

To manage and backup your workflows, the project includes a Python sync toolkit in `toolkit/sync_n8n.py`.

### 1. Configure the Toolkit
Generate a `.env` template in the `toolkit/` directory if it does not exist:
```bash
python3 toolkit/sync_n8n.py --init-env
```
Fill in your API keys and settings in `toolkit/.env`.

### 2. Backup All Workflows from Production
To download all workflows from your production n8n instance to the local `n8n/` directory:
```bash
python3 toolkit/sync_n8n.py --backup-all
```

### 3. Restore/Import All Workflows to Local Dev n8n
To push all workflows from the `n8n/` directory into your local n8n instance:
* **Using n8n API (if local API key is configured in `toolkit/.env`):**
  ```bash
  python3 toolkit/sync_n8n.py --push-all --dev
  ```
* **Using Docker Fallback (no local API key needed):**
  If `DEV_N8N_API_KEY` is not set, the script will automatically invoke the Docker fallback mechanism, importing the workflows directly inside the container database:
  ```bash
  python3 toolkit/sync_n8n.py --push-all --dev
  ```
  *(Note: If the script encounters docker daemon connection issues on WSL, it will print copy-pasteable commands to run manually).*

