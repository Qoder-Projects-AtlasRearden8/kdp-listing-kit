import { ALLOWED_TAG_SET, LIMITS, VOID_TAGS, WARN_AT } from './constants.js';
import { countCharacters, countWords } from './text.js';

const TAG_RE = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^<>]*)>/;
const COMMENT_RE = /^<!--[\s\S]*?-->/;
const ENTITY_RE = /&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#\d{1,7}|#x[0-9a-fA-F]{1,6});)/g;
const DECODE_RE = /&(?:#(\d+)|#x([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]{1,31}));/g;

const BLOCK_TAGS = new Set(['p', 'h4', 'h5', 'h6']);
const RAWTEXT_TAGS = new Set(['script', 'style']);

const NAMED_ENTITIES = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '\u2014',
  ndash: '\u2013',
  hellip: '\u2026',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  copy: '\u00a9',
  reg: '\u00ae',
  trade: '\u2122',
  times: '\u00d7',
  frac12: '\u00bd',
  euro: '\u20ac',
  eacute: '\u00e9',
  egrave: '\u00e8',
  agrave: '\u00e0',
  aacute: '\u00e1',
  oacute: '\u00f3',
  iacute: '\u00ed',
  uacute: '\u00fa',
  ccedil: '\u00e7',
  ntilde: '\u00f1',
  auml: '\u00e4',
  ouml: '\u00f6',
  uuml: '\u00fc',
  szlig: '\u00df',
  Auml: '\u00c4',
  Ouml: '\u00d6',
  Uuml: '\u00dc',
});

function escapeTextForHtml(text) {
  return text
    .replace(ENTITY_RE, '&amp;')
    .replace(/</g, '&lt;');
}

function decodeEntities(text) {
  return text.replace(DECODE_RE, (match, decimal, hex, name) => {
    if (decimal) {
      const codePoint = Number.parseInt(decimal, 10);
      if (Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        && !(codePoint >= 0xd800 && codePoint <= 0xdfff)) {
        return String.fromCodePoint(codePoint);
      }
      return match;
    }

    if (hex) {
      const codePoint = Number.parseInt(hex, 16);
      if (Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        && !(codePoint >= 0xd800 && codePoint <= 0xdfff)) {
        return String.fromCodePoint(codePoint);
      }
      return match;
    }

    if (name) {
      return NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()] ?? match;
    }

    return match;
  });
}

function parseAttributeNames(attrRaw) {
  let raw = String(attrRaw ?? '').trim();
  if (!raw) return [];

  raw = raw.replace(/\/\s*$/, '').trim();
  if (!raw) return [];

  const names = [];
  const attributeRe = /([^\s=/>]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
  let match;
  while ((match = attributeRe.exec(raw)) !== null) {
    names.push(match[1].toLowerCase());
  }

  return names.length ? names : ['unparsed'];
}

function tokenizeHtml(source) {
  const tokens = [];
  let buffer = '';
  let index = 0;
  let malformedCount = 0;

  const flushText = () => {
    if (!buffer) return;
    tokens.push({ type: 'text', raw: buffer });
    buffer = '';
  };

  while (index < source.length) {
    const char = source[index];

    if (char !== '<') {
      buffer += char;
      index += 1;
      continue;
    }

    const rest = source.slice(index);
    const comment = COMMENT_RE.exec(rest);
    if (comment) {
      flushText();
      tokens.push({ type: 'comment', raw: comment[0] });
      index += comment[0].length;
      continue;
    }

    const tag = TAG_RE.exec(rest);
    if (tag) {
      const name = tag[2].toLowerCase();
      const closing = tag[1] === '/';
      flushText();
      tokens.push({
        type: 'tag',
        closing,
        name,
        attrRaw: tag[3] ?? '',
        raw: tag[0],
      });
      index += tag[0].length;

      if (!closing && RAWTEXT_TAGS.has(name)) {
        const closeRe = new RegExp(`</${name}\\s*>`, 'i');
        const closeMatch = closeRe.exec(source.slice(index));
        index = closeMatch
          ? index + closeMatch.index + closeMatch[0].length
          : source.length;
      }
      continue;
    }

    if (/[a-zA-Z/!?]/.test(source[index + 1] ?? '')) malformedCount += 1;
    buffer += '<';
    index += 1;
  }

  flushText();
  return { tokens, malformedCount };
}

function digestIssues(tokens) {
  const unsupported = new Map();
  const attributes = new Map();
  let commentCount = 0;
  let malformedCount = 0;

  for (const token of tokens) {
    if (token.type === 'comment') {
      commentCount += 1;
      continue;
    }
    if (token.type !== 'tag') continue;

    if (!ALLOWED_TAG_SET.has(token.name)) {
      unsupported.set(token.name, (unsupported.get(token.name) ?? 0) + 1);
      continue;
    }

    if (token.closing && VOID_TAGS.has(token.name)) {
      malformedCount += 1;
      continue;
    }

    const attributeNames = parseAttributeNames(token.attrRaw);
    for (const attribute of attributeNames) {
      const key = `${token.name}\u0000${attribute}`;
      const current = attributes.get(key) ?? { tag: token.name, attribute, count: 0 };
      current.count += 1;
      attributes.set(key, current);
    }
  }

  return {
    unsupportedTags: [...unsupported.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    strippedAttributes: [...attributes.values()]
      .sort((a, b) => a.tag.localeCompare(b.tag) || a.attribute.localeCompare(b.attribute)),
    commentCount,
    malformedCount,
  };
}

function buildSafeHtml(tokens) {
  let html = '';

  for (const token of tokens) {
    if (token.type === 'text') {
      html += escapeTextForHtml(token.raw);
      continue;
    }
    if (token.type !== 'tag') continue;

    if (!ALLOWED_TAG_SET.has(token.name)) continue;
    if (token.closing && VOID_TAGS.has(token.name)) continue;

    if (token.name === 'br') {
      html += '<br>';
    } else if (token.closing) {
      html += `</${token.name}>`;
    } else {
      html += `<${token.name}>`;
    }
  }

  return html;
}

function buildPlainText(tokens) {
  let out = '';

  const trimTrailingSpace = () => {
    out = out.replace(/[ \t]+$/u, '');
  };
  const lineBreak = () => {
    trimTrailingSpace();
    if (out && !out.endsWith('\n')) out += '\n';
  };
  const paragraphBreak = () => {
    if (!out) return;
    trimTrailingSpace();
    out = out.replace(/\n+$/u, '');
    out += '\n\n';
  };

  for (const token of tokens) {
    if (token.type === 'text') {
      const text = decodeEntities(token.raw).replace(/\s+/gu, ' ');
      out += text;
      continue;
    }
    if (token.type !== 'tag' || !ALLOWED_TAG_SET.has(token.name)) continue;

    if (token.name === 'br') {
      if (!token.closing) lineBreak();
    } else if (BLOCK_TAGS.has(token.name)) {
      paragraphBreak();
    } else if (token.name === 'li') {
      if (token.closing) {
        lineBreak();
      } else {
        lineBreak();
        out += '\u2022 ';
      }
    } else if (token.name === 'ul' || token.name === 'ol') {
      if (token.closing) paragraphBreak();
      else lineBreak();
    }
  }

  const lines = out
    .replace(/\r\n/gu, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/gu, ' ').trim());

  const cleaned = [];
  for (const line of lines) {
    if (!line) {
      if (cleaned.length && cleaned[cleaned.length - 1] !== '') cleaned.push('');
      continue;
    }
    cleaned.push(line);
  }
  while (cleaned.length && cleaned[cleaned.length - 1] === '') cleaned.pop();

  return cleaned.join('\n').trim();
}

export function sanitizeDescription(input) {
  const source = typeof input === 'string' ? input : '';
  const { tokens, malformedCount: strayCount } = tokenizeHtml(source);
  const issues = digestIssues(tokens);
  const malformedCount = issues.malformedCount + strayCount;
  const safeHtml = buildSafeHtml(tokens);
  const plainText = buildPlainText(tokens);
  const rawCount = countCharacters(source);
  const limit = LIMITS.description;
  const overBy = Math.max(0, rawCount - limit);
  const remaining = Math.max(0, limit - rawCount);
  const hasVisibleText = plainText.trim().length > 0;

  let state = 'ok';
  if (!source.trim() || !hasVisibleText) state = 'empty';
  else if (overBy > 0) state = 'over';
  else if (rawCount >= WARN_AT.description) state = 'near';

  const hasMarkupIssues = (
    issues.unsupportedTags.length > 0
    || issues.strippedAttributes.length > 0
    || issues.commentCount > 0
    || malformedCount > 0
  );

  return {
    source,
    safeHtml,
    plainText,
    rawCount,
    plainCount: countCharacters(plainText),
    wordCount: countWords(plainText),
    limit,
    overBy,
    remaining,
    state,
    hasVisibleText,
    hasMarkupIssues,
    unsupportedTags: issues.unsupportedTags,
    strippedAttributes: issues.strippedAttributes,
    commentCount: issues.commentCount,
    malformedCount,
  };
}

export function htmlToPlainText(input) {
  return sanitizeDescription(input).plainText;
}
