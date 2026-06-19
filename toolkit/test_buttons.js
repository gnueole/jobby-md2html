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

const baseUrl = `http://127.0.0.1:${port}`;

async function runTests() {
    console.log(`\n======================================================`);
    console.log(`🧪 Starting Jobby Editor Header Non-Regression Tests`);
    console.log(`🌐 Target URL: ${baseUrl}`);
    console.log(`======================================================\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let dialogCount = 0;
    
    // Auto-accept all window.confirm dialogs
    page.on('dialog', async dialog => {
        console.log(`   [Dialog Intercepted] Type: ${dialog.type()}, Message: "${dialog.message()}"`);
        dialogCount++;
        await dialog.accept();
    });

    try {
        // 1. Load Page
        console.log('⏳ Loading Jobby editor page...');
        await page.goto(baseUrl);
        await page.waitForSelector('#markdown-input');
        console.log('✅ Page loaded successfully.\n');

        // 2. Test "What is Markdown?"
        console.log('📌 Test: "What is Markdown?" button...');
        const helpBtn = page.locator('#btn-markdown-help-header');
        const helpModal = page.locator('#help-modal');
        
        await helpBtn.click();
        await page.waitForTimeout(300); // Wait for CSS transition
        const isHelpOpen = await helpModal.evaluate(el => el.classList.contains('show'));
        if (isHelpOpen) {
            console.log('   ✅ Help modal opened successfully.');
        } else {
            throw new Error('Help modal failed to open.');
        }
        
        // Close modal
        await page.click('#help-modal .modal-close-btn');
        await page.waitForTimeout(300);
        const isHelpClosed = await helpModal.evaluate(el => !el.classList.contains('show'));
        if (isHelpClosed) {
            console.log('   ✅ Help modal closed successfully.\n');
        } else {
            throw new Error('Help modal failed to close.');
        }

        // 3. Test "Format" toolbar toggle
        console.log('📌 Test: "Format" toolbar toggle button...');
        const toggleToolbarBtn = page.locator('#btn-toggle-toolbar');
        const toolbar = page.locator('#editor-toolbar');
        
        const initialHidden = await toolbar.evaluate(el => el.classList.contains('hidden'));
        
        // Toggle once
        await toggleToolbarBtn.click();
        await page.waitForTimeout(100);
        const state1Hidden = await toolbar.evaluate(el => el.classList.contains('hidden'));
        if (state1Hidden !== initialHidden) {
            console.log(`   ✅ Toolbar visibility toggled (now ${state1Hidden ? 'hidden' : 'visible'}).`);
        } else {
            throw new Error('Toolbar failed to toggle visibility.');
        }

        // Toggle back
        await toggleToolbarBtn.click();
        await page.waitForTimeout(100);
        const state2Hidden = await toolbar.evaluate(el => el.classList.contains('hidden'));
        if (state2Hidden === initialHidden) {
            console.log('   ✅ Toolbar toggled back to original state.\n');
        } else {
            throw new Error('Toolbar failed to toggle back.');
        }

        // 4. Test "Save" button
        console.log('📌 Test: "Save" bank button...');
        const testContent = '# Test Non-Regression Jobby';
        await page.fill('#markdown-input', testContent);
        await page.click('#btn-save-bank');
        
        // Check local storage
        const savedMd = await page.evaluate(() => localStorage.getItem('ats_banked_markdown'));
        if (savedMd === testContent) {
            console.log('   ✅ Markdown successfully saved to localStorage (ats_banked_markdown).');
        } else {
            throw new Error(`LocalStorage content mismatch: expected "${testContent}" but got "${savedMd}"`);
        }
        
        // Check toast notification
        const toast = page.locator('#toast');
        await toast.waitFor({ state: 'visible', timeout: 2000 });
        const toastText = await toast.textContent();
        if (toastText.includes('saved to local bank')) {
            console.log('   ✅ Toast notification displayed correctly.\n');
        } else {
            throw new Error(`Unexpected toast message: "${toastText}"`);
        }
        await page.waitForTimeout(1000); // Let toast fade

        // 5. Test "Clear" button
        console.log('📌 Test: "Clear" button...');
        const clearDialogsBefore = dialogCount;
        await page.click('#btn-clear');
        if (dialogCount > clearDialogsBefore) {
            console.log('   ✅ Confirm dialog intercept occurred and accepted.');
        }
        
        const afterClearVal = await page.inputValue('#markdown-input');
        if (afterClearVal === '') {
            console.log('   ✅ Editor content successfully cleared.\n');
        } else {
            throw new Error('Editor was not cleared.');
        }

        // 6. Test "Load" button
        console.log('📌 Test: "Load" bank button...');
        const loadDialogsBefore = dialogCount;
        await page.click('#btn-load-bank');
        if (dialogCount > loadDialogsBefore) {
            console.log('   ✅ Confirm dialog intercept occurred and accepted.');
        }
        
        const afterLoadVal = await page.inputValue('#markdown-input');
        if (afterLoadVal === testContent) {
            console.log('   ✅ Banked markdown successfully restored to editor.\n');
        } else {
            throw new Error(`Editor content loaded mismatch: expected "${testContent}" but got "${afterLoadVal}"`);
        }

        // 7. Test "Sample" button
        console.log('📌 Test: "Sample" button...');
        const sampleDialogsBefore = dialogCount;
        await page.click('#btn-load-sample');
        if (dialogCount > sampleDialogsBefore) {
            console.log('   ✅ Confirm dialog intercept occurred and accepted.');
        }
        
        await page.waitForTimeout(500); // Wait for fetch
        const sampleVal = await page.inputValue('#markdown-input');
        if (sampleVal.includes('Julien Avarre') || sampleVal.includes('resume')) {
            console.log('   ✅ Default resume sample loaded successfully.\n');
        } else {
            throw new Error('Sample content not found in editor.');
        }

        // 8. Test "What\'s New" button
        console.log('📌 Test: "What\'s New" button...');
        const changelogDialogsBefore = dialogCount;
        await page.click('#btn-load-changelog');
        if (dialogCount > changelogDialogsBefore) {
            console.log('   ✅ Confirm dialog intercept occurred and accepted.');
        }
        
        await page.waitForTimeout(500); // Wait for fetch
        const changelogVal = await page.inputValue('#markdown-input');
        if (changelogVal.includes('Jobby') || changelogVal.length > 50) {
            console.log('   ✅ Changelog / What\'s New loaded successfully.\n');
        } else {
            throw new Error('Changelog content not found in editor.');
        }

        // 9. Test "Copy" button
        console.log('📌 Test: "Copy" button...');
        await page.click('#btn-copy-md');
        await toast.waitFor({ state: 'visible', timeout: 2000 });
        const copyToastText = await toast.textContent();
        if (copyToastText.includes('copied to clipboard')) {
            console.log('   ✅ Toast copy notification displayed correctly.\n');
        } else {
            throw new Error(`Unexpected copy toast message: "${copyToastText}"`);
        }

        console.log(`======================================================`);
        console.log(`🎉 SUCCESS: All editor header button tests passed!`);
        console.log(`======================================================\n`);
    } catch (error) {
        console.error(`\n❌ TEST FAILURE:`);
        console.error(error);
        console.log(`======================================================\n`);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

runTests();
