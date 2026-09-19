const { chromium } = require('playwright');

// Non-regression tests for the [CONTACT : ...] line, run against a local dev server:
//   npm run dev                                   (or: PORT=3010 node server.js)
//   node toolkit/test_contact_line.js             (BASE_URL overrides the address)
// Exits non-zero on any failure.
//
// Each case below is a way a real user ended up writing the contact line. The first
// user report (1.14.0) was a missing "]" swallowing the whole resume; the fix then
// broke a "]" typed on the next line (1.14.2). Both are pinned here.

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3010';

const HEAD = '# Test Name\n\n**Target Job Title**\n\n';
const BODY = '\n\n> A short summary.\n\n## EXPERIENCE\n\n- one\n- two\n- three\n';
const LINK = '[linkedin.com/in/x](https://www.linkedin.com/in/x)';

const CASES = [
    {
        name: 'clean line renders one bar',
        md: HEAD + `[CONTACT : a.b@test.fr | +33 6 00 00 00 00 | ${LINK}]` + BODY,
        expect: { bars: 1, parts: 3, warning: false },
    },
    {
        name: 'trailing separator before "]" leaves no dangling dot',
        md: HEAD + `[CONTACT : a.b@test.fr | +33 6 00 00 00 00 | ${LINK} | ]` + BODY,
        expect: { bars: 1, parts: 3, warning: false },
    },
    {
        name: '"]" typed on the next line still closes the line',
        md: HEAD + `[CONTACT : a.b@test.fr | +33 6 00 00 00 00 | ${LINK} |\n]` + BODY,
        expect: { bars: 1, parts: 3, warning: false },
    },
    {
        name: 'values split over several lines of one paragraph',
        md: HEAD + `[CONTACT : a.b@test.fr |\n+33 6 00 00 00 00 |\n${LINK}]` + BODY,
        expect: { bars: 1, parts: 3, warning: false },
    },
    {
        name: 'bullet and middle-dot separators',
        md: HEAD + `[CONTACT : a.b@test.fr • +33 6 00 00 00 00 · ${LINK}]` + BODY,
        expect: { bars: 1, parts: 3, warning: false },
    },
    {
        name: 'unclosed line stays raw and warns',
        md: HEAD + `[CONTACT : a.b@test.fr | +33 6 00 00 00 00 | ${LINK} | ` + BODY,
        expect: { bars: 0, warning: true, headings: ['EXPERIENCE'] },
    },
    {
        // The original report: a later "]" in another block must not be reached
        name: 'unclosed line does not swallow later blocks',
        md: HEAD + `[CONTACT : a.b@test.fr | ${LINK} | ` + BODY + '\n## GUIDE\n\nThe `[CONTACT : email | phone]` line.\n',
        expect: { bars: 0, warning: true, headings: ['EXPERIENCE', 'GUIDE'] },
    },
    {
        name: 'unclosed line with text right below stays within its paragraph',
        md: HEAD + `[CONTACT : a.b@test.fr | ${LINK} |\nA sentence glued below.` + BODY + '\nLater text with a stray ] bracket.\n',
        expect: { bars: 0, warning: true, headings: ['EXPERIENCE'] },
    },
    {
        name: 'syntax between backticks is shown, not interpreted',
        md: HEAD + `[CONTACT : a.b@test.fr | ${LINK}]` + BODY + '\nWrite `:accent[text]` or `[CONTACT : x | y]`.\n',
        expect: { bars: 1, parts: 2, warning: false, noRawSpan: true },
    },
];

async function run() {
    console.log(`\n🧪 Contact line non-regression tests against ${baseUrl}\n`);
    const browser = await chromium.launch({ headless: true });
    let failures = 0;

    for (const c of CASES) {
        const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
        await context.addInitScript(md => {
            localStorage.setItem('ats_resume_markdown', md);
            localStorage.setItem('jobby_telemetry_disabled', 'true');
        }, c.md);
        const page = await context.newPage();
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        // The unclosed-line warning waits for a pause in typing before showing
        await page.waitForTimeout(1800);

        const got = await page.evaluate(() => {
            const preview = document.querySelector('#resume-output');
            const bars = [...preview.querySelectorAll('.resume-contact-bar')];
            const warning = document.getElementById('preview-warning');
            return {
                bars: bars.length,
                parts: bars.length ? bars[0].children.length : 0,
                barText: bars.map(b => b.textContent.trim()),
                warning: !!warning && getComputedStyle(warning).display !== 'none',
                headings: [...preview.querySelectorAll('h2, h3')].map(h => h.textContent.trim()),
                rawSpan: preview.textContent.includes('<span class='),
            };
        });

        const problems = [];
        if (got.bars !== c.expect.bars) problems.push(`bars ${got.bars} != ${c.expect.bars}`);
        if (c.expect.parts !== undefined && got.parts !== c.expect.parts) problems.push(`parts ${got.parts} != ${c.expect.parts}`);
        if (got.warning !== c.expect.warning) problems.push(`warning ${got.warning} != ${c.expect.warning}`);
        for (const h of c.expect.headings || []) {
            if (!got.headings.includes(h)) problems.push(`heading "${h}" missing (swallowed?)`);
        }
        if (c.expect.noRawSpan && got.rawSpan) problems.push('raw <span> markup shown');
        if (got.barText.some(t => /•\s*$/.test(t))) problems.push('dangling separator');

        if (problems.length) {
            failures++;
            console.log(`❌ ${c.name}\n   ${problems.join('; ')}\n   got: ${JSON.stringify(got)}`);
        } else {
            console.log(`✅ ${c.name}`);
        }
        await context.close();
    }

    await browser.close();
    console.log(`\n${CASES.length - failures}/${CASES.length} passed\n`);
    process.exit(failures ? 1 : 0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
