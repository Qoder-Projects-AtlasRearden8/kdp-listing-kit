# KDP Listing Kit — Status

**Date:** October 23, 2026
**State:** Complete, critically reviewed, and locally verified
**Owner:** Asdale Dynamics, LLC

## What was built

A dependency-free static web app for preparing Amazon KDP book listings, ready to serve from GitHub Pages at the repository root (no build step).

- **Title and subtitle checker** — live per-field and combined counts against KDP's 200-character combined limit; near-limit and over-limit states; meter and accessible invalid state.
- **Description editor** — KDP-HTML source editor with a formatting toolbar (`b`, `i`, `u`, `h4`–`h6`, `p`, `br`, ordered/unordered lists), live sanitized preview, raw/visible/word counts, 4,000-character enforcement, markup issue reporting, and **Clean HTML**.
- **Seven-keyword planner** — seven 50-character slots with live counts, over-limit detection, case/whitespace-insensitive duplicate detection, and slot guidance.
- **Category notes** — three optional category fields, free-form research notes, and browsing guidance.
- **AI-disclosure checklist** — decision, AI-generated content types, conflicting-answer detection, five pre-publish checks, status summary, and private notes.
- **Five-step prep sidebar** — book details, description, keywords, categories, and AI disclosure, with progress bar and live details.
- **Local drafts** — debounced `localStorage` autosave, save status/timestamp, reload restoration, and confirmed draft clearing.
- **Markdown export** — download/copy of a complete listing sheet: counts, description HTML, KDP-safe version, markup notes, keywords, categories, AI plan, prep checklist, and official KDP links.
- **Demo draft** — fictional sample so the full workflow can be explored immediately.
- **Accessible responsive UI** — skip link, labelled fields, live regions, keyboard-friendly controls, and desktop/mobile layouts.

Privacy: no accounts, analytics, remote assets, network calls, or secrets. The Content Security Policy blocks connections.

## How to run

```bash
npm start        # http://127.0.0.1:4173/
npm test         # Node.js built-in test runner
npm run check    # tests + static integrity/safety checks
```

Requires Node.js 20+. There are no npm dependencies to install.

For GitHub Pages: **Settings → Pages → Deploy from a branch → `main` → `/` (root)**. `.nojekyll` is included, and all asset paths are relative.

## Verification results

| Check | Result |
| --- | --- |
| `npm test` (Node 20.19.2) | **73 passed, 0 failed** |
| `npm run check` | **73 tests + all 8 static-check groups passed** |
| Headless Chrome 155 end-to-end run | **54 browser checks passed, 0 failed**, no console/page errors |
| Visual review | Desktop 1440px full page and mobile 390px layouts inspected; responsive stacking and typography are clean |
| KDP reference links | All official help URLs checked return HTTP 200 (five used in-app plus the keyword help page) |

The static suite verifies dependency-free scripts, local asset resolution, in-page anchors, `noopener` on new-tab links, unique IDs and ARIA/label targets, document/CSP basics, every `app.js` DOM hook, all ES module imports, and absence of network calls or secrets. A separate audit found only one `innerHTML` sink, and it receives only sanitizer output.

The headless-browser run exercised: initial render; title/subtitle counts and over-limit states; description counts, preview allowlisting, raw-text removal, markup reporting, Clean HTML, toolbar insertion, and over-limit state; keyword length/duplicate states; category completion with one filled category; AI disclosure completion and progress; localStorage save and reload restoration; Markdown download and content; demo loading; draft clearing; and console health. The harness runs outside the repository because it requires a local Chrome binary.

## Changes made during this critical review

- **Corrected category readiness.** KDP allows *up to* three categories, but the prep step previously required all three. One genuine category now completes the step; three empty or whitespace-only fields do not. The sidebar copy reflects that additional categories are optional.
- **Corrected an over-limit edge case.** A description with more than 4,000 raw characters but no visible text (for example, a huge whitespace/HTML dump) was labelled “empty” instead of over-limit. It is now flagged consistently in the editor, readiness detail, and Markdown export.
- **Added content-rule guidance.** The description guidance and README now note KDP's non-HTML restrictions (URLs, phone numbers, review quotes, promotional language, emojis), which character counting cannot detect.
- **Expanded the README** into a full usage, testing, deployment, browser-support, privacy, and limitations guide.
- **Added package metadata** (`license`, `author`) and documented that one category is sufficient.
- Added four regression tests for the corrected readiness and over-limit behavior.

## Known gaps

- **Not published.** Per the brief, nothing was pushed, no remote was created, and GitHub Pages has not been enabled.
- **Content policy is not automatically enforced.** The app checks length, HTML allowlisting, duplicates, and AI-answer consistency, but not URLs, phone numbers, review quotes, promotional language, emojis, keyword relevance, or trademark issues. Authors must follow the linked KDP guidance.
- **Single local draft.** One draft per browser; no multi-draft library, import, or re-import of an exported sheet. Clearing site data or private browsing can remove drafts.
- **Browser automation is external.** Unit + static checks are the committed test suite. The 54-check Chrome walkthrough requires a local Chrome binary and is not part of `npm test`.
- **Other browsers are not individually automated.** The app targets current Chrome, Edge, Firefox, and Safari; Chrome 155 was tested end-to-end.
- **KDP knowledge is dated.** Limits and policy were reviewed October 22, 2026 and cross-checked against official references on October 23, 2026. Amazon can change them without notice; the app does not fetch live policy data.
- **Planning aid, not advice.** The AI section helps prepare an answer and does not determine compliance. The preview is illustrative; KDP's final layout may differ.
- **Clipboard behavior varies.** Copy uses the async Clipboard API with an `execCommand` fallback; hardened browsers may block both, in which case download still works.
- **Manual Pages setup.** No deployment workflow is included, so publication requires using GitHub's Pages settings after an intentional push.
