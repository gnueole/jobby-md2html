# Jobby n8n Workflows Guide

This directory contains the production-ready n8n workflow configurations used to automate resume scraping, AI tailoring, Gotenberg PDF compilation, telemetry tracking, and feedback capture.

---

## 📁 Workflow Manifest

The following JSON files define the n8n workflows:

1. **`jobby-linkedin-to-notion-prod.json`**
   * **Role**: Parses data incoming from the scraper bookmarklet.
   * **Action**: Extracts job title, description, company, and URL, and inserts a new entry in your **Notion Collect Table**.
2. **`jobby-pdf-dynamic-prod.json` & `jobby-pdf-static-prod.json`**
   * **Role**: PDF compiler orchestration.
   * **Action**: Fetches Markdown text and style customizer JSON values, posts them to the Gotenberg API container, and saves the generated A4 PDF file back to Notion or local storage.
3. **`jobby-telemetry-to-notion-prod.json`**
   * **Role**: Anonymous editor metrics harvester.
   * **Action**: Logs events (editor session started, PDF prints, ATS score calculations, tutorial runs) into a Notion metrics table.
4. **`jobby-feedback-to-notion-prod.json`**
   * **Role**: Captures user feedback.
   * **Action**: Proxies name, rating stars, category, and review text from the editor header form into a **Jobby Feedback** Notion database.
5. **`jobby-sync-conf-prod.json`**
   * **Role**: System synchronization configuration handler.

---

## 🗄️ Notion Database Architectures

To use these workflows, your Notion workspace must be structured with two key databases:

### 1. Notion CV DB (Baseline & Styles)
Stores the master version of your resumes and layout profiles.
* **Fields**:
  * `Title` (Title): Profile name (e.g. "Fullstack Developer").
  * `Content` (Text): The raw Markdown text of the resume.
  * `Config` (Text): JSON string of customizer spacing, padding, and colors.

### 2. Notion Collect Table (Job Inbox)
Collects scraped jobs and holds the tailored result.
* **Fields**:
  * `Job Title` (Title): Scraped job name.
  * `Company` (Select/Text): Employer name.
  * `URL` (URL): Job post hyperlink.
  * `Description` (Text): Scraped text block.
  * `Bespoke Content` (Text): Markdown resume adjusted by the AI matching agent.

---

## 🛠️ Syncing Workflows (CLI Toolkit)

Workflows are managed, backed up, and published using `toolkit/sync_n8n.py`.

### Prerequisites
Initialize local settings and verify your environment by running:
```bash
make configure
```

### Commands

* **Backup from production**: Pulls all remote workflows into this directory.
  ```bash
  python3 toolkit/sync_n8n.py --backup-all
  ```
* **Publish to local development n8n**: Imports files into your local Docker instance.
  ```bash
  python3 toolkit/sync_n8n.py --push-all --dev
  ```

*Note: Whenever you push workflows, the sync tool automatically appends git commit metadata and publish timestamps directly into the workflow canvas notes.*
