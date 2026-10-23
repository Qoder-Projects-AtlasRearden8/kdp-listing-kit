import {
  AI_CHECKS,
  AI_CONTENT_TYPES,
  LIMITS,
  SCHEMA_VERSION,
} from './constants.js';
import { asString } from './text.js';

const DECISIONS = new Set(['unsure', 'none', 'disclose']);

export function createDraft() {
  return {
    version: SCHEMA_VERSION,
    updatedAt: null,
    book: {
      title: '',
      subtitle: '',
      author: '',
    },
    description: '',
    keywords: Array.from({ length: LIMITS.keywordSlots }, () => ''),
    categories: Array.from({ length: LIMITS.categories }, () => ''),
    categoryNotes: '',
    ai: {
      decision: 'unsure',
      generated: Object.fromEntries(AI_CONTENT_TYPES.map((type) => [type.id, false])),
      checks: Object.fromEntries(AI_CHECKS.map((check) => [check.id, false])),
      notes: '',
    },
  };
}

function normalizeList(value, length) {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length }, (_, index) =>
    typeof source[index] === 'string' ? source[index] : '',
  );
}

export function normalizeDraft(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const book = source.book && typeof source.book === 'object' && !Array.isArray(source.book)
    ? source.book
    : {};
  const ai = source.ai && typeof source.ai === 'object' && !Array.isArray(source.ai)
    ? source.ai
    : {};
  const generated = ai.generated && typeof ai.generated === 'object' ? ai.generated : {};
  const checks = ai.checks && typeof ai.checks === 'object' ? ai.checks : {};

  const decision = DECISIONS.has(ai.decision) ? ai.decision : 'unsure';
  const updatedAt = typeof source.updatedAt === 'string' && !Number.isNaN(Date.parse(source.updatedAt))
    ? source.updatedAt
    : null;

  return {
    version: SCHEMA_VERSION,
    updatedAt,
    book: {
      title: asString(book.title),
      subtitle: asString(book.subtitle),
      author: asString(book.author),
    },
    description: asString(source.description),
    keywords: normalizeList(source.keywords, LIMITS.keywordSlots),
    categories: normalizeList(source.categories, LIMITS.categories),
    categoryNotes: asString(source.categoryNotes),
    ai: {
      decision,
      generated: Object.fromEntries(
        AI_CONTENT_TYPES.map((type) => [type.id, generated[type.id] === true]),
      ),
      checks: Object.fromEntries(
        AI_CHECKS.map((check) => [check.id, checks[check.id] === true]),
      ),
      notes: asString(ai.notes),
    },
  };
}

export function isDraftEmpty(input) {
  const draft = normalizeDraft(input);
  const blank = createDraft();

  return (
    draft.book.title.trim() === '' &&
    draft.book.subtitle.trim() === '' &&
    draft.book.author.trim() === '' &&
    draft.description.trim() === '' &&
    draft.keywords.every((keyword) => keyword.trim() === '') &&
    draft.categories.every((category) => category.trim() === '') &&
    draft.categoryNotes.trim() === '' &&
    draft.ai.decision === blank.ai.decision &&
    AI_CONTENT_TYPES.every((type) => draft.ai.generated[type.id] === false) &&
    AI_CHECKS.every((check) => draft.ai.checks[check.id] === false) &&
    draft.ai.notes.trim() === ''
  );
}
