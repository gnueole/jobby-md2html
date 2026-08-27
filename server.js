const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Read version from package.json dynamically as the single source of truth
let appVersion = '1.9.0';
try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    appVersion = pkg.version;
} catch (e) {
    console.error('Error loading version from package.json:', e);
}

// Load .env file manually if it exists
const envPaths = [
    path.join(__dirname, '.env')
];


for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split(/\r?\n/).forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return;
                const match = trimmed.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    let val = match[2].trim();
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    if (!process.env[key]) {
                        process.env[key] = val;
                    }
                }
            });
            break;
        } catch (e) {
            console.error(`Error loading env file ${envPath}:`, e);
        }
    }
}

const PORT = parseInt(process.env.PORT, 10) || 3010;

// Initialize developer token securely
const serverToken = process.env.N8N_WEBHOOK_TOKEN || process.env.X_N8N_TOKEN || crypto.randomBytes(24).toString('hex');
if (!process.env.N8N_WEBHOOK_TOKEN && !process.env.X_N8N_TOKEN) {
    console.warn(`[WARNING] Neither N8N_WEBHOOK_TOKEN nor X_N8N_TOKEN environment variable is set. A temporary random developer token has been generated: ${serverToken}`);
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Add CORS headers for development safety
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Resolve file path safely and strip query parameters/hash
    let cleanUrl = req.url.split('?')[0].split('#')[0];

    // SPA routing: redirect /sample, /whatsnew, /tutorial, and /developer paths to serve the main index.html
    if (cleanUrl === '/sample' || cleanUrl === '/sample/' || 
        cleanUrl === '/whatsnew' || cleanUrl === '/whatsnew/' ||
        cleanUrl === '/tutorial' || cleanUrl === '/tutorial/' ||
        cleanUrl === '/developer' || cleanUrl === '/developer/') {
        cleanUrl = '/';
    }

    if (cleanUrl === '/api/pdf') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Method Not Allowed');
            return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            let payload;
            try { payload = JSON.parse(body); } catch(e) { payload = {}; }

            const htmlContent = payload.html;
            const paperFormat = payload.paperFormat || 'A4';
            const filename = payload.filename || 'resume';

            if (!htmlContent) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Missing HTML content');
                return;
            }

            // Map paper format to gotenberg fields
            let paperWidth = 8.27; // A4
            let paperHeight = 11.69; // A4
            if (paperFormat.toLowerCase() === 'letter') {
                paperWidth = 8.5;
                paperHeight = 11.0;
            } else if (paperFormat.toLowerCase() === 'legal') {
                paperWidth = 8.5;
                paperHeight = 14.0;
            } else if (paperFormat.toLowerCase() === 'a5') {
                paperWidth = 5.83;
                paperHeight = 8.27;
            }

            const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
            const parts = [];

            // Add files field with index.html
            parts.push(Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="files"; filename="index.html"\r\n` +
                `Content-Type: text/html\r\n\r\n` +
                `${htmlContent}\r\n`
            ));

            // Add emulatedMediaType field (so it applies @media print styles!)
            parts.push(Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="emulatedMediaType"\r\n\r\n` +
                `print\r\n`
            ));

            // Add printBackground field to render background colors/gradients
            parts.push(Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="printBackground"\r\n\r\n` +
                `true\r\n`
            ));

            // Add paperWidth
            parts.push(Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="paperWidth"\r\n\r\n` +
                `${paperWidth}\r\n`
            ));

            // Add paperHeight
            parts.push(Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="paperHeight"\r\n\r\n` +
                `${paperHeight}\r\n`
            ));

            // Add zero margins
            parts.push(Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="marginTop"\r\n\r\n` +
                `0\r\n`
            ));
            parts.push(Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="marginBottom"\r\n\r\n` +
                `0\r\n`
            ));
            parts.push(Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="marginLeft"\r\n\r\n` +
                `0\r\n`
            ));
            parts.push(Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="marginRight"\r\n\r\n` +
                `0\r\n`
            ));

            parts.push(Buffer.from(`--${boundary}--\r\n`));

            const bodyBuffer = Buffer.concat(parts);

            const gotenbergUrl = process.env.GOTENBERG_URL || 'http://gotenberg:3000';
            let parsedUrl;
            try {
                parsedUrl = new URL(gotenbergUrl + '/forms/chromium/convert/html');
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`Invalid Gotenberg URL configuration: ${err.message}`);
                return;
            }

            const gotenbergReq = http.request({
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || 80,
                path: parsedUrl.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': bodyBuffer.length
                }
            }, (gotenbergRes) => {
                if (gotenbergRes.statusCode === 200) {
                    res.writeHead(200, {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.pdf"`
                    });
                    gotenbergRes.pipe(res);
                } else {
                    let errBody = '';
                    gotenbergRes.on('data', chunk => { errBody += chunk.toString(); });
                    gotenbergRes.on('end', () => {
                        console.error('[Gotenberg Error]:', errBody);
                        res.writeHead(gotenbergRes.statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
                        res.end(`Gotenberg PDF conversion failed: ${errBody}`);
                    });
                }
            });

            gotenbergReq.on('error', (err) => {
                console.error('[Gotenberg Connection Error]:', err);
                res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`Gotenberg service not reachable. Check if the container is running: ${err.message}`);
            });

            gotenbergReq.write(bodyBuffer);
            gotenbergReq.end();
        });
        return;
    }

    if (cleanUrl === '/api/verify-token') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Method Not Allowed');
            return;
        }
        
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            let payload;
            try { payload = JSON.parse(body); } catch(e) { payload = {}; }
            
            if (payload.token === serverToken) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true }));
            } else {
                res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
            }
        });
        return;
    }

    if (cleanUrl === '/api/telemetry') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Method Not Allowed');
            return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            let payload;
            try { payload = JSON.parse(body); } catch(e) { payload = {}; }

            // Respond to client immediately to prevent blocking
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true }));

            // Skip sending in development environment
            const env = process.env.DOPPLER_ENVIRONMENT || 'prod';
            if (env === 'dev') {
                console.log('[Telemetry Skip - DEV] Bypassed forwarding in development');
                return;
            }

            // Asynchronously forward to n8n webhook
            const webhookUrl = process.env.N8N_TELEMETRY_WEBHOOK_URL;
            if (webhookUrl && webhookUrl.trim() !== "") {
                try {
                    const parsedUrl = new URL(webhookUrl);
                    const protocol = parsedUrl.protocol === 'https:' ? require('https') : require('http');
                    const payloadString = JSON.stringify(payload);
                    const reqOpts = {
                        hostname: parsedUrl.hostname,
                        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                        path: parsedUrl.pathname + parsedUrl.search,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(payloadString)
                        },
                        timeout: 5000
                    };

                    const forwardReq = protocol.request(reqOpts, (forwardRes) => {
                        forwardRes.resume(); // consume response
                    });

                    forwardReq.on('error', (err) => {
                        console.error('[Telemetry] Failed to forward to n8n:', err.message);
                    });

                    forwardReq.on('timeout', () => {
                        console.warn('[Telemetry] Forwarding request timed out');
                        forwardReq.destroy();
                    });

                    forwardReq.write(payloadString);
                    forwardReq.end();
                } catch (e) {
                    console.error('[Telemetry] Invalid webhook URL or request setup error:', e.message);
                }
            }

            // Asynchronously forward to Vector
            const vectorUrl = process.env.VECTOR_TELEMETRY_URL;
            if (vectorUrl && vectorUrl.trim() !== "") {
                try {
                    const parsedUrl = new URL(vectorUrl);
                    const protocol = parsedUrl.protocol === 'https:' ? require('https') : require('http');
                    const payloadString = JSON.stringify(payload);
                    const reqOpts = {
                        hostname: parsedUrl.hostname,
                        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                        path: parsedUrl.pathname + parsedUrl.search,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(payloadString)
                        },
                        timeout: 5000
                    };

                    const forwardReq = protocol.request(reqOpts, (forwardRes) => {
                        forwardRes.resume(); // consume response
                    });

                    forwardReq.on('error', (err) => {
                        console.error('[Telemetry] Failed to forward to Vector:', err.message);
                    });

                    forwardReq.on('timeout', () => {
                        console.warn('[Telemetry] Forwarding request to Vector timed out');
                        forwardReq.destroy();
                    });

                    forwardReq.write(payloadString);
                    forwardReq.end();
                } catch (e) {
                    console.error('[Telemetry] Invalid Vector URL or request setup error:', e.message);
                }
            }
        });
        return;
    }

    if (cleanUrl === '/api/feedback') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Method Not Allowed');
            return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            let payload;
            try { payload = JSON.parse(body); } catch(e) { payload = {}; }

            // Inject app identifier for unified feedback workflow
            payload.app = "jobby";

            // Respond to client immediately to prevent blocking
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true }));

            // Asynchronously forward to n8n feedback webhook.
            // Container-internal address, not the public hostname. The VPS
            // /etc/hosts maps n8n.eole.me to 127.0.1.1, and every container
            // inherits that resolution, so https://n8n.eole.me answers
            // ECONNREFUSED from in here. n8n-server is the container name on
            // eole_shared_network.
            // The fallback matters too: with no value the guard below holds and
            // the feedback is dropped without a trace.
            const webhookUrl = process.env.N8N_FEEDBACK_WEBHOOK_URL || 'http://n8n-server:5678/webhook/feedback';
            if (webhookUrl && webhookUrl.trim() !== "") {
                try {
                    const parsedUrl = new URL(webhookUrl);
                    const protocol = parsedUrl.protocol === 'https:' ? require('https') : require('http');
                    const payloadString = JSON.stringify(payload);
                    const reqOpts = {
                        hostname: parsedUrl.hostname,
                        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                        path: parsedUrl.pathname + parsedUrl.search,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(payloadString)
                        },
                        timeout: 5000
                    };

                    const forwardReq = protocol.request(reqOpts, (forwardRes) => {
                        forwardRes.resume(); // consume response
                    });

                    forwardReq.on('error', (err) => {
                        console.error('[Feedback] Failed to forward to n8n:', err.message);
                    });

                    forwardReq.on('timeout', () => {
                        console.warn('[Feedback] Forwarding request timed out');
                        forwardReq.destroy();
                    });

                    forwardReq.write(payloadString);
                    forwardReq.end();
                } catch (e) {
                    console.error('[Feedback] Invalid webhook URL or request setup error:', e.message);
                }
            }
        });
        return;
    }

    if (cleanUrl === '/api/developer-tools-html') {
        if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Method Not Allowed');
            return;
        }

        const authHeader = req.headers['authorization'] || '';
        let token = '';
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7).trim();
        }

        if (token && token === serverToken) {
            const fs = require('fs');
            const brickPath = path.join(__dirname, 'private-bricks', 'developer-modal.html');
            fs.readFile(brickPath, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('Error loading developer brick');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(data);
            });
        } else {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
        }
        return;
    }


    if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method Not Allowed');
        return;
    }

    if (cleanUrl === '/api/config') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        const rawTagId = process.env.GOOGLE_TAG_ID || process.env.NEXT_PUBLIC_GA_ID || "";
        const googleTagId = rawTagId.trim().replace(/^['"]|['"]$/g, "");
        res.end(JSON.stringify({ GOOGLE_TAG_ID: googleTagId, VERSION: appVersion }));
        return;
    }

    if (cleanUrl === '/bookmarklet.js') {
        const fs = require('fs');
        const bookmarkletPath = path.join(__dirname, 'toolkit', 'bookmarklet.js');
        fs.readFile(bookmarkletPath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Error loading bookmarklet source');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
            res.end(data);
        });
        return;
    }

    let decodedUrl;
    try {
        decodedUrl = decodeURIComponent(cleanUrl);
    } catch (e) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Bad Request');
        return;
    }

    // Resolve absolute path to the file
    const rootDir = path.resolve(__dirname, 'public');
    const safeRootDir = rootDir.endsWith(path.sep) ? rootDir : rootDir + path.sep;
    const filePath = path.normalize(path.resolve(rootDir, decodedUrl === '/' ? 'index.html' : '.' + decodedUrl));

    // Security check: ensure path is within the workspace root and not escaping it
    const relative = path.relative(rootDir, filePath);
    const isSafe = !relative.startsWith('..') && !path.isAbsolute(relative) && (filePath === rootDir || filePath.startsWith(safeRootDir));

    if (!isSafe) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        if (filePath.endsWith('index.html')) {
            fs.readFile(filePath, 'utf8', (err, html) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('Internal Server Error');
                    return;
                }
                let modifiedHtml = html.replace(/\?v=[0-9.]+/g, `?v=${appVersion}`);
                
                // Server-side SEO overrides for the tutorial route (social sharing & crawler support)
                const requestedPath = req.url.split('?')[0].split('#')[0];
                if (requestedPath === '/tutorial' || requestedPath === '/tutorial/') {
                    modifiedHtml = modifiedHtml
                        .replace('<title>Jobby - Premium ATS-Compliant Markdown Resume Editor</title>', '<title>Jobby - 20-Second Interactive Markdown CV Tutorial</title>')
                        .replace('<meta name="description" content="Jobby is a premium, open-source Markdown resume editor designed for ATS compliance. Tailor your CV in real-time with custom typography, spacing controls, and print-ready PDF export.">', '<meta name="description" content="Learn how to build an ATS-compliant resume in 20 seconds with standard Markdown. Watch Jobby parse CV text in real-time and export to print-ready PDF.">')
                        .replace('<link rel="canonical" href="https://cv.eole.me">', '<link rel="canonical" href="https://cv.eole.me/tutorial">')
                        .replace('<meta property="og:url" content="https://cv.eole.me">', '<meta property="og:url" content="https://cv.eole.me/tutorial">')
                        .replace('<meta property="og:title" content="Jobby - Premium ATS-Compliant Markdown Resume Editor">', '<meta property="og:title" content="Jobby - 20-Second Interactive Markdown CV Tutorial">')
                        .replace('<meta property="og:description" content="Create a recruitment-ready, ATS-compliant resume in real-time. Standard Markdown, real-time spacing controls, and clean PDF output.">', '<meta property="og:description" content="Learn how to build an ATS-compliant resume in 20 seconds with standard Markdown. Watch Jobby parse CV text in real-time and export to print-ready PDF.">')
                        .replace('<meta property="twitter:url" content="https://cv.eole.me">', '<meta property="twitter:url" content="https://cv.eole.me/tutorial">')
                        .replace('<meta property="twitter:title" content="Jobby - Premium ATS-Compliant Markdown Resume Editor">', '<meta property="twitter:title" content="Jobby - 20-Second Interactive Markdown CV Tutorial">')
                        .replace('<meta property="twitter:description" content="Create a recruitment-ready, ATS-compliant resume in real-time. Standard Markdown, real-time spacing controls, and clean PDF output.">', '<meta property="twitter:description" content="Learn how to build an ATS-compliant resume in 20 seconds with standard Markdown. Watch Jobby parse CV text in real-time and export to print-ready PDF.">');
                }

                res.writeHead(200, { 'Content-Type': contentType });
                res.end(modifiedHtml);
            });
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        }
    });
});

const os = require('os');
const isWSL = os.release().toLowerCase().includes('microsoft');
const HOST = process.env.HOST || (isWSL || fs.existsSync('/.dockerenv') ? '::' : '127.0.0.1');

server.listen(PORT, HOST, () => {
    const displayHost = HOST === '::' ? 'localhost' : HOST;
    console.log(`jobby MD Editor Server running at http://${displayHost}:${PORT}`);
});
