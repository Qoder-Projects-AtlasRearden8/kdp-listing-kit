# KDP Listing Kit — Status

**Date:** October 23, 2026
**State:** Complete and locally verified
**Owner:** Asdale Dynamics, LLC

## What was built

A dependency-free static web app for preparing Amazon KDP book listings, ready to serve from GitHub Pages (repository root, no build step).

- **Title and subtitle checker** — live per-field and combined counts against the 200-character combined limit, near/over states, meter, `aria-invalid`, and plain-language feedback.
- **Description editor** — KDP-HTML source editor with a formatting toolbar (`b`, `i`, `u`, `h4`–`h6`, `p`, `br`, ordered/unordered lists), live sanitized preview, raw and visible character counts, word count, 4,000-character enforcement, markup issue reporting, and a **Clean HTML** action.
- **Seven-keyword planner** — seven 50-character slots with count feedback, over-limit detection, case/space-insensitive duplicate detection, and slot-specific guidance.
- **Category notes** — three category fields plus a free-form notes area and browser-research guidance.
- **AI-disclosure checklist** — disclosure decision (disclose / none / still checking), AI-generated content types, conflict detection, five pre-publish checks, status summary, and local notes.
- **Five-step prep sidebar** — book details, description, keywords, categories, and AI disclosure with progress bar and live step details.
- **Local drafts** — debounced `localStorage` autosave, save status and timestamp, reload restoration, and a confirmed clear action.
- **Markdown export** — downloadable and copyable listing sheet with counts, description HTML, KDP-safe version, markup notes, keywords, categories, AI plan, and prep checklist.
- **Demo data** — a fictional sample draft, plus responsive desktop/mobile layout and accessible markup.
- **Extras added during finish pass** — `README.md`, MIT `LICENSE`, this status file, and a sanitizer fix (below).

Privacy posture: no network calls, no analytics, no accounts, no API keys, no dependencies; CSP restricts connections to `'none'`.

## How to run

```bash
npm start        # http://127.0.0.1:4173/
npm test         # unit tests (Node built-in test runner)
npm run check    # unit tests + static integrity/safety checks
```

Requires Node.js 20+. For GitHub Pages: Settings → Pages → Deploy from a branch → `main` → `/` (root). `.nojekyll` is included.

## Verification results

| Check | Result |
| --- | --- |
| `npm test` (Node 20.19.2) | **69 passed, 0 failed** |
| `npm run check` | **69 tests + all 8 static-check groups passed** |
| Headless Chrome 155 end-to-end run | **53 browser checks passed, 0 failed**, no console/page errors |
| Visual review | Desktop 1440px full page and 390px mobile layouts inspected; responsive stacking and typography are clean |

The static-check suite verifies dependency-free scripts, local asset resolution, in-page anchors, `noopener` on new-tab links, unique IDs and ARIA/label targets, document/CSP basics, every `app.js` DOM hook, all ES module imports, and absence of network calls or secrets.

The headless-browser run exercised: initial render; title/subtitle counts and over-limit states; description counts, preview allowlisting, markup issue reporting, Clean HTML, toolbar insertion, and over-limit state; keyword length/duplicate states; categories; AI disclosure conflict-free completion and progress; localStorage save and reload restoration; Markdown download and content; demo loading; draft clearing; and console health. Verification was performed with Chrome DevTools Protocol against the local server; the harness lives outside the repository and is not shipped.

### Fix made during verification

The sanitizer originally removed `<script>`/`<style>` tags but leaked their contents into the preview as visible text (escaped, so not executable, but misleading). It now consumes raw-text element content entirely, so script/style bodies appear in neither the safe preview nor the plain-text count. Two regression tests were added; the unit total is now 69.

## Known gaps

- **Not published.** Per the brief, nothing was pushed, no remote was created, and GitHub Pages has not been enabled.
- **Single local draft.** The app stores one draft per browser. There is no multi-draft library, import, or backup other than the exported Markdown (which is not re-importable).
- **Browser automation is external.** The 53-check Chrome run is not part of `npm test` because it needs Chrome/CDP and is intentionally dependency-free in-repo. CI coverage currently means unit + static checks.
- **KDP knowledge is dated.** Limits, category labels, and AI policy were reviewed October 22, 2026 and are shown with that date. Amazon can change them; the app links to official help but does not fetch live data.
- **Planning aid, not advice.** The AI-disclosure section helps authors prepare an answer; it does not determine policy compliance. The preview is illustrative and KDP's final rendering may differ.
- **Clipboard behavior varies.** Copy uses the async Clipboard API with an `execCommand` fallback; some hardened browsers may block both, in which case the download works.
- **Storage can disappear.** Private browsing, cleared site data, or storage quotas can remove the draft; the UI warns when storage is unavailable.
- **Manual Pages setup.** No deployment workflow is included, so publishing requires using GitHub's Pages settings after an intentional push.
