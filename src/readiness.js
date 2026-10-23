import { evaluateAiDisclosure } from './ai.js';
import { LIMITS } from './constants.js';
import { sanitizeDescription } from './sanitize.js';
import { analyzeKeywords, analyzeTitle, formatCount } from './text.js';

export function evaluateReadiness(draft) {
  const title = analyzeTitle(draft?.book?.title, draft?.book?.subtitle);
  const description = sanitizeDescription(draft?.description);
  const keywords = analyzeKeywords(draft?.keywords);
  const ai = evaluateAiDisclosure(draft?.ai);
  const categories = Array.isArray(draft?.categories) ? draft.categories : [];
  const filledCategories = categories.filter(
    (category) => typeof category === 'string' && category.trim(),
  ).length;

  const titleReady = Boolean(draft?.book?.title?.trim()) && title.overBy === 0;
  let titleDetail = `${formatCount(title.combined)} / ${LIMITS.titleSubtitle} characters combined.`;
  if (!draft?.book?.title?.trim()) titleDetail = 'Add a title to begin.';
  else if (title.overBy > 0) titleDetail = `Trim ${formatCount(title.overBy)} character${title.overBy === 1 ? '' : 's'} to meet the combined limit.`;

  const descriptionReady = (
    description.hasVisibleText
    && description.overBy === 0
    && !description.hasMarkupIssues
  );
  let descriptionDetail = `${formatCount(description.rawCount)} / ${formatCount(LIMITS.description)} characters, HTML included.`;
  if (description.overBy > 0) descriptionDetail = `Over the limit by ${formatCount(description.overBy)} characters.`;
  else if (!description.hasVisibleText) descriptionDetail = 'No visible description yet.';
  else if (description.hasMarkupIssues) descriptionDetail = 'Clean up unsupported or risky markup.';

  const keywordsReady = keywords.filled > 0 && !keywords.hasIssues;
  let keywordDetail = `${keywords.filled} of ${LIMITS.keywordSlots} slots used.`;
  if (keywords.hasOverLimit) {
    const slots = keywords.overLimitRows.map((row) => row.index + 1).join(', ');
    keywordDetail = `Check the length of slot${keywords.overLimitRows.length === 1 ? '' : 's'} ${slots}.`;
  } else if (keywords.hasDuplicates) {
    keywordDetail = 'Two or more slots repeat the same phrase.';
  } else if (keywords.filled === 0) {
    keywordDetail = 'No search phrases planned yet.';
  }

  const categoriesReady = filledCategories > 0;
  let categoryDetail = `${filledCategories} of ${LIMITS.categories} categories noted.`;
  if (filledCategories === 0) categoryDetail = 'No categories noted yet. Add at least one.';
  else if (filledCategories < LIMITS.categories) categoryDetail = `${filledCategories} of ${LIMITS.categories} categories noted. Adding another is optional.`;
  else categoryDetail = `All ${LIMITS.categories} categories noted.`;

  const steps = [
    {
      id: 'book',
      label: 'Book details',
      href: '#book',
      done: titleReady,
      detail: titleDetail,
    },
    {
      id: 'description',
      label: 'Description',
      href: '#description',
      done: descriptionReady,
      detail: descriptionDetail,
    },
    {
      id: 'keywords',
      label: 'Keywords',
      href: '#keywords',
      done: keywordsReady,
      detail: keywordDetail,
    },
    {
      id: 'categories',
      label: 'Categories',
      href: '#categories',
      done: categoriesReady,
      detail: categoryDetail,
    },
    {
      id: 'ai',
      label: 'AI disclosure',
      href: '#ai',
      done: ai.ready,
      detail: ai.ready ? ai.detail : ai.label + '.',
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  const total = steps.length;

  return {
    steps,
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    complete: completed === total,
    title,
    description,
    keywords,
    ai,
  };
}
