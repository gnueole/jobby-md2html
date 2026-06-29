/**
 * Jobby Markdown Editor - developer.js
 * Developer Tools brick loader, webhook, and config management.
 * Refactored from app.js to modularize the developer setup.
 */

import { showToast } from './utils.js';
import { updateBookmarkletLinks } from './bookmarklet.js';

let devToolsInitialized = false;
let devToolsOptions = {};

export async function loadDeveloperToolsBrick(token, appVersion) {
    if (devToolsInitialized) return true;

    const developerModal = document.getElementById('developer-modal');
    if (!developerModal) return false;

    try {
        const res = await fetch('/api/developer-tools-html', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            showToast("Unauthorized: Invalid Developer Token.");
            localStorage.removeItem('developer_token');
            return false;
        }

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const htmlText = await res.text();
        
        // Replace version dynamically
        const processedHtml = htmlText.replace(/{{VERSION}}/g, appVersion);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(processedHtml, 'text/html');
        developerModal.replaceChildren(...doc.body.childNodes);

        bindDeveloperToolsEvents();
        devToolsInitialized = true;
        return true;
    } catch (err) {
        console.error("Error loading developer tools brick:", err);
        showToast("Error loading Developer Tools.");
        return false;
    }
}

function bindDeveloperToolsEvents() {
    const developerModal = document.getElementById('developer-modal');
    const btnCloseDeveloperModal = document.getElementById('btn-close-developer-modal');
    const prodWebhookUrl = document.getElementById('prod-webhook-url');
    const prodWebhookToken = document.getElementById('prod-webhook-token');
    const devWebhookUrl = document.getElementById('dev-webhook-url');
    const devWebhookToken = document.getElementById('dev-webhook-token');
    const bookmarkletDragLinkProd = document.getElementById('bookmarklet-drag-link-prod');
    const bookmarkletDragLinkDev = document.getElementById('bookmarklet-drag-link-dev');
    const btnSaveDevSettings = document.getElementById('btn-save-dev-settings');

    // Load saved settings into fields
    prodWebhookUrl.value = localStorage.getItem('prod_webhook_url') || 'https://n8n.eole.me/webhook/cv-factory';
    prodWebhookToken.value = localStorage.getItem('prod_webhook_token') || '';
    devWebhookUrl.value = localStorage.getItem('dev_webhook_url') || 'http://localhost:5678/webhook/cv-factory';
    devWebhookToken.value = localStorage.getItem('dev_webhook_token') || '';

    const triggerUpdateLinks = () => {
        updateBookmarkletLinks(
            prodWebhookUrl.value, prodWebhookToken.value,
            devWebhookUrl.value, devWebhookToken.value,
            bookmarkletDragLinkProd, bookmarkletDragLinkDev
        );
    };

    prodWebhookUrl.addEventListener('input', triggerUpdateLinks);
    prodWebhookToken.addEventListener('input', triggerUpdateLinks);
    devWebhookUrl.addEventListener('input', triggerUpdateLinks);
    devWebhookToken.addEventListener('input', triggerUpdateLinks);

    // Initial compile of links
    triggerUpdateLinks();

    if (btnCloseDeveloperModal) {
        btnCloseDeveloperModal.addEventListener('click', () => {
            developerModal.classList.remove('show');
        });
    }

    if (btnSaveDevSettings) {
        btnSaveDevSettings.addEventListener('click', () => {
            const prodUrl = prodWebhookUrl.value.trim();
            const prodToken = prodWebhookToken.value.trim();
            const devUrl = devWebhookUrl.value.trim();
            const devToken = devWebhookToken.value.trim();

            localStorage.setItem('prod_webhook_url', prodUrl);
            localStorage.setItem('prod_webhook_token', prodToken);
            localStorage.setItem('dev_webhook_url', devUrl);
            localStorage.setItem('dev_webhook_token', devToken);

            localStorage.setItem('n8n_webhook_url', prodUrl);
            localStorage.setItem('n8n_webhook_token', prodToken);

            showToast("Settings saved successfully!");
            developerModal.classList.remove('show');
        });
    }

    // JSON Import/Export Event Handlers
    const btnExportJson = document.getElementById('btn-export-json');
    const btnImportJsonTrigger = document.getElementById('btn-import-json-trigger');
    const importJsonFile = document.getElementById('import-json-file');

    if (btnExportJson) {
        btnExportJson.addEventListener('click', () => {
            if (devToolsOptions.getStyleConfig) {
                const styleConfig = devToolsOptions.getStyleConfig();
                const configStr = JSON.stringify(styleConfig, null, 2);
                const blob = new Blob([configStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `jobby-config-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                showToast("Style configuration exported!");
            }
        });
    }

    if (btnImportJsonTrigger && importJsonFile) {
        btnImportJsonTrigger.addEventListener('click', () => {
            importJsonFile.click();
        });

        importJsonFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedConfig = JSON.parse(event.target.result);
                    if (importedConfig && typeof importedConfig === 'object') {
                        if (devToolsOptions.importConfig) {
                            devToolsOptions.importConfig(importedConfig);
                            showToast("Configuration imported successfully!");
                            developerModal.classList.remove('show');
                        }
                    } else {
                        alert("Invalid JSON format. Must be a style configuration object.");
                    }
                } catch (err) {
                    alert("Error parsing JSON: " + err.message);
                }
            };
            reader.readAsText(file);
            importJsonFile.value = '';
        });
    }
}

function renderAuthForm(developerModal, appVersion, updateSyncButtonState) {
    developerModal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <h2>Developer Authentication</h2>
                <button id="btn-close-developer-modal" class="modal-close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <p class="modal-desc">Please enter your Developer Token to access advanced sync and webhook configurations.</p>
                <div style="margin: 20px 0;">
                    <input type="password" id="dev-token-input" placeholder="Enter Developer Token" class="form-control" 
                           style="width: 100%; padding: 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-main); box-sizing: border-box;" />
                    <div id="auth-error-msg" style="display: none; color: #ef4444; margin-top: 8px; font-size: 13px;">
                        Invalid developer token.
                    </div>
                </div>
                <button id="btn-submit-auth" class="btn btn-primary" style="width: 100%; padding: 12px;">Authenticate</button>
            </div>
        </div>
    `;

    const btnClose = developerModal.querySelector('#btn-close-developer-modal');
    const inputToken = developerModal.querySelector('#dev-token-input');
    const btnSubmit = developerModal.querySelector('#btn-submit-auth');
    const errorMsg = developerModal.querySelector('#auth-error-msg');

    const handleAuth = async () => {
        const token = inputToken.value.trim();
        if (!token) return;

        errorMsg.style.display = 'none';
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Authenticating...';

        const loaded = await loadDeveloperToolsBrick(token, appVersion);
        if (loaded) {
            localStorage.setItem('developer_token', token);
            updateSyncButtonState();
        } else {
            errorMsg.style.display = 'block';
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Authenticate';
        }
    };

    if (btnClose) {
        btnClose.addEventListener('click', () => {
            developerModal.classList.remove('show');
        });
    }

    if (btnSubmit) {
        btnSubmit.addEventListener('click', handleAuth);
    }

    if (inputToken) {
        inputToken.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleAuth();
            }
        });
        // Auto-focus input
        setTimeout(() => inputToken.focus(), 100);
    }
}

export function initDeveloperTools(btnDeveloperToggle, developerModal, appVersion, updateSyncButtonState, options = {}) {
    devToolsOptions = options;
    if (btnDeveloperToggle) {
        btnDeveloperToggle.addEventListener('click', () => {
            const savedToken = localStorage.getItem('developer_token');
            
            const verifyAndOpen = async (token) => {
                const loaded = await loadDeveloperToolsBrick(token, appVersion);
                if (loaded) {
                    localStorage.setItem('developer_token', token);
                    updateSyncButtonState();
                    developerModal.classList.add('show');
                } else {
                    localStorage.removeItem('developer_token');
                    updateSyncButtonState();
                    renderAuthForm(developerModal, appVersion, updateSyncButtonState);
                    developerModal.classList.add('show');
                }
            };

            if (savedToken) {
                verifyAndOpen(savedToken);
            } else {
                renderAuthForm(developerModal, appVersion, updateSyncButtonState);
                developerModal.classList.add('show');
            }
        });
    }

    if (developerModal) {
        developerModal.addEventListener('click', (e) => {
            if (e.target === developerModal) developerModal.classList.remove('show');
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && developerModal && developerModal.classList.contains('show')) {
            developerModal.classList.remove('show');
        }
    });
}
