const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Non-regression test for the editor's two layers, against a local dev server:
//   npm run dev                                   (or: PORT=3010 node server.js)
//   node toolkit/test_editor_overlay.js           (BASE_URL overrides the address)
// Exits non-zero on any failure.
//
// The editor is a transparent textarea (caret, selection) over a highlighted <pre>
// (what is seen). Both must wrap every line at the same point, or the caret drifts
// away from the text it edits. 1.14.4 and earlier hid the overlay's scrollbar with
// display: none, so it had 6px more room than the textarea and long lines wrapped
// differently at some editor widths. A line wrapped differently shows up as a height
// difference between the layers, so the test sweeps the viewport width and compares.

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3010';
const sample = fs.readFileSync(path.join(__dirname, '..', 'public', 'sample.md'), 'utf8');

async function run() {
    console.log(`\n🧪 Editor overlay alignment tests against ${baseUrl}\n`);
    const browser = await chromium.launch({ headless: true });
    let failures = 0;

    for (const theme of ['dark', 'light']) {
        const context = await browser.newContext({ viewport: { width: 1300, height: 1000 } });
        await context.addInitScript(md => {
            localStorage.setItem('ats_resume_markdown', md);
            localStorage.setItem('jobby_telemetry_disabled', 'true');
        }, sample);
        const page = await context.newPage();
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
        await page.waitForTimeout(1200);

        const mismatches = [];
        for (let width = 1300; width <= 2600; width += 20) {
            await page.setViewportSize({ width, height: 1000 });
            await page.waitForTimeout(60);
            const m = await page.evaluate(() => {
                const ta = document.getElementById('markdown-input');
                const pre = document.getElementById('markdown-highlight');
                return { taWidth: ta.clientWidth, preWidth: pre.clientWidth, taHeight: ta.scrollHeight, preHeight: pre.scrollHeight };
            });
            if (m.taWidth !== m.preWidth || m.taHeight !== m.preHeight) mismatches.push({ width, ...m });
        }
        if (mismatches.length) {
            failures++;
            console.log(`❌ ${theme}: layers differ at ${mismatches.length} viewport width(s)`);
            for (const x of mismatches.slice(0, 5)) {
                console.log(`   ${x.width}px: text width ${x.taWidth} vs ${x.preWidth}, height ${x.taHeight} vs ${x.preHeight}`);
            }
        } else {
            console.log(`✅ ${theme}: both layers wrap alike at every width from 1300 to 2600px`);
        }

        // Scrolling must stay in sync while typing
        await page.setViewportSize({ width: 1600, height: 1000 });
        await page.$eval('#markdown-input', el => {
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
        });
        await page.keyboard.type(' x');
        await page.waitForTimeout(300);
        const scroll = await page.evaluate(() => ({
            ta: document.getElementById('markdown-input').scrollTop,
            pre: document.getElementById('markdown-highlight').scrollTop,
        }));
        if (scroll.ta !== scroll.pre) {
            failures++;
            console.log(`❌ ${theme}: scroll out of sync (${scroll.ta} vs ${scroll.pre})`);
        } else {
            console.log(`✅ ${theme}: scroll in sync after typing`);
        }
        await context.close();
    }

    await browser.close();
    console.log(failures ? `\n${failures} failure(s)\n` : '\nAll passed\n');
    process.exit(failures ? 1 : 0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
