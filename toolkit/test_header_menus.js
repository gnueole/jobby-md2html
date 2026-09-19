const { chromium } = require('playwright');

// Non-regression test for the dropdown menus in the panel headers, against a local server:
//   npm run dev                                   (or: PORT=3010 node server.js)
//   node toolkit/test_header_menus.js             (BASE_URL overrides the address)
// Exits non-zero on any failure.
//
// Until 1.15.1 the Save menu opened *under* the editor: the header's backdrop blur made
// it a stacking context, so a click on "Save" landed in the textarea and nothing
// happened. Checking that the menu is "visible" does not catch that; only a real mouse
// click on each option, and checking what sits under the pointer, does.
// Run it on a secure origin (127.0.0.1 or https): Chrome hides the file pickers elsewhere.

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3010';

async function run() {
    console.log(`\n🧪 Header menu tests against ${baseUrl}\n`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await context.addInitScript(() => {
        localStorage.setItem('jobby_telemetry_disabled', 'true');
        // Stand-ins for the native pickers, which headless Chrome cannot show
        window.__calls = [];
        const handle = name => ({
            name,
            getFile: async () => new File(['# Opened\n'], name),
            createWritable: async () => {
                window.__calls.push('write');
                return { write: async () => {}, close: async () => {} };
            },
            queryPermission: async () => 'granted',
            requestPermission: async () => 'granted',
        });
        window.showSaveFilePicker = async o => {
            window.__calls.push('save-picker');
            return handle((o && o.suggestedName) || 'resume.md');
        };
        window.showOpenFilePicker = async () => {
            window.__calls.push('open-picker');
            return [handle('opened.md')];
        };
    });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    let failures = 0;
    const calls = () => page.evaluate(() => window.__calls.slice());

    // What the pointer would hit at the centre of an element
    async function topmostIs(selector) {
        return page.evaluate(sel => {
            const el = document.querySelector(sel);
            const r = el.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return !!hit && (hit === el || el.contains(hit));
        }, selector);
    }

    async function clickOption(label, toggle, option, expectedCall) {
        await page.click(toggle);
        await page.waitForTimeout(400);
        const onTop = await topmostIs(option);
        const before = (await calls()).length;
        if (onTop) {
            await page.click(option, { timeout: 3000 });
            await page.waitForTimeout(500);
        }
        const after = await calls();
        const ok = onTop && (!expectedCall || after.slice(before).includes(expectedCall));
        if (!ok) failures++;
        console.log(`${ok ? '✅' : '❌'} ${label}${onTop ? '' : ' — something else sits on top of the option'}${ok || !onTop ? '' : ` — ${expectedCall} not called`}`);
        await page.keyboard.press('Escape');
        await page.mouse.click(5, 5);
        await page.waitForTimeout(200);
    }

    await clickOption('Save menu → Save', '#btn-save-dropdown-toggle', '#btn-save-file', 'save-picker');
    await clickOption('Save menu → Save As', '#btn-save-dropdown-toggle', '#btn-save-as-file', 'save-picker');
    const openOption = await page.$('#save-dropdown-menu .save-option:not(#btn-save-file):not(#btn-save-as-file)');
    if (openOption) {
        const id = await openOption.getAttribute('id');
        await clickOption('Save menu → Open', '#btn-save-dropdown-toggle', `#${id}`, 'open-picker');
    }
    // The page format menu is locked to A4 until Expert Mode is on
    await page.evaluate(() => {
        const toggle = document.getElementById('advanced-mode-toggle');
        if (!toggle.checked) toggle.click();
    });
    await page.waitForTimeout(300);
    await clickOption('Page format menu → US Letter', '#btn-page-format', '#btn-format-letter', null);

    // Ctrl+S goes through the keyboard, not the menu. Once a file is known it writes
    // to it directly; otherwise it asks where to save.
    const before = (await calls()).length;
    await page.focus('#markdown-input');
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(500);
    const viaShortcut = (await calls()).slice(before).some(c => c === 'save-picker' || c === 'write');
    if (!viaShortcut) failures++;
    console.log(`${viaShortcut ? '✅' : '❌'} Ctrl+S saves`);

    // Lifting the headers must not put them above a modal
    await page.evaluate(() => document.getElementById('about-modal').classList.add('show'));
    await page.waitForTimeout(600);
    const headerCovered = !(await topmostIs('#btn-save-dropdown-toggle'));
    if (!headerCovered) failures++;
    console.log(`${headerCovered ? '✅' : '❌'} an open modal still covers the headers`);

    await browser.close();
    console.log(failures ? `\n${failures} failure(s)\n` : '\nAll passed\n');
    process.exit(failures ? 1 : 0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
