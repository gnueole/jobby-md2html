# Jobby MD Editor - Installation Guide

*Author: Julien (Éole) Avarre (<hi@eole.me>)*


This guide provides instructions to run the Jobby Markdown Resume Editor locally on your machine.

---

## 🚀 Quick Start

You can run the editor using local Node.js or run a containerized stack containing n8n via Docker.

### Option A: Local Node.js (Lightweight Editor Only)

Use this option if you only want to run the resume editor without local n8n workflows.

1. **Navigate to the project folder:**
   ```bash
   cd "path/to/jobby"
   ```

2. **Start the local server:**
   ```bash
   node server.js
   ```

3. **Access the editor:**
   👉 **[http://localhost:3010](http://localhost:3010)**

---

### Option B: Docker (WSL / Local Linux)

Use this option to spin up the Jobby Editor along with a local `n8n` instance, `gotenberg` (PDF renderer), and `mcp-notion` support containers.

*Note on layout: The Docker orchestration files are located inside the `docker/` directory:*
* *`docker/docker-compose.yml` is used for local WSL/Linux development.*
* *`docker/docker-compose.prod.yml` is used for remote production deployments.*
* *Shared build assets (`Dockerfile`, `vector.Dockerfile`, and `vector.yaml`) are located directly inside `docker/`.*

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
   make up
   ```
   *(Or alternatively: `docker compose -f docker/docker-compose.yml up -d`)*

3. **Access the services in your browser:**
   - 👉 **Resume Editor:** [http://localhost:3010](http://localhost:3010)
   - 👉 **n8n Dashboard:** [http://localhost:5678](http://localhost:5678)

   *Note: For security, both ports are bound to `127.0.0.1` (localhost) on the host. We bypass Traefik entirely in development, so no domain configuration or SSL setup is required.*

4. **Stop the services:**
   ```bash
   make down
   ```
   *(Or alternatively: `docker compose -f docker/docker-compose.yml down`)*

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

### 1. Configure the Project
To check dependencies and initialize your local configuration (`.env` file and npm dependencies), run:
```bash
make configure
```
*(Or alternatively: `bash configure`)*

This script verifies system dependencies (Node.js, npm, Docker, Python 3) and initializes the local environment file. If Doppler CLI is installed, the Makefile targets (`make dev`, `make up`, etc.) will automatically fetch secrets from Doppler. Otherwise, configure your environment secrets inside the local `.env` file manually.

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

*Note: Whenever you run a push command (`--push` or `--push-all`), the script automatically appends a root-level `"//"` comment and a canvas sticky note node (`Last Publish Info`) containing the current timestamp and latest git commit hash. These changes are saved back to your local files before being pushed to n8n, ensuring they are version-controlled.*

> [!NOTE]
> **Workflow Tagging:** The n8n Public API does not support managing workflow tags programmatically (the API treats tag associations as read-only). Workflows pushed via this script will deploy successfully but will remain untagged in the UI. You can manually categorize them in the n8n dashboard interface. In our production environment, tags are automatically injected into n8n's SQLite database via a separate server-side script.

---

## 🔗 Jobby Project Links
* **[README](README.md)** - Project overview, architecture, directives and guide.
* **[Changelog](CHANGELOG.md)** - Review releases and change history.
* **[Security Policy](SECURITY.md)** - View our security policy and vulnerability reporting instructions.
* **[License](LICENSE)** - View the MIT License terms.



