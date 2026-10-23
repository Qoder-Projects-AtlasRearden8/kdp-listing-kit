export const LIMITS = Object.freeze({
  titleSubtitle: 200,
  description: 4000,
  keywordLength: 50,
  keywordSlots: 7,
  categories: 3,
});

export const WARN_AT = Object.freeze({
  titleSubtitle: 180,
  description: 3600,
  keywordLength: 45,
});

export const ALLOWED_TAGS = Object.freeze([
  'b',
  'br',
  'em',
  'h4',
  'h5',
  'h6',
  'i',
  'li',
  'ol',
  'p',
  'u',
  'ul',
]);

export const ALLOWED_TAG_SET = new Set(ALLOWED_TAGS);
export const VOID_TAGS = new Set(['br']);

export const STORAGE_KEY = 'kdp-listing-kit:draft:v1';
export const SCHEMA_VERSION = 1;
export const LIMITS_REVIEWED = '2026-10-22';

export const KDP_HELP = Object.freeze({
  titles: 'https://kdp.amazon.com/help/topic/GW7J4WEKBVU25YEC',
  description: 'https://kdp.amazon.com/help/topic/G201189630',
  categories: 'https://kdp.amazon.com/help/topic/G200652170',
  metadata: 'https://kdp.amazon.com/help/topic/G201097560',
  aiContent: 'https://kdp.amazon.com/help/topic/G200672390',
});

export const AI_DECISIONS = Object.freeze([
  {
    id: 'disclose',
    label: 'Yes, I will disclose',
    hint: 'The book includes AI-generated text, images, or translations.',
  },
  {
    id: 'none',
    label: 'No AI-generated content',
    hint: 'Tools may have helped with editing or ideas, but no generated content is in the book.',
  },
  {
    id: 'unsure',
    label: 'I still need to check',
    hint: 'Not sure yet? Review KDP’s definitions before you publish.',
  },
]);

export const AI_DECISION_LABELS = Object.freeze({
  disclose: 'Yes, AI-generated content will be disclosed',
  none: 'No AI-generated content in the book',
  unsure: 'Still reviewing KDP guidance',
});

export const AI_CONTENT_TYPES = Object.freeze([
  {
    id: 'text',
    label: 'AI-generated text',
    hint: 'Passages or chapters created by a tool.',
  },
  {
    id: 'images',
    label: 'AI-generated images',
    hint: 'Cover art, illustrations, or other visuals created by a tool.',
  },
  {
    id: 'translations',
    label: 'AI-generated translations',
    hint: 'A translation created or substantially drafted by a tool.',
  },
]);

export const AI_CHECKS = Object.freeze([
  {
    id: 'policy',
    label: 'I reviewed KDP’s current AI content guidelines.',
  },
  {
    id: 'inventory',
    label: 'My content selections match the final version of the book.',
  },
  {
    id: 'rights',
    label: 'I have the rights to use all text and images in the book.',
  },
  {
    id: 'facts',
    label: 'I checked facts, names, and claims that AI helped produce.',
  },
  {
    id: 'revisit',
    label: 'I’ll revisit this answer if the book changes before publishing.',
  },
]);
