const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Determine port from environment or fallback to 3010
let port = 3010;
try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/^PORT=(\d+)/m);
        if (match) {
            port = parseInt(match[1], 10);
        }
    }
} catch (e) {
    console.warn('Could not parse PORT from .env, falling back to 3010:', e.message);
}

const baseUrl = `http://127.0.0.1:${port}/tutorial`;

async function runTutorialTests() {
    console.log(`\n======================================================`);
    console.log(`🧪 Starting Jobby Markdown Popup Tutorial E2E Tests`);
    console.log(`🌐 Target URL: ${baseUrl}`);
    console.log(`======================================================\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1200, height: 800 }
    });
    const page = await context.newPage();

    page.on('console', msg => {
        console.log(`   [Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    page.on('requestfailed', request => {
        console.log(`   [Request Failed] ${request.url()} - ${request.failure().errorText}`);
    });

    page.on('pageerror', err => {
        console.log(`   [Page Error] ${err.message}\n${err.stack}`);
    });

    page.on('response', response => {
        if (response.status() >= 400) {
            console.log(`   [HTTP Error] ${response.url()} - Status ${response.status()}`);
        }
    });

    try {
        console.log(`⏳ Loading tutorial route...`);
        await page.goto(baseUrl);
        
        // 1. Verify overlay and window are present
        console.log(`📌 Verifying tutorial overlay mounting...`);
        const overlay = page.locator('#tutorial-overlay');
        await overlay.waitFor({ state: 'visible', timeout: 5000 });
        console.log(`   ✅ Tutorial overlay mounted successfully.`);

        const headerTitle = page.locator('.header-title');
        const titleText = await headerTitle.textContent();
        console.log(`   ✅ Header Title reads: "${titleText}"`);
        if (titleText !== 'Markdown in 20 seconds') {
            throw new Error(`Expected header title "Markdown in 20 seconds", got "${titleText}"`);
        }

        // 2. Wait for animation to play and finish
        console.log(`⏳ Waiting for typewriter animation to complete (approx 10s)...`);
        const btnReplayActive = page.locator('#btn-replay:not([disabled])');
        
        // Wait until replay button is enabled (not disabled)
        await btnReplayActive.waitFor({ state: 'visible', timeout: 25000 });
        console.log(`   ✅ Typewriter animation complete, replay button is enabled.`);

        // 3. Verify preview contents
        console.log(`📌 Verifying preview contents...`);
        const h1 = page.locator('#tutorial-preview h1');
        const h2 = page.locator('#tutorial-preview h2');
        const pFirst = page.locator('#tutorial-preview p').first();
        const pLast = page.locator('#tutorial-preview p').last();

        const h1Text = await h1.textContent();
        const h2Text = await h2.textContent();
        const pFirstText = await pFirst.textContent();
        const pLastText = await pLast.textContent();

        console.log(`   ✅ Rendered H1: "${h1Text}"`);
        console.log(`   ✅ Rendered H2: "${h2Text}"`);
        console.log(`   ✅ Rendered Paragraph 1: "${pFirstText}"`);
        console.log(`   ✅ Rendered Paragraph 2: "${pLastText}"`);

        if (h1Text !== 'Markdown is Structure') throw new Error(`H1 text mismatch!`);
        if (h2Text !== 'Focus on content first') throw new Error(`H2 text mismatch!`);
        if (pFirstText !== 'No complex formatting, just plain text with simple marks.') throw new Error(`Paragraph 1 text mismatch!`);
        if (pLastText !== 'Your CV stays structured. Jobby handles the fancy rest.') throw new Error(`Paragraph 2 text mismatch!`);

        // 4. Test "Explain me again" (Replay)
        console.log(`📌 Testing "Explain me again" (Replay) button...`);
        const btnReplay = page.locator('#btn-replay');
        await btnReplay.click();
        
        // Should immediately become disabled
        const isBtnDisabled = await btnReplay.isDisabled();
        console.log(`   ✅ Replay button is disabled during re-run: ${isBtnDisabled}`);
        if (!isBtnDisabled) throw new Error(`Replay button should be disabled during animation!`);

        // Wait for it to complete again
        await btnReplayActive.waitFor({ state: 'visible', timeout: 25000 });
        console.log(`   ✅ Replay animation successfully completed.`);

        // 5. Test "Markdown is simple" (Exit)
        console.log(`📌 Testing "Markdown is simple" (Exit) button...`);
        const btnExit = page.locator('#btn-exit');
        await btnExit.click();

        // Overlay should unmount and show thankful toast
        console.log(`⏳ Waiting for Jobby toast notification...`);
        const toast = page.locator('#toast');
        await toast.waitFor({ state: 'visible', timeout: 5000 });
        const toastText = await toast.textContent();
        console.log(`   ✅ Toast notification reads: "${toastText}"`);
        if (!toastText.includes('ready for a modern Markdown CV editing')) {
            throw new Error(`Expected thankful toast notification, got "${toastText}"`);
        }

        // Overlay should be gone
        await overlay.waitFor({ state: 'detached', timeout: 5000 });
        console.log(`   ✅ Tutorial overlay unmounted successfully.`);

        console.log(`\n======================================================`);
        console.log(`🎉 SUCCESS: All tutorial popup tests passed!`);
        console.log(`======================================================\n`);

    } catch (e) {
        console.error(`❌ TEST FAILED:`, e.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

runTutorialTests();
