import test from 'node:test';
import assert from 'node:assert/strict';

import { createDemoDraft } from '../src/demo.js';
import { createDraft } from '../src/draft.js';
import {
  buildExportFileName,
  buildListingSheet,
  escapeMarkdownInline,
  formatLongDate,
  slugify,
} from '../src/markdown.js';

const NOW = new Date(2026, 9, 22, 15, 30);

test('formats dates without locale drift', () => {
  assert.equal(formatLongDate(NOW), 'October 22, 2026');
});

test('escapes Markdown control characters in inline text', () => {
  assert.equal(escapeMarkdownInline('A *bold*_ [link](x) | <tag> `code` \\ end'),
    'A \\*bold\\*\\_ \\[link\\](x) \\| \\<tag\\> \\`code\\` \\\\ end');
  assert.equal(escapeMarkdownInline('two\nlines'), 'two lines');
});

test('slugifies a title for a safe download filename', () => {
  assert.equal(slugify('Café & AI: A Friendly Guide!'), 'cafe-ai-a-friendly-guide');
  assert.equal(slugify('***'), '');
  assert.equal(buildExportFileName({ book: { title: 'The Massive AI Manual' } }),
    'kdp-listing-the-massive-ai-manual.md');
  assert.equal(buildExportFileName({ book: { title: '' } }), 'kdp-listing-untitled-book.md');
  assert.equal(buildExportFileName({ book: { title: 'x'.repeat(100) } }).length <= 75, true);
});

test('builds a complete Markdown sheet from the demo draft', () => {
  const draft = createDemoDraft();
  const sheet = buildListingSheet(draft, { now: NOW });

  assert.match(sheet, /^# KDP Listing Sheet — The Sunday AI Reset/);
  assert.match(sheet, /Exported: October 22, 2026/);
  assert.match(sheet, /\*\*Title:\*\* The Sunday AI Reset/);
  assert.match(sheet, /\*\*Subtitle:\*\* A gentle, practical guide/);
  assert.match(sheet, /## Description/);
  assert.match(sheet, /### Description HTML/);
  assert.match(sheet, /## Keywords \(7 slots, 50 characters each\)/);
  assert.match(sheet, /## Categories/);
  assert.match(sheet, /## AI content disclosure plan/);
  assert.match(sheet, /1\. beginner AI guide for busy adults/);
  assert.match(sheet, /7\. tech guide for non-tech people/);
  assert.match(sheet, /AI-generated text, AI-generated images/);
  assert.match(sheet, /\[x\] I reviewed KDP’s current AI content guidelines\./);
  assert.match(sheet, /5 of 5 checks complete\./);
  assert.match(sheet, /## Prep checklist/);
  assert.match(sheet, /## Official KDP help/);
  assert.match(sheet, /https:\/\/kdp\.amazon\.com\/help\/topic\/G201189630/);
  assert.match(sheet, /Not affiliated with Amazon or Kindle Direct Publishing\./);
  assert.doesNotMatch(sheet, /undefined|\[object Object\]/);
  assert.doesNotMatch(sheet, /\$\{/);
});

test('includes an over-limit warning and raw HTML counts', () => {
  const draft = createDraft();
  draft.book.title = 'Long Book';
  draft.description = `<p>${'x'.repeat(4008)}</p>`;
  const sheet = buildListingSheet(draft, { now: NOW });

  assert.match(sheet, /Over by 15 characters/);
  assert.match(sheet, /Length check:\*\* Over by/);
});

test('reports an over-limit description even when no text is visible', () => {
  const draft = createDraft();
  draft.book.title = 'Whitespace Book';
  draft.description = `<p>${' '.repeat(4001)}</p>`;
  const sheet = buildListingSheet(draft, { now: NOW });

  assert.match(sheet, /Length check:\*\* Over by/);
  assert.doesNotMatch(sheet, /Length check:\*\* No visible description yet/);
});

test('adds a cleaned KDP-safe block when markup needs attention', () => {
  const draft = createDraft();
  draft.book.title = 'Markup Book';
  draft.description = '<div>Hello</div><p onclick="x">world <b>reader</b></p>';
  const sheet = buildListingSheet(draft, { now: NOW });

  assert.match(sheet, /Markup check:\*\* Needs cleanup/);
  assert.match(sheet, /### KDP-safe version \(generated\)/);
  assert.match(sheet, /Unsupported tags: `\<div\>` \(2\)/);
  assert.match(sheet, /Attributes removed: `p onclick` \(1\)/);
  assert.match(sheet, /Hello<p>world <b>reader<\/b><\/p>/);
});

test('uses a longer fence when the description contains backticks', () => {
  const draft = createDraft();
  draft.book.title = 'Fence Test';
  draft.description = '<p>Code-like ``` sample</p>';
  const sheet = buildListingSheet(draft, { now: NOW });

  assert.match(sheet, /````html/);
  assert.match(sheet, /````\n/);
});

test('renders empty fields gracefully', () => {
  const sheet = buildListingSheet(createDraft(), { now: NOW });
  assert.match(sheet, /# KDP Listing Sheet — Untitled book/);
  assert.match(sheet, /\*\*Title:\*\* —/);
  assert.match(sheet, /_No description written yet\._/);
  assert.match(sheet, /No description written yet/);
  assert.match(sheet, /None marked/);
  assert.match(sheet, /0 of 5 checks complete\./);
  assert.match(sheet, /Local draft last saved: Not saved yet/);
});

test('escapes a Markdown-heavy title in the heading', () => {
  const draft = createDraft();
  draft.book.title = 'Book *Star* [One] | <Two>';
  const sheet = buildListingSheet(draft, { now: NOW });
  assert.match(sheet, /^# KDP Listing Sheet — Book \\\*Star\\\* \\\[One\\\] \\\| \\<Two\\>/);
});
