import {
  AI_CHECKS,
  AI_DECISION_LABELS,
  LIMITS,
  LIMITS_REVIEWED,
  KDP_HELP,
} from './constants.js';
import { normalizeDraft } from './draft.js';
import { evaluateReadiness } from './readiness.js';
import { formatCount } from './text.js';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function escapeMarkdownInline(value) {
  return String(value ?? '')
    .replace(/\r?\n/gu, ' ')
    .replace(/\\/gu, '\\\\')
    .replace(/([`*_\[\]<>|~])/gu, '\\$1');
}

function display(value) {
  const text = String(value ?? '').trim();
  return text ? escapeMarkdownInline(text) : '\u2014';
}

function blockquote(value) {
  const text = String(value ?? '').replace(/\r\n/gu, '\n').trim();
  if (!text) return '_None._';
  return text
    .split('\n')
    .map((line) => (line.trim() ? `> ${line}` : '>'))
    .join('\n');
}

function fenceFor(content) {
  const runs = String(content).match(/`+/gu) ?? [];
  const longest = runs.reduce((max, run) => Math.max(max, run.length), 0);
  return '`'.repeat(Math.max(3, longest + 1));
}

function codeBlock(content, language = '') {
  const fence = fenceFor(content);
  return `${fence}${language}\n${content}\n${fence}`;
}

function validDate(now) {
  return now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
}

export function formatLongDate(date) {
  const value = validDate(date);
  return `${MONTHS[value.getMonth()]} ${value.getDate()}, ${value.getFullYear()}`;
}

export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 60)
    .replace(/-+$/gu, '');
}

export function buildExportFileName(draft) {
  const title = draft?.book?.title;
  const slug = slugify(title) || 'untitled-book';
  return `kdp-listing-${slug}.md`;
}

export function buildListingSheet(draftInput, options = {}) {
  const draft = normalizeDraft(draftInput);
  const now = validDate(options.now ?? new Date());
  const readiness = evaluateReadiness(draft);
  const { title, description, keywords, ai } = readiness;
  const book = draft.book;
  const pageTitle = book.title.trim() ? escapeMarkdownInline(book.title.trim()) : 'Untitled book';
  const updatedLabel = draft.updatedAt
    ? formatLongDate(new Date(draft.updatedAt))
    : 'Not saved yet';

  const lines = [];

  lines.push(`# KDP Listing Sheet \u2014 ${pageTitle}`);
  lines.push('');
  lines.push('Prepared with KDP Listing Kit, a local-first planning tool from ASDALE DYNAMICS, LLC.');
  lines.push('');
  lines.push(`- Exported: ${formatLongDate(now)}`);
  lines.push(`- Local draft last saved: ${updatedLabel}`);
  lines.push('- KDP limits reviewed for this kit: ' + formatLongDate(new Date(`${LIMITS_REVIEWED}T12:00:00`)));
  lines.push('');
  lines.push('> This is a planning sheet, not publishing advice. Confirm current limits and AI policy in KDP before you publish.');
  lines.push('');

  lines.push('## Book details');
  lines.push('');
  lines.push(`- **Title:** ${display(book.title)}`);
  lines.push(`- **Subtitle:** ${display(book.subtitle)}`);
  lines.push(`- **Author / pen name:** ${display(book.author)}`);
  const titleVerdict = title.overBy > 0
    ? `Over by ${formatCount(title.overBy)}`
    : 'Within limit';
  lines.push(`- **Title + subtitle:** ${formatCount(title.combined)} / ${LIMITS.titleSubtitle} characters (${titleVerdict})`);
  lines.push('');

  lines.push('## Description');
  lines.push('');
  lines.push(`- **Source length:** ${formatCount(description.rawCount)} / ${formatCount(LIMITS.description)} characters (HTML included)`);
  lines.push(`- **Approx. visible length:** ${formatCount(description.plainCount)} characters`);
  lines.push(`- **Approx. word count:** ${formatCount(description.wordCount)}`);
  const lengthVerdict = description.overBy > 0
    ? `Over by ${formatCount(description.overBy)} characters`
    : 'Within the 4,000-character limit';
  lines.push(`- **Length check:** ${description.hasVisibleText ? lengthVerdict : 'No visible description yet'}`);
  lines.push(`- **Markup check:** ${description.hasMarkupIssues ? 'Needs cleanup' : 'KDP-safe'}`);
  lines.push('');

  if (description.hasVisibleText || description.source.trim()) {
    lines.push('### Description HTML');
    lines.push('');
    lines.push(codeBlock(description.source, 'html'));
    lines.push('');

    if (description.hasMarkupIssues) {
      lines.push('### KDP-safe version (generated)');
      lines.push('');
      lines.push('Unsupported tags and attributes were removed, and text was escaped where needed.');
      lines.push('');
      lines.push(codeBlock(description.safeHtml, 'html'));
      lines.push('');
    }

    lines.push('### Plain-text preview');
    lines.push('');
    lines.push(codeBlock(description.plainText || '(No visible text)', 'text'));
    lines.push('');
  } else {
    lines.push('_No description written yet._');
    lines.push('');
  }

  const markupNotes = [];
  if (description.unsupportedTags.length) {
    const tags = description.unsupportedTags
      .map((item) => `\`<${item.name}>\` (${item.count})`)
      .join(', ');
    markupNotes.push(`- Unsupported tags: ${tags}`);
  }
  if (description.strippedAttributes.length) {
    const attrs = description.strippedAttributes
      .map((item) => `\`${item.tag} ${item.attribute}\` (${item.count})`)
      .join(', ');
    markupNotes.push(`- Attributes removed: ${attrs}`);
  }
  if (description.commentCount > 0) {
    markupNotes.push(`- HTML comments removed: ${description.commentCount}`);
  }
  if (description.malformedCount > 0) {
    markupNotes.push(`- Malformed tag-like text found: ${description.malformedCount}`);
  }
  if (markupNotes.length) {
    lines.push('### Markup notes');
    lines.push('');
    lines.push(...markupNotes);
    lines.push('');
  }

  lines.push(`## Keywords (${LIMITS.keywordSlots} slots, ${LIMITS.keywordLength} characters each)`);
  lines.push('');
  keywords.rows.forEach((row, index) => {
    const parts = [];
    if (row.duplicateOf.length) {
      parts.push(`also in slot ${row.duplicateOf.map((item) => item + 1).join(', ')}`);
    }
    if (row.overBy > 0) parts.push(`${formatCount(row.overBy)} over`);
    const suffix = parts.length ? ` (${parts.join('; ')})` : '';
    lines.push(`${index + 1}. ${row.trimmed ? escapeMarkdownInline(row.trimmed) : '\u2014'} \u2014 ${row.length} / ${LIMITS.keywordLength} characters${suffix}`);
  });
  lines.push('');
  if (keywords.hasOverLimit) {
    lines.push(`- **Length warning:** slot${keywords.overLimitRows.length === 1 ? '' : 's'} ${keywords.overLimitRows.map((row) => row.index + 1).join(', ')} exceed ${LIMITS.keywordLength} characters.`);
  }
  if (keywords.hasDuplicates) {
    const groups = keywords.duplicateGroups
      .map((group) => group.map((index) => index + 1).join(' & '))
      .join(', ');
    lines.push(`- **Duplicate warning:** repeated phrase in slots ${groups}.`);
  }
  if (!keywords.hasOverLimit && !keywords.hasDuplicates) {
    lines.push('- **Keyword check:** no length or duplicate issues found.');
  }
  lines.push('');

  lines.push('## Categories');
  lines.push('');
  lines.push(`KDP allows up to ${LIMITS.categories} categories. Category names in the KDP picker may differ.`);
  lines.push('');
  draft.categories.forEach((category, index) => {
    lines.push(`- **Category ${index + 1}:** ${display(category)}`);
  });
  lines.push('');
  lines.push('### Category notes');
  lines.push('');
  lines.push(blockquote(draft.categoryNotes));
  lines.push('');

  lines.push('## AI content disclosure plan');
  lines.push('');
  lines.push(`- **Decision:** ${AI_DECISION_LABELS[ai.decision]}`);
  lines.push(`- **AI-generated content marked:** ${ai.selectedTypes.length
    ? ai.selectedTypes.map((type) => type.label).join(', ')
    : 'None marked'}`);
  lines.push(`- **Plan status:** ${ai.label}. ${ai.detail}`);
  lines.push(`- **Publish checklist:** ${ai.checksDone} / ${ai.checksTotal} confirmed`);
  lines.push('');
  for (const check of AI_CHECKS) {
    lines.push(`  - [${draft.ai.checks[check.id] ? 'x' : ' '}] ${escapeMarkdownInline(check.label)}`);
  }
  lines.push('');
  lines.push('### Disclosure notes');
  lines.push('');
  lines.push(blockquote(draft.ai.notes));
  lines.push('');

  lines.push('## Prep checklist');
  lines.push('');
  for (const step of readiness.steps) {
    lines.push(`- [${step.done ? 'x' : ' '}] **${step.label}:** ${escapeMarkdownInline(step.detail)}`);
  }
  lines.push('');
  lines.push(`${readiness.completed} of ${readiness.total} checks complete.`);
  lines.push('');

  lines.push('## Official KDP help');
  lines.push('');
  lines.push(`- [Book titles and subtitles](${KDP_HELP.titles})`);
  lines.push(`- [Book description HTML](${KDP_HELP.description})`);
  lines.push(`- [Book metadata and keywords](${KDP_HELP.metadata})`);
  lines.push(`- [Categories](${KDP_HELP.categories})`);
  lines.push(`- [Content guidelines and AI disclosure](${KDP_HELP.aiContent})`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('Generated locally by KDP Listing Kit. No draft data left your browser.');
  lines.push('Not affiliated with Amazon or Kindle Direct Publishing.');
  lines.push('');

  return lines.join('\n');
}
