/**
 * Jobby Markdown Editor - developer.js
 * Developer Tools brick loader, webhook, and config management.
 * Refactored from app.js to modularize the developer setup.
 */

import { showToast } from './utils.js';
import { updateBookmarkletLinks } from './bookmarklet.js';

function formatUuid(val) {
    const clean = val.replace(/[^a-zA-Z0-9]/g, '');
    if (clean.length === 32) {
        return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
    }
    return val;
}

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

    const devDisableTelemetry = document.getElementById('dev-disable-telemetry');
    const notionDetectorDb = document.getElementById('notion-detector-db-id');
    const notionFeedbackDb = document.getElementById('notion-feedback-db-id');
    const notionTelemetryDb = document.getElementById('notion-telemetry-db-id');
    const notionAtomCvDb = document.getElementById('atom-cv-db-id');
    const notionSeedDb = document.getElementById('seed-db-id');

    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' || 
                  window.location.hostname.endsWith('.local');

    const detectorKey = isDev ? 'dev_notion_detector_db_id' : 'prod_notion_detector_db_id';
    const feedbackKey = isDev ? 'dev_notion_feedback_db_id' : 'prod_notion_feedback_db_id';
    const telemetryKey = isDev ? 'dev_notion_telemetry_db_id' : 'prod_notion_telemetry_db_id';
    const atomCvKey = isDev ? 'dev_atom_cv_db_id' : 'prod_atom_cv_db_id';
    const seedKey = isDev ? 'dev_seed_db_id' : 'prod_seed_db_id';

    // Load saved settings into fields
    prodWebhookUrl.value = localStorage.getItem('prod_webhook_url') || 'https://n8n.eole.me/webhook/cv-factory';
    prodWebhookToken.value = localStorage.getItem('prod_webhook_token') || '';
    devWebhookUrl.value = localStorage.getItem('dev_webhook_url') || 'http://localhost:5678/webhook-test/cv-factory';
    devWebhookToken.value = localStorage.getItem('dev_webhook_token') || '';
    
    if (notionDetectorDb) {
        notionDetectorDb.value = localStorage.getItem(detectorKey) || '';
    }
    if (notionFeedbackDb) {
        notionFeedbackDb.value = localStorage.getItem(feedbackKey) || '';
    }
    if (notionTelemetryDb) {
        notionTelemetryDb.value = localStorage.getItem(telemetryKey) || '';
    }
    if (notionAtomCvDb) {
        notionAtomCvDb.value = localStorage.getItem(atomCvKey) || '';
    }
    if (notionSeedDb) {
        notionSeedDb.value = localStorage.getItem(seedKey) || '';
    }

    const dbInputs = [notionDetectorDb, notionFeedbackDb, notionTelemetryDb, notionAtomCvDb, notionSeedDb];
    const formatDbInput = (input) => {
        if (!input) return;
        const val = input.value.trim();
        const formatted = formatUuid(val);
        if (formatted !== val) {
            input.value = formatted;
        }
    };

    dbInputs.forEach(input => {
        if (!input) return;
        formatDbInput(input);
        input.addEventListener('blur', () => formatDbInput(input));
        input.addEventListener('input', () => formatDbInput(input));
    });

    if (devDisableTelemetry) {
        devDisableTelemetry.checked = localStorage.getItem('jobby_telemetry_disabled') === 'true';
    }

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

    const fetchDbMappingsFromN8n = async () => {
        const urlKey = isDev ? 'dev_webhook_url' : 'prod_webhook_url';
        const tokenKey = isDev ? 'dev_webhook_token' : 'prod_webhook_token';

        let url = localStorage.getItem(urlKey) || '';
        const token = localStorage.getItem(tokenKey) || '';
        if (!url) return;

        url = url.replace(/\/cv-factory\/?$/, '/jobby-sync');

        const btnFetch = document.getElementById('btn-fetch-db-mappings');
        if (btnFetch) {
            btnFetch.disabled = true;
            btnFetch.textContent = '🔄 Fetching...';
        }

        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const res = await fetch(url, { method: 'GET', headers });
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    if (data.notion_detector_db_id && notionDetectorDb) {
                        notionDetectorDb.value = data.notion_detector_db_id;
                        localStorage.setItem(detectorKey, data.notion_detector_db_id);
                    }
                    if (data.notion_feedback_db_id && notionFeedbackDb) {
                        notionFeedbackDb.value = data.notion_feedback_db_id;
                        localStorage.setItem(feedbackKey, data.notion_feedback_db_id);
                    }
                    if (data.notion_telemetry_db_id && notionTelemetryDb) {
                        notionTelemetryDb.value = data.notion_telemetry_db_id;
                        localStorage.setItem(telemetryKey, data.notion_telemetry_db_id);
                    }
                    if (data.atom_cv_db_id && notionAtomCvDb) {
                        notionAtomCvDb.value = data.atom_cv_db_id;
                        localStorage.setItem(atomCvKey, data.atom_cv_db_id);
                    }
                    if (data.seed_db_id && notionSeedDb) {
                        notionSeedDb.value = data.seed_db_id;
                        localStorage.setItem(seedKey, data.seed_db_id);
                    }
                    showToast("Retrieved database mappings from n8n!");
                }
            } else {
                console.warn('[Developer] GET /jobby-sync failed:', res.status);
            }
        } catch (err) {
            console.error('[Developer] Error fetching from n8n:', err);
        } finally {
            if (btnFetch) {
                btnFetch.disabled = false;
                btnFetch.textContent = '🔄 Fetch from n8n';
            }
        }
    };

    const btnFetchDbMappings = document.getElementById('btn-fetch-db-mappings');
    if (btnFetchDbMappings) {
        btnFetchDbMappings.addEventListener('click', fetchDbMappingsFromN8n);
    }

    const btnSyncDevSettings = document.getElementById('btn-sync-dev-settings');
    if (btnSyncDevSettings) {
        btnSyncDevSettings.addEventListener('click', async () => {
            const urlKey = isDev ? 'dev_webhook_url' : 'prod_webhook_url';
            const tokenKey = isDev ? 'dev_webhook_token' : 'prod_webhook_token';

            let url = localStorage.getItem(urlKey) || '';
            const token = localStorage.getItem(tokenKey) || '';
            if (!url) {
                showToast("Please configure Webhook URL first!");
                return;
            }

            url = url.replace(/\/cv-factory\/?$/, '/jobby-sync');

            const payload = {
                config: devToolsOptions.getStyleConfig ? devToolsOptions.getStyleConfig() : {},
                css: devToolsOptions.getTemplatesCss ? devToolsOptions.getTemplatesCss() : "",
                variables: {
                    notion_detector_db_id: notionDetectorDb.value.trim(),
                    notion_feedback_db_id: notionFeedbackDb.value.trim(),
                    notion_telemetry_db_id: notionTelemetryDb.value.trim(),
                    atom_cv_db_id: notionAtomCvDb.value.trim(),
                    seed_db_id: notionSeedDb.value.trim()
                }
            };

            btnSyncDevSettings.disabled = true;
            const originalText = btnSyncDevSettings.textContent;
            btnSyncDevSettings.textContent = "Syncing...";

            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    showToast("Settings and design synced to n8n!");
                    
                    localStorage.setItem(detectorKey, notionDetectorDb.value.trim());
                    localStorage.setItem(feedbackKey, notionFeedbackDb.value.trim());
                    localStorage.setItem(telemetryKey, notionTelemetryDb.value.trim());
                    localStorage.setItem(atomCvKey, notionAtomCvDb.value.trim());
                    localStorage.setItem(seedKey, notionSeedDb.value.trim());
                } else {
                    throw new Error("HTTP " + res.status);
                }
            } catch (err) {
                console.error('[Developer] Sync failed:', err);
                showToast("Sync failed: " + err.message);
            } finally {
                btnSyncDevSettings.disabled = false;
                btnSyncDevSettings.textContent = originalText;
            }
        });
    }

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
            
            if (notionDetectorDb) {
                localStorage.setItem(detectorKey, notionDetectorDb.value.trim());
            }
            if (notionFeedbackDb) {
                localStorage.setItem(feedbackKey, notionFeedbackDb.value.trim());
            }
            if (notionTelemetryDb) {
                localStorage.setItem(telemetryKey, notionTelemetryDb.value.trim());
            }
            if (notionAtomCvDb) {
                localStorage.setItem(atomCvKey, notionAtomCvDb.value.trim());
            }
            if (notionSeedDb) {
                localStorage.setItem(seedKey, notionSeedDb.value.trim());
            }

            if (devDisableTelemetry) {
                localStorage.setItem('jobby_telemetry_disabled', devDisableTelemetry.checked ? 'true' : 'false');
            }

            showToast("Settings saved successfully!");
        });
    }

    // Auto-fetch settings from n8n on load
    setTimeout(fetchDbMappingsFromN8n, 200);

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
            window.history.pushState(null, '', '/');
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

export async function openDeveloperTools(developerModal, appVersion, updateSyncButtonState) {
    window.history.pushState(null, '', '/developer');
    const savedToken = localStorage.getItem('developer_token');
    
    if (savedToken) {
        const loaded = await loadDeveloperToolsBrick(savedToken, appVersion);
        if (loaded) {
            updateSyncButtonState();
            developerModal.classList.add('show');
        } else {
            localStorage.removeItem('developer_token');
            updateSyncButtonState();
            renderAuthForm(developerModal, appVersion, updateSyncButtonState);
            developerModal.classList.add('show');
        }
    } else {
        renderAuthForm(developerModal, appVersion, updateSyncButtonState);
        developerModal.classList.add('show');
    }
}

export function initDeveloperTools(btnDeveloperToggle, developerModal, appVersion, updateSyncButtonState, options = {}) {
    devToolsOptions = options;
    if (btnDeveloperToggle) {
        btnDeveloperToggle.addEventListener('click', () => {
            openDeveloperTools(developerModal, appVersion, updateSyncButtonState);
        });
    }

    if (developerModal) {
        developerModal.addEventListener('click', (e) => {
            if (e.target === developerModal) {
                developerModal.classList.remove('show');
                window.history.pushState(null, '', '/');
            }
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && developerModal && developerModal.classList.contains('show')) {
            developerModal.classList.remove('show');
            window.history.pushState(null, '', '/');
        }
    });
}
