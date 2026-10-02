const { chromium } = require('playwright');

// Non-regression test for the ATS "standard section headings" rule, against a local server:
//   npm run dev                                   (or: PORT=3010 node server.js)
//   node toolkit/test_ats_headings.js             (BASE_URL overrides the address)
// Exits non-zero on any failure.
//
// Until 1.17.2 the rule matched a hard-coded, mostly English list, with accents: a French
// resume headed "Expérience" and "Compétences" was told to "use standard section headings".
// The names now come from every locale file and are compared without accents or case.
// Against 1.17.1 the French and German cases fail.

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3010';

const BULLETS = '- Did one thing\n- Did another\n- Did a third\n';
const CASES = [
    {
        name: 'French headings with accents, French UI',
        lang: 'fr',
        md: `# Jeanne Martin\n\n## Expérience\n${BULLETS}\n## Compétences\n- A\n\n## Langues\n- Français\n`,
        expectPass: true,
    },
    {
        name: 'French headings with accents, English UI',
        lang: 'en',
        md: `# Jeanne Martin\n\n## Expérience\n${BULLETS}\n## Compétences\n- A\n`,
        expectPass: true,
    },
    {
        name: 'German headings, German UI',
        lang: 'de',
        md: `# Hans Müller\n\n## Berufserfahrung\n${BULLETS}\n## Ausbildung\n- B\n`,
        expectPass: true,
    },
    {
        name: 'English headings, English UI',
        lang: 'en',
        md: `# Jane Doe\n\n## Experience\n${BULLETS}\n## Education\n- B\n`,
        expectPass: true,
    },
    {
        name: 'non-standard headings still fail',
        lang: 'en',
        md: `# Jane Doe\n\n## Hobbies\n${BULLETS}\n## Miscellany\n- B\n`,
        expectPass: false,
    },
];

async function run() {
    console.log(`\n🧪 ATS heading tests against ${baseUrl}\n`);
    const browser = await chromium.launch({ headless: true });
    let failures = 0;

    for (const c of CASES) {
        const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
        await context.addInitScript(md => {
            localStorage.setItem('ats_resume_markdown', md);
            localStorage.setItem('jobby_telemetry_disabled', 'true');
        }, c.md);
        const page = await context.newPage();
        await page.goto(`${baseUrl}/?lang=${c.lang}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);
        // The keyword lists of every language load after the first compile; trigger another
        await page.evaluate(() => {
            const el = document.getElementById('markdown-input');
            el.value = el.value + ' ';
            el.dispatchEvent(new Event('input'));
        });
        await page.waitForTimeout(800);

        const got = await page.evaluate(() => {
            const items = [...document.querySelectorAll('#ats-checklist li')];
            return items.map(li => ({ status: li.className, text: li.textContent.trim() }));
        });
        // The rules are rendered in a fixed order: email, phone, tables, images, headings…
        const headingItem = got[4];
        const passed = !!headingItem && headingItem.status === 'pass';
        const ok = passed === c.expectPass;
        if (!ok) failures++;
        console.log(`${ok ? '✅' : '❌'} ${c.name}${ok ? '' : ` — got "${headingItem ? headingItem.text : 'no heading rule found'}"`}`);
        await context.close();
    }

    await browser.close();
    console.log(`\n${failures === 0 ? '🎉 All ATS heading checks passed' : `💥 ${failures} check(s) failed`}\n`);
    process.exit(failures === 0 ? 0 : 1);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
