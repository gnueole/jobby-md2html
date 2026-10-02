const { chromium } = require('playwright');

// Non-regression test for the AI import path (1.17.0), against a local server:
//   npm run dev                                   (or: PORT=3010 node server.js)
//   node toolkit/test_ai_prompt.js                (BASE_URL overrides the address)
// Exits non-zero on any failure.
//
// Pins three things: the "AI prompt" buttons show the prompt of the interface language in
// a modal whose button copies it (nothing is copied unseen, since 1.17.2), the empty editor
// shows the two ways to get a CV in, and an AI's whole answer pasted into the editor keeps
// only the CV from its code block. A plain paste, or a code block in the middle of a text,
// goes in untouched. Against 1.16.0 every check fails: none of it exists.

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3010';

// The editor saves a history state 200ms after an edit; give it room on a loaded machine
const HISTORY_SETTLE_MS = 800;

async function run() {
    console.log(`\n🧪 AI prompt tests against ${baseUrl}\n`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1600, height: 1000 },
        permissions: ['clipboard-read', 'clipboard-write'],
    });
    await context.addInitScript(() => {
        localStorage.setItem('jobby_telemetry_disabled', 'true');
    });
    const page = await context.newPage();
    let failures = 0;

    const check = (ok, label, detail = '') => {
        if (!ok) failures++;
        console.log(`${ok ? '✅' : '❌'} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
    };
    const fetchText = async path => (await page.request.get(baseUrl + path)).text();
    const clipboard = () => page.evaluate(() => navigator.clipboard.readText());
    const editorValue = () => page.$eval('#markdown-input', el => el.value);
    const isHidden = sel => page.$eval(sel, el => getComputedStyle(el).display === 'none');
    // What the pointer would hit at the centre of an element
    const topmostIs = sel => page.evaluate(s => {
        const el = document.querySelector(s);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!hit && (hit === el || el.contains(hit));
    }, sel);
    // A synthetic paste never inserts text by itself; the handler does when it takes over
    const paste = text => page.evaluate(t => {
        const dt = new DataTransfer();
        dt.setData('text/plain', t);
        const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
        document.getElementById('markdown-input').dispatchEvent(ev);
        return ev.defaultPrevented;
    }, text);

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // --- 1. The header button shows the prompt before anything is copied; the modal's
    //        button copies it, and the prompt teaches Jobby's syntax
    const promptEn = await fetchText('/ai-prompt.md');
    const modalShown = () => page.$eval('#ai-prompt-modal', el => el.classList.contains('show') && getComputedStyle(el).display !== 'none');
    await page.click('#btn-copy-ai-prompt');
    await page.waitForTimeout(500);
    check(await modalShown(), 'header button opens the prompt modal');
    check((await page.$eval('#ai-prompt-modal-text', el => el.textContent)) === promptEn, 'the modal shows the whole prompt');
    check(await topmostIs('#btn-copy-ai-prompt-modal'), 'the modal copy button is clickable');
    await page.click('#btn-copy-ai-prompt-modal');
    await page.waitForTimeout(500);
    check((await clipboard()) === promptEn, 'modal button copies the prompt');
    await page.click('#btn-close-ai-prompt-modal');
    await page.waitForTimeout(300);
    check(!(await modalShown()), 'the modal closes');
    check(/\[CONTACT :/.test(promptEn) && /:accent\[/.test(promptEn) && /:muted\[/.test(promptEn) && /###/.test(promptEn),
        'prompt teaches the contact line, accent, muted and sidebar headings');
    const toastText = await page.$eval('#toast', el => el.textContent).catch(() => '');
    check(/prompt copied/i.test(toastText), 'toast confirms the copy', toastText.trim());

    // --- 2. The empty editor shows the card; Clear reveals it, the sample button fills it
    check(await isHidden('#editor-empty-state'), 'empty-state card hidden while the sample is loaded');
    await page.click('#btn-clear');
    await page.waitForTimeout(400);
    check(!(await isHidden('#editor-empty-state')) && (await topmostIs('#btn-empty-ai-prompt')),
        'empty-state card shows after Clear, its buttons on top');
    await page.click('#btn-empty-ai-prompt');
    await page.waitForTimeout(400);
    check(await modalShown(), 'empty-state button opens the prompt modal');
    await page.click('#btn-close-ai-prompt-modal');
    await page.waitForTimeout(300);
    await page.click('#btn-empty-sample');
    await page.waitForTimeout(600);
    check((await isHidden('#editor-empty-state')) && /^# /.test(await editorValue()),
        'empty-state Sample button loads the sample and hides the card');
    await page.click('#btn-clear');
    await page.waitForTimeout(400);
    await page.focus('#markdown-input');
    await page.keyboard.type('# Jane');
    check(await isHidden('#editor-empty-state'), 'card hides at the first keystroke');
    await page.waitForTimeout(HISTORY_SETTLE_MS);

    // --- 3. An AI answer pasted whole keeps only the CV from its code block
    const sample = (await fetchText('/sample.md')).trim();
    await page.click('#btn-clear');
    await page.waitForTimeout(400);
    await page.focus('#markdown-input');
    const reply = `Here is your CV in Markdown, ready for Jobby:\n\n\`\`\`markdown\n${sample}\n\`\`\`\n\nMissing information: end date of the first job.`;
    const handled = await paste(reply);
    await page.waitForTimeout(HISTORY_SETTLE_MS);
    check(handled && (await editorValue()).trim() === sample, 'AI answer pasted whole keeps the CV alone');
    const pasteToast = await page.$eval('#toast', el => el.textContent).catch(() => '');
    check(/code block/i.test(pasteToast), 'toast says the chat around the block was left out', pasteToast.trim());
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    check((await editorValue()) === '', 'Ctrl+Z reverts the paste');

    // Windows line endings, a ~~~ fence and a language tag all unwrap too
    const crlfReply = 'Sure!\r\n~~~md\r\n# Jane Doe\r\n\r\n## EXPERIENCE\r\n- Did things\r\n~~~\r\nAnything missing: none.';
    await page.focus('#markdown-input');
    const handledCrlf = await paste(crlfReply);
    await page.waitForTimeout(300);
    check(handledCrlf && (await editorValue()) === '# Jane Doe\n\n## EXPERIENCE\n- Did things\n', 'CRLF answer with a ~~~ fence unwraps');
    await page.click('#btn-clear');
    await page.waitForTimeout(300);

    // --- 4. Ordinary pastes are left alone
    await page.focus('#markdown-input');
    check(!(await paste('# Jane Doe\n\n## EXPERIENCE\n- Did things\n')), 'plain Markdown paste goes in untouched');
    check(!(await paste('Run it with:\n```bash\nnpm start\n```\nthen open the page.')), 'code block in the middle of a text goes in untouched');
    check(!(await paste('Just a sentence with ``` inside')), 'stray backticks go in untouched');

    // --- 5. The prompt follows the interface language, in the help modal too
    await page.goto(baseUrl + '/?lang=fr', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const promptFr = await fetchText('/ai-prompt.fr.md');
    check(promptFr !== promptEn && /\[CONTACT :/.test(promptFr), 'French prompt exists and differs from the English one');
    await page.click('#btn-copy-ai-prompt');
    await page.waitForTimeout(500);
    check((await page.$eval('#ai-prompt-modal-text', el => el.textContent)) === promptFr, 'the modal shows the French prompt under ?lang=fr');
    await page.click('#btn-copy-ai-prompt-modal');
    await page.waitForTimeout(500);
    check((await clipboard()) === promptFr, 'modal button copies the French prompt');
    await page.click('#btn-close-ai-prompt-modal');
    await page.waitForTimeout(300);
    await page.click('#btn-markdown-help-header');
    await page.waitForTimeout(500);
    const shown = await page.$eval('#help-ai-prompt', el => el.textContent);
    check(shown === promptFr, 'help modal shows the French prompt');
    // The AI section sits low in a scrolling modal body
    await page.$eval('#btn-copy-ai-prompt-help', el => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    check(await topmostIs('#btn-copy-ai-prompt-help'), 'help modal copy button is clickable');
    await page.click('#btn-copy-ai-prompt-help');
    await page.waitForTimeout(400);
    check((await clipboard()) === promptFr, 'help modal button copies the prompt');

    await browser.close();
    console.log(`\n${failures === 0 ? '🎉 All AI prompt checks passed' : `💥 ${failures} check(s) failed`}\n`);
    process.exit(failures === 0 ? 0 : 1);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
