const { chromium } = require('playwright');

// Text contrast audit of the editor UI, both themes, against a local dev server:
//   npm run dev                                   (or: PORT=3010 node server.js)
//   node toolkit/test_contrast.js                 (BASE_URL overrides the address)
// Exits non-zero if any visible text falls below WCAG AA (4.5:1, or 3:1 for large text).
//
// Every visible text of the app is measured against its real background, translucent
// layers composited, in the main UI and in each modal opened one at a time. The resume
// sheet (#resume-output) is skipped: its colours are the user's chosen preset.
// Text over a gradient cannot be measured this way; it is listed, not failed.
//
// Written after 1.14.4: most status colours had been tuned for the dark theme only
// and measured 1.4-3.9:1 on the light one.

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3010';
// Passes and fails (table, image) so both checklist colours are on screen, plus an
// unclosed contact line so the warning is too.
const MD = '# Test Name\n\n[CONTACT : a.b@example.com | +33 6 00 00 00 00 | \n\n## EXPERIENCE\n\n- one\n- two\n- three\n\n## EDUCATION\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n![x](x.png)\n';

function auditIn(rootSelector) {
    const parse = s => (s.match(/[\d.]+/g) || []).map(Number);
    const lum = c => {
        const [r, g, b] = c.map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
        return (x + 0.05) / (y + 0.05);
    };
    // Really visible: neither the element nor any ancestor hides it
    function visible(el) {
        for (let e = el; e; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
        }
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    }
    // Composite translucent backgrounds down to the first opaque one; note gradients
    function background(el) {
        const layers = [];
        let gradient = false;
        for (let e = el; e; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (cs.backgroundImage && cs.backgroundImage !== 'none') gradient = true;
            const c = parse(cs.backgroundColor);
            if (c.length === 4 && c[3] === 0) continue;
            layers.push(c);
            if (c.length === 3 || c[3] === 1) break;
        }
        let base = [255, 255, 255];
        for (const c of layers.reverse()) {
            const a = c.length === 4 ? c[3] : 1;
            base = base.map((v, i) => Math.round(c[i] * a + v * (1 - a)));
        }
        return { base, gradient };
    }
    function label(el) {
        let s = el.tagName.toLowerCase();
        if (el.id) s += '#' + el.id;
        const cls = [...el.classList].slice(0, 3).join('.');
        if (cls) s += '.' + cls;
        const p = el.parentElement;
        if (p) s = (p.id ? '#' + p.id : p.classList[0] ? '.' + p.classList[0] : p.tagName.toLowerCase()) + ' > ' + s;
        return s;
    }
    const out = [];
    for (const el of document.querySelector(rootSelector).querySelectorAll('*')) {
        if (el.closest('#resume-output')) continue;
        if (rootSelector === 'body' && el.closest('.modal-overlay')) continue;
        const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
        if (!own || !visible(el)) continue;
        const cs = getComputedStyle(el);
        const fg = parse(cs.color);
        const alpha = fg.length === 4 ? fg[3] : 1;
        const { base, gradient } = background(el);
        const mixed = fg.slice(0, 3).map((v, i) => Math.round(v * alpha + base[i] * (1 - alpha)));
        const size = parseFloat(cs.fontSize);
        const bold = parseInt(cs.fontWeight, 10) >= 700;
        const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
        const cr = ratio(mixed, base);
        if (cr < need) out.push({ sel: label(el), color: cs.color, bg: `rgb(${base})`, ratio: +cr.toFixed(2), need, gradient, text: own.slice(0, 45) });
    }
    return out;
}

async function run() {
    console.log(`\n🧪 Text contrast audit against ${baseUrl}\n`);
    const browser = await chromium.launch({ headless: true });
    let failures = 0;

    for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
        await context.addInitScript(md => {
            localStorage.setItem('ats_resume_markdown', md);
            localStorage.setItem('jobby_telemetry_disabled', 'true');
        }, MD);
        const page = await context.newPage();
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
        await page.waitForTimeout(1800);

        const scopes = [['main UI', 'body']];
        const count = await page.$$eval('.modal-overlay', els => els.length);
        for (let i = 0; i < count; i++) scopes.push([null, i]);

        for (const [name, scope] of scopes) {
            let title = name;
            let rows;
            if (scope === 'body') {
                rows = await page.evaluate(auditIn, 'body');
            } else {
                // Modals fade in over 0.25s: measure only once fully open
                title = await page.evaluate(idx => {
                    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
                    const m = document.querySelectorAll('.modal-overlay')[idx];
                    m.classList.add('show');
                    m.setAttribute('data-audit', 'on');
                    return `modal ${m.id || idx}`;
                }, scope);
                await page.waitForTimeout(1000);
                rows = await page.evaluate(auditIn, '.modal-overlay[data-audit="on"]');
                await page.evaluate(idx => {
                    const m = document.querySelectorAll('.modal-overlay')[idx];
                    m.classList.remove('show');
                    m.removeAttribute('data-audit');
                }, scope);
            }
            const bad = rows.filter(r => !r.gradient);
            const grad = rows.filter(r => r.gradient);
            failures += bad.length;
            console.log(`${bad.length ? '❌' : '✅'} ${theme} — ${title}${grad.length ? ` (${grad.length} on a gradient, check visually)` : ''}`);
            for (const r of bad) console.log(`   ${r.ratio}:1 < ${r.need}  ${r.sel}  color=${r.color} bg=${r.bg}  "${r.text}"`);
        }
        await context.close();
    }

    await browser.close();
    console.log(failures ? `\n${failures} low-contrast text element(s)\n` : '\nAll visible text meets WCAG AA\n');
    process.exit(failures ? 1 : 0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
