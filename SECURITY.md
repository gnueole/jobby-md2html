# Security Policy

*Author: Julien (Éole) Avarre (<hi@eole.me>)*


We take the security of Jobby seriously. If you believe you have found a security vulnerability, please report it to us privately so we can resolve it before public disclosure.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

Please do not open a public issue for security vulnerabilities. Instead, report them privately using one of the following methods:

1. **Email**: Send a detailed report to **hi+jobby@eole.me** (Julien Avarre).
2. **GitHub Security Advisory**: Submit a private advisory request directly on the GitHub repository at `https://github.com/gnueole/jobby-md2html/security/advisories/new`.

### What to Include in a Report
* A description of the vulnerability and its potential impact.
* Detailed steps to reproduce the issue (including any proofs of concept, sample requests, or payload scripts).
* Any recommended fixes or mitigations if you have them.

### Our Response Process
* **Acknowledgment**: We will acknowledge receipt of your report within 48 hours.
* **Triage**: We will investigate the issue and coordinate with you on confirmation and timeline.
* **Resolution**: If confirmed, we will develop a patch and release an update. We ask that you give us reasonable time to fix the issue before public disclosure.

## Client-Side Security & Sanitization

Jobby compiles Markdown to HTML on-the-fly inside the user's browser. To prevent Cross-Site Scripting (XSS) vulnerabilities (for instance, from malicious markdown text containing arbitrary `<script>` tags or event handlers):
- All compiled HTML is sanitized client-side using **DOMPurify** before being injected into the DOM.
- The sanitization configuration allows safe HTML elements and preserves the custom `data-token-index` synchronizer attributes while stripping out any malicious active content.
- Draft content remains strictly local to the user's browser via `localStorage` or local file handles.

---

## 🔗 Jobby Project Links
* **[README](README.md)** - Project overview, architecture, directives and guide.
* **[Installation Guide](INSTALL.md)** - Learn how to set up Jobby locally or via Docker.
* **[Changelog](CHANGELOG.md)** - Review releases and change history.
* **[License](LICENSE)** - View the MIT License terms.



