const { chromium } = require('playwright');

// Non-regression tests for the editor's unbalanced-bracket marks, against a local server:
//   npm run dev                                   (or: PORT=3010 node server.js)
//   node toolkit/test_bracket_highlight.js        (BASE_URL overrides the address)
// Exits non-zero on any failure.
//
// Rules (1.15.0): an unclosed "[" is marked md-bracket-unclosed, an extra "]" is marked
// md-bracket-extra; "(" is checked only right after "](" (a link URL), never in prose.
// Checked per block, code spans and fences skipped, escaped brackets ignored, and the
// marks only appear once typing pauses.

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3010';

// Each case: the Markdown, and the characters expected under each mark, in order.
const CASES = [
    { name: 'balanced link: no mark', md: '# Name\n\n[site](https://eole.me) and text.', unclosed: [], extra: [] },
    { name: 'unclosed [ is marked', md: '# Name\n\nSee [site for details.', unclosed: ['['], extra: [] },
    { name: 'extra ] is marked', md: '# Name\n\nA stray ] bracket.', unclosed: [], extra: [']'] },
    { name: 'unclosed contact line', md: '# Name\n\n[CONTACT : a@b.fr | +33 6 |\n\nNext paragraph.', unclosed: ['['], extra: [] },
    { name: '"]" on the next line of the same paragraph closes it', md: '# Name\n\n[CONTACT : a@b.fr |\n]', unclosed: [], extra: [] },
    { name: 'link missing its ")" is marked', md: '# Name\n\n[site](https://eole.me and more', unclosed: ['('], extra: [] },
    { name: 'a link left open marks only its own "("', md: '# Name\n\n[site](https://eole.me for details (and more.', unclosed: ['('], extra: [] },
    { name: 'parentheses in prose are never marked', md: '# Name\n\nDone (mostly and 1) first :) end.', unclosed: [], extra: [] },
    { name: 'nested parentheses in a URL are fine', md: '# Name\n\n[wiki](https://x.org/A_(b)) end', unclosed: [], extra: [] },
    { name: 'inline code is skipped', md: '# Name\n\nWrite `[CONTACT : x` like this.', unclosed: [], extra: [] },
    { name: 'fenced code is skipped', md: '# Name\n\n```\n[open\n]]\n```\n\nText.', unclosed: [], extra: [] },
    { name: 'escaped brackets are skipped', md: '# Name\n\nLiteral \\[ and \\] here.', unclosed: [], extra: [] },
    { name: 'an unclosed [ does not leak into the next block', md: '# Name\n\n[open\n\n- item ] one\n- two', unclosed: ['['], extra: [']'] },
];

async function marksOf(page) {
    return page.evaluate(() => {
        const code = document.getElementById('highlight-code');
        return {
            unclosed: [...code.querySelectorAll('.md-bracket-unclosed')].map(e => e.textContent),
            extra: [...code.querySelectorAll('.md-bracket-extra')].map(e => e.textContent),
            mirrors: code.textContent === document.getElementById('markdown-input').value,
        };
    });
}

async function run() {
    console.log(`\n🧪 Bracket highlight tests against ${baseUrl}\n`);
    const browser = await chromium.launch({ headless: true });
    let failures = 0;
    const fail = (name, detail) => {
        failures++;
        console.log(`❌ ${name}\n   ${detail}`);
    };

    for (const c of CASES) {
        const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
        await context.addInitScript(md => {
            localStorage.setItem('ats_resume_markdown', md);
            localStorage.setItem('jobby_telemetry_disabled', 'true');
            localStorage.setItem('syntax_highlight_active', 'true');
        }, c.md);
        const page = await context.newPage();
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1800);
        const got = await marksOf(page);
        const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
        if (!got.mirrors) fail(c.name, 'the overlay text no longer mirrors the textarea');
        else if (!same(got.unclosed, c.unclosed) || !same(got.extra, c.extra)) {
            fail(c.name, `expected unclosed=${JSON.stringify(c.unclosed)} extra=${JSON.stringify(c.extra)}, got unclosed=${JSON.stringify(got.unclosed)} extra=${JSON.stringify(got.extra)}`);
        } else console.log(`✅ ${c.name}`);
        await context.close();
    }

    // Marks disappear while typing and come back once typing pauses
    {
        const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
        await context.addInitScript(() => {
            localStorage.setItem('ats_resume_markdown', '# Name\n\nText.');
            localStorage.setItem('jobby_telemetry_disabled', 'true');
            localStorage.setItem('syntax_highlight_active', 'true');
        });
        const page = await context.newPage();
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1200);
        await page.$eval('#markdown-input', el => {
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
        });
        await page.keyboard.type(' [open', { delay: 60 });
        const during = await marksOf(page);
        await page.waitForTimeout(1800);
        const after = await marksOf(page);
        if (during.unclosed.length) fail('no mark while typing', `marked during typing: ${JSON.stringify(during)}`);
        else console.log('✅ no mark while typing');
        if (after.unclosed.length !== 1) fail('mark after a pause', `after the pause: ${JSON.stringify(after)}`);
        else console.log('✅ mark after a pause');
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
