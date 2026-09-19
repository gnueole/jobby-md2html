# TODO — JME (Jobby MD Editor)

**Open work only.** Three lines per entry: what, why it is not done, where the
detail lives. Nothing here records what shipped — that is `CHANGELOG.md`.

This repository is **JME**, the Markdown resume editor. *Jobby* proper is the
LinkedIn → n8n → Notion pipeline; its "Jobby 3.0" generation name has nothing to
do with this repository's version numbers.

---

## ⏰ Watch

**Nobody opens or saves a file.** Zero `open_file`, `save_file` or
`save_file_as` events in 31 sessions since telemetry moved to Axiom
(2026-08-28), verified as not a telemetry loss: the events do fire, including on
the Firefox/Safari fallback path. The editor already autosaves to `localStorage`,
which may be all anyone needs. Too little data to act on — look again once there
are a few hundred sessions, before investing in file handling either way.

---

## 👤 Waiting on Éole

Decisions nobody else can take. Each is blocked, not merely unstarted.

| | Item | What is needed |
|---|---|---|
| 1 | **CodeMirror 6, or not** | Would retire the textarea-over-`<pre>` overlay and the whole class of caret-drift bugs, and brings bracket matching and lint underlines with tooltips. Cost measured: 230 references to the textarea across 6 files (81 in `shortcuts.js`), 65 selection API calls, no build step in production today, a few hundred kB added, the `toolkit/` tests to adapt. Suggested first step: a throwaway spike on a branch to measure weight and port the shortcuts. |
| 2 | **Telemetry says `application: 'jobby'` for JME** | Set in `server.js`. Renaming it to `jme` would separate the editor from the pipeline in Axiom, but splits every dashboard's history at the rename unless the `app_name` virtual field maps both. |

---

## 🔧 Queued

Pickable without asking.

**Live bracket highlighting in the editor (1.15.0).** Decided 2026-09-19: an
unclosed `[` in red; an extra `]` in magenta with a wavy underline, so the two
differ by shape as well as colour; parentheses checked only after a link
(`](…)`), since prose is full of legitimately unbalanced ones. Checked per
paragraph like the parser, code spans ignored, shown after a typing pause, colour
and underline only — never a width change (`npm run test:overlay`).

**The `toolkit/` tests do not run in CI.** They have `npm run` entries now, but
`ci.yml` still runs only lint and i18n. Wiring them needs the job to start the
server and install a Playwright browser.

---

## Where the rest went

| Looking for | Lives in |
|---|---|
| What shipped, and why | `CHANGELOG.md` |
| Non-regression tests | `npm run test:contact`, `test:contrast`, `test:overlay` against a local server (`BASE_URL` overrides); each `toolkit/test_*.js` header says what it pins |
| Contact line syntax, separators, columns | `README.md` — *Custom Markdown Directives* |
| Telemetry path and configuration | `ARCHITECTURE.md` — *Telemetry & Data Pipeline* |
