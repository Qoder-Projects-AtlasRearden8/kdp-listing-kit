import test from 'node:test';
import assert from 'node:assert/strict';

import { STORAGE_KEY } from '../src/constants.js';
import { createDraft, isDraftEmpty, normalizeDraft } from '../src/draft.js';
import { clearDraft, loadDraft, saveDraft } from '../src/storage.js';

class MemoryStorage {
  constructor(initial = {}) {
    this.data = new Map(Object.entries(initial));
    this.throwOnGet = false;
    this.throwOnSet = false;
  }

  getItem(key) {
    if (this.throwOnGet) throw new Error('get failed');
    return this.data.has(key) ? this.data.get(key) : null;
  }

  setItem(key, value) {
    if (this.throwOnSet) throw new Error('quota exceeded');
    this.data.set(key, String(value));
  }

  removeItem(key) {
    this.data.delete(key);
  }
}

test('createDraft returns a complete blank draft', () => {
  const draft = createDraft();
  assert.equal(draft.version, 1);
  assert.equal(draft.updatedAt, null);
  assert.deepEqual(draft.book, { title: '', subtitle: '', author: '' });
  assert.equal(draft.keywords.length, 7);
  assert.equal(draft.categories.length, 3);
  assert.equal(draft.ai.decision, 'unsure');
  assert.equal(draft.ai.generated.text, false);
  assert.equal(draft.ai.checks.policy, false);
  assert.equal(isDraftEmpty(draft), true);
});

test('normalizeDraft repairs partial, wrong-type, and legacy-shaped data', () => {
  const draft = normalizeDraft({
    book: { title: 'Tiny Book', subtitle: 42 },
    description: null,
    keywords: ['one', null, 'three', 4],
    categories: 'not an array',
    ai: {
      decision: 'maybe',
      generated: { text: true, images: 'yes' },
      checks: { policy: true, facts: 'sure' },
      notes: 99,
    },
    updatedAt: 'not a date',
  });

  assert.equal(draft.book.title, 'Tiny Book');
  assert.equal(draft.book.subtitle, '');
  assert.equal(draft.description, '');
  assert.deepEqual(draft.keywords, ['one', '', 'three', '', '', '', '']);
  assert.deepEqual(draft.categories, ['', '', '']);
  assert.equal(draft.ai.decision, 'unsure');
  assert.equal(draft.ai.generated.text, true);
  assert.equal(draft.ai.generated.images, false);
  assert.equal(draft.ai.checks.policy, true);
  assert.equal(draft.ai.checks.facts, false);
  assert.equal(draft.ai.notes, '');
  assert.equal(draft.updatedAt, null);
});

test('normalizeDraft truncates extra list entries and preserves valid timestamps', () => {
  const draft = normalizeDraft({
    keywords: Array(10).fill('keyword'),
    categories: Array(6).fill('category'),
    updatedAt: '2026-10-22T12:00:00.000Z',
  });

  assert.equal(draft.keywords.length, 7);
  assert.equal(draft.categories.length, 3);
  assert.equal(draft.updatedAt, '2026-10-22T12:00:00.000Z');
});

test('isDraftEmpty ignores whitespace and recognizes meaningful content', () => {
  const draft = createDraft();
  draft.book.title = '   ';
  draft.keywords[0] = '   ';
  assert.equal(isDraftEmpty(draft), true);

  draft.keywords[0] = 'a phrase';
  assert.equal(isDraftEmpty(draft), false);
});

test('saveDraft writes a versioned payload and stamps the time without mutating input', () => {
  const storage = new MemoryStorage();
  const draft = createDraft();
  draft.book.title = 'My Book';
  const now = new Date('2026-10-22T15:04:05.000Z');

  const result = saveDraft(storage, draft, now);
  assert.equal(result.ok, true);
  assert.equal(result.savedAt, now.toISOString());
  assert.equal(draft.updatedAt, null);

  const stored = JSON.parse(storage.getItem(STORAGE_KEY));
  assert.equal(stored.version, 1);
  assert.equal(stored.updatedAt, now.toISOString());
  assert.equal(stored.book.title, 'My Book');
});

test('saveDraft then loadDraft restores a normalized draft', () => {
  const storage = new MemoryStorage();
  const draft = createDraft();
  draft.book.title = 'Restored';
  draft.description = '<p>Hello</p>';
  draft.keywords[0] = 'one phrase';
  saveDraft(storage, draft, new Date('2026-10-22T15:04:05.000Z'));

  const loaded = loadDraft(storage);
  assert.equal(loaded.status, 'loaded');
  assert.equal(loaded.draft.book.title, 'Restored');
  assert.equal(loaded.draft.description, '<p>Hello</p>');
  assert.equal(loaded.draft.keywords[0], 'one phrase');
  assert.equal(loaded.draft.updatedAt, '2026-10-22T15:04:05.000Z');
});

test('loadDraft reports an empty storage slot', () => {
  const loaded = loadDraft(new MemoryStorage());
  assert.equal(loaded.status, 'empty');
  assert.equal(isDraftEmpty(loaded.draft), true);
});

test('loadDraft handles corrupt JSON and arrays without throwing', () => {
  const corrupt = loadDraft(new MemoryStorage({ [STORAGE_KEY]: '{not-json' }));
  assert.equal(corrupt.status, 'error');
  assert.equal(isDraftEmpty(corrupt.draft), true);

  const array = loadDraft(new MemoryStorage({ [STORAGE_KEY]: '[]' }));
  assert.equal(array.status, 'error');
});

test('loadDraft handles unavailable and throwing storage', () => {
  assert.equal(loadDraft(null).status, 'unavailable');

  const storage = new MemoryStorage();
  storage.throwOnGet = true;
  const result = loadDraft(storage);
  assert.equal(result.status, 'unavailable');
});

test('saveDraft reports quota or serialization failures', () => {
  const storage = new MemoryStorage();
  storage.throwOnSet = true;
  const result = saveDraft(storage, createDraft());
  assert.equal(result.ok, false);
  assert.ok(result.error instanceof Error);
  assert.equal(saveDraft(null, createDraft()).ok, false);
});

test('clearDraft removes the saved draft', () => {
  const storage = new MemoryStorage({ [STORAGE_KEY]: '{"book":{"title":"Old"}}' });
  assert.equal(clearDraft(storage).ok, true);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.equal(loadDraft(storage).status, 'empty');
  assert.equal(clearDraft(null).ok, false);
});
