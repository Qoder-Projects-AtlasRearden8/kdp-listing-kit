# KDP Listing Kit

A free, local-first workbook for preparing an Amazon KDP book listing. Check title limits, write a description against KDP's HTML allowlist, plan seven keywords, note categories, and record an AI-disclosure plan — then export the whole thing as a Markdown sheet.

Built by **ASDALE DYNAMICS, LLC** as part of a plain-English AI and author-tools toolkit. No account, no server, no tracking, and no build step.

## What it does

- **Title and subtitle checker** — counts title and subtitle together against KDP's 200-character combined budget, with early warnings and over-limit states.
- **Description editor** — a source editor for KDP's allowed HTML with a live, sanitized preview, raw and visible character counts, word count, over-limit warnings, and a one-click **Clean HTML** action. Unsupported tags, attributes, comments, and script/style contents are flagged and removed from the preview.
- **Seven-keyword planner** — seven 50-character slots with live length feedback, duplicate detection, and guidance on giving each slot a distinct job.
- **Category notes** — three category fields plus a free-form research note area.
- **AI-disclosure checklist** — records a disclosure decision, flags conflicting answers, tracks which AI-generated content types are present, and includes a five-item pre-publish checklist.
- **Local drafts** — saves automatically to `localStorage`, shows save state, restores after reload, and can clear the local draft.
- **Markdown export** — downloads a complete listing sheet, including counts, description HTML, plain-text preview, markup notes, keywords, categories, AI plan, and prep status. Also offers copy-to-clipboard.
- **Demo draft** — loads a fictional sample so the workflow can be explored immediately.
- **Accessible, responsive UI** — keyboard-friendly controls, labelled fields, live regions, skip link, and layouts for desktop and mobile.

## Run locally

Requires Node.js 20 or newer (no npm dependencies).

```bash
npm start
```

Open <http://127.0.0.1:4173/>. Use `PORT=4174 npm start` if the default port is busy.

The app is plain HTML, CSS, and ES modules. It can also be opened from any static file server; opening `index.html` directly from the filesystem may block ES modules in some browsers.

## Test

```bash
npm test          # Node's built-in test runner
npm run check     # tests plus static integrity, link, ARIA, and secret checks
```

The suite covers text metrics, keyword analysis, HTML sanitization, the description editor helpers, readiness logic, AI disclosure logic, draft normalization and storage, and Markdown export.

## Deploy to GitHub Pages

There is no build step and no remote asset dependency.

1. Push the repository to GitHub (after reviewing what you are publishing).
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main`, and use the repository root (`/`).
4. Save. The included `.nojekyll` file tells GitHub Pages to serve the files as-is.

All asset paths are relative, so the app also works from a project subpath such as `https://<user>.github.io/kdp-listing-kit/`.

## Project layout

```
index.html            Page shell and all sections
styles.css            Visual design and responsive layout
app.js                DOM wiring, rendering, saving, export
src/
  ai.js               AI-disclosure evaluation
  constants.js        KDP limits, allowlisted tags, storage key
  demo.js             Fictional demo draft
  draft.js            Draft creation and normalization
  editor.js           Selection wrapping and list helpers
  markdown.js         Markdown sheet and file-name generation
  readiness.js        Five-step preparation checklist
  sanitize.js         KDP HTML tokenizer, sanitizer, plain text
  storage.js          localStorage load/save/clear
  text.js             Title and keyword metrics
test/                 node:test suites
scripts/
  serve.mjs           Zero-dependency static server
  static-check.mjs    Local integrity and safety checks
assets/favicon.svg    Favicon
```

## Privacy and safety

- Draft data stays in the browser's `localStorage` and never leaves the machine.
- The page's Content Security Policy blocks network connections (`connect-src 'none'`); there are no analytics, fonts, or remote scripts.
- The preview is built from an allowlist, never by injecting the raw description. Event handlers, attributes, unsupported tags, comments, and script/style contents cannot reach the rendered preview.
- Do not store API keys, passwords, or private reader data in the notes fields.

## KDP limits and disclaimer

The kit uses the commonly published KDP limits reviewed on October 22, 2026:

- Title and subtitle: 200 characters combined
- Description: 4,000 characters, including HTML
- Keywords: 7 slots of up to 50 characters each
- Categories: up to 3

Amazon can change its limits, category names, and AI-content policy at any time. This tool is a planning aid, not publishing, legal, or compliance advice, and it is not affiliated with Amazon or Kindle Direct Publishing. Confirm current requirements in KDP before publishing.

## License

MIT. Copyright (c) 2026 Asdale Dynamics, LLC. See [LICENSE](./LICENSE).

---

Part of the [Asdale Dynamics](https://dylanasdale.github.io) toolkit — AI explained like a friend would.
