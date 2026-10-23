# KDP Listing Kit

**A free, local-first desk for preparing an Amazon KDP book listing.** Check title and subtitle limits, write a description against KDP's HTML allowlist, plan seven keywords, note categories, and record an AI-disclosure plan. When the thinking is done, export a clean Markdown sheet.

Built by **ASDALE DYNAMICS, LLC**. No account, no server, no tracking, no build step, and no npm dependencies.

## Why this kit exists

Publishing a book is hard enough. The listing form is a pile of small, easy-to-miss rules: a combined title budget, a description that accepts only certain HTML, seven keyword slots, three category choices, and an AI-disclosure question that deserves a real answer rather than a guess.

KDP Listing Kit puts those decisions in one quiet workspace that saves as you type. It is a planning aid — it does not submit anything to Amazon and cannot guarantee approval.

## At a glance

| Part of the listing | What the kit does |
| --- | --- |
| Title and subtitle | Live separate and combined counts against KDP's 200-character shared limit, with near-limit and over-limit warnings |
| Description | Source editor for KDP-allowed HTML, live sanitized preview, raw + visible + word counts, 4,000-character limit, markup warnings, Clean HTML |
| Keywords | Seven 50-character slots, live counts, duplicate detection, and guidance for giving each slot a distinct job |
| Categories | Three optional category fields plus a free-form research notes area |
| AI disclosure | Decision, AI-generated content types, conflict checks, five pre-publish checks, status summary, and private notes |
| Drafts | Debounced autosave to `localStorage`, restore after reload, and a confirmed clear action |
| Export | Download or copy a complete Markdown listing sheet with counts, HTML, notes, and prep status |

## How to use it

1. Open the app and either start fresh or select **Load a demo draft** to explore a fictional listing.
2. Fill in the book title and subtitle. Watch the combined meter: KDP counts them as one 200-character budget.
3. Write the description in the source pane. Use the toolbar for KDP-safe tags. Check the live preview and clean up any flagged markup.
4. Plan keywords one slot at a time. The kit flags over-length phrases and repeated ideas.
5. Add category research and complete the AI-disclosure section. Conflicting answers are called out before they reach the export.
6. Select **Download Markdown sheet** or **Copy Markdown**. Use **Clear this draft** only after exporting if you want to keep a copy.

Drafts save automatically in the browser after each edit. The header shows whether the latest change has been saved.

## What is checked automatically

- **Title + subtitle:** 200 characters combined, counted as typed, with warnings starting at 180.
- **Description:** 4,000 characters including HTML, with warnings starting at 3,600.
- **Description HTML:** only these tags are kept in the preview: `br`, `p`, `b`, `em`, `i`, `u`, `h4`, `h5`, `h6`, `ol`, `ul`, and `li`. Attributes, unsupported tags, comments, event handlers, and script/style contents are removed from the preview and reported. **Clean HTML** rewrites the source into the safe subset.
- **Keywords:** seven slots of 50 characters each, exact duplicates detected after trimming, collapsing spaces, and ignoring case.
- **AI disclosure:** the answer must be internally consistent. “No AI-generated content” conflicts with any selected AI content type; “I will disclose” requires at least one content type; a final decision requires all five pre-publish checks.
- **Prep progress:** book details, description, keywords, categories, and AI disclosure are tracked independently. One category is enough to complete the category step because KDP allows up to three.

## Run locally

Requires **Node.js 20 or newer**. There is nothing to install.

```bash
npm start
```

Open <http://127.0.0.1:4173/>. If that port is busy, run `PORT=4174 npm start`.

The app is plain HTML, CSS, and ES modules. Serve the folder with any static file server. Opening `index.html` directly from the filesystem may be blocked by browser module security rules.

## Test

```bash
npm test          # Node's built-in test runner
npm run check     # tests plus static integrity, link, ARIA, module, and secret checks
```

Coverage includes title and keyword metrics, HTML sanitization and raw-text handling, editor selection helpers, readiness rules, AI-disclosure logic, draft normalization and storage, Markdown generation and escaping, and the five-step prep state.

The Chrome walkthrough used during development covers the full UI: editing, preview, counts, markup cleanup, localStorage restore, export contents, demo loading, reset, and console health. It lives outside the repository because it requires a local Chrome binary.

## Deploy to GitHub Pages

There is no build step and no remote dependency.

1. Push the repository to GitHub after reviewing what will be public.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and the repository root (`/`).
5. Save. The included `.nojekyll` file tells Pages to serve the files unchanged.

All paths are relative, so the app also works from a project subpath such as `https://<user>.github.io/kdp-listing-kit/`.

## Browser support

The kit uses ES modules, `localStorage`, and standard DOM APIs. It is intended for current desktop and mobile versions of Chrome, Edge, Firefox, and Safari. It was end-to-end tested in Chrome 155 at desktop and mobile widths; the other browsers were not individually automated in this repository.

## Content rules the kit does not enforce

Length and HTML checks are only part of KDP's policy. The kit does **not** automatically detect every content restriction. In particular:

- KDP's description guidelines prohibit URLs, phone numbers, review quotes, promotional language, and emojis. Follow the official guidance rather than relying on the character counter alone.
- Keywords should describe the book honestly. Avoid competitor names, trademarks, unrelated phrases, and misleading claims.
- Title and subtitle rules also prohibit promotional claims, price mentions, and HTML.
- Category names and placements in KDP's picker can change; the fields here are research notes, not a live category feed.
- AI policy can change. The checklist records your decision; it does not determine whether your book complies.

Official references are linked inside the app and in the exported sheet.

## Privacy and safety

- Drafts stay in the browser's `localStorage`. Nothing is uploaded or synced.
- The page's Content Security Policy blocks network connections (`connect-src 'none'`). There are no analytics, remote fonts, or third-party scripts.
- The preview is built from an allowlist, never by injecting the raw description. Event handlers, attributes, unsupported tags, comments, and script/style contents cannot reach the rendered preview.
- Do not paste API keys, passwords, or private reader data into notes fields.

Clearing browser site data, using private browsing, or hitting a storage quota can remove a draft. Export a Markdown sheet when a listing matters.

## Project layout

```
index.html            Page shell and all listing sections
styles.css            Visual design and responsive layout
app.js                DOM wiring, rendering, saving, export
src/
  ai.js               AI-disclosure evaluation and conflict checks
  constants.js        KDP limits, allowlisted tags, storage key
  demo.js             Fictional demo draft
  draft.js            Draft creation, normalization, empty-state detection
  editor.js           Selection wrapping and list formatting
  markdown.js         Markdown sheet and safe file names
  readiness.js        Five-step preparation checklist
  sanitize.js         KDP HTML tokenizer, sanitizer, and plain text
  storage.js          localStorage load/save/clear
  text.js             Title and keyword metrics
test/                 node:test suites
scripts/
  serve.mjs           Zero-dependency static server
  static-check.mjs    Local integrity and safety checks
assets/favicon.svg    Favicon
```

## KDP limits and disclaimer

Limits used by the kit were reviewed on **October 22, 2026**:

- Title and subtitle: 200 characters combined
- Description: 4,000 characters including HTML
- Keywords: seven slots of up to 50 characters each
- Categories: up to three

Amazon can change limits, category names, and AI policy at any time. This tool is a planning aid, not publishing, legal, or compliance advice, and it is not affiliated with Amazon or Kindle Direct Publishing. Confirm current requirements in KDP before publishing.

## License

MIT. Copyright (c) 2026 Asdale Dynamics, LLC. See [LICENSE](./LICENSE).

---

Part of the [Asdale Dynamics](https://dylanasdale.github.io) toolkit — AI explained like a friend would.
