import { LIMITS, WARN_AT } from './constants.js';

export function asString(value) {
  return typeof value === 'string' ? value : '';
}

// KDP character limits are enforced conservatively with UTF-16 length.
export function countCharacters(value) {
  return asString(value).length;
}

export function countWords(value) {
  const text = asString(value).trim();
  return text ? text.split(/\s+/u).length : 0;
}

export function formatCount(value) {
  return new Intl.NumberFormat('en-US').format(Number.isFinite(value) ? value : 0);
}

export function analyzeTitle(title, subtitle) {
  const titleText = asString(title);
  const subtitleText = asString(subtitle);
  const titleCount = countCharacters(titleText);
  const subtitleCount = countCharacters(subtitleText);
  const combined = titleCount + subtitleCount;
  const limit = LIMITS.titleSubtitle;
  const overBy = Math.max(0, combined - limit);
  const remaining = Math.max(0, limit - combined);

  let state = 'ok';
  if (combined === 0) state = 'empty';
  else if (overBy > 0) state = 'over';
  else if (combined >= WARN_AT.titleSubtitle) state = 'near';

  return {
    titleCount,
    subtitleCount,
    combined,
    limit,
    overBy,
    remaining,
    state,
  };
}

function normalizeKeyword(value) {
  return asString(value).trim().replace(/\s+/gu, ' ').toLowerCase();
}

export function analyzeKeywords(values) {
  const limit = LIMITS.keywordLength;
  const source = Array.isArray(values) ? values : [];
  const rows = Array.from({ length: LIMITS.keywordSlots }, (_, index) => {
    const value = asString(source[index]);
    const trimmed = value.trim();
    const length = countCharacters(value);
    const overBy = Math.max(0, length - limit);

    let state = 'ok';
    if (!trimmed) state = 'empty';
    else if (overBy > 0) state = 'over';
    else if (length >= WARN_AT.keywordLength) state = 'near';

    return {
      index,
      value,
      trimmed,
      normalized: normalizeKeyword(value),
      length,
      limit,
      overBy,
      state,
      duplicateOf: [],
    };
  });

  const groups = new Map();
  for (const row of rows) {
    if (!row.normalized) continue;
    if (!groups.has(row.normalized)) groups.set(row.normalized, []);
    groups.get(row.normalized).push(row.index);
  }

  for (const indexes of groups.values()) {
    if (indexes.length < 2) continue;
    for (const index of indexes) {
      rows[index].duplicateOf = indexes.filter((other) => other !== index);
    }
  }

  const duplicateGroups = [...groups.values()].filter((indexes) => indexes.length > 1);
  const filled = rows.filter((row) => row.trimmed).length;
  const overLimitRows = rows.filter((row) => row.overBy > 0);
  const uniqueFilled = new Set(rows.filter((row) => row.normalized).map((row) => row.normalized)).size;

  return {
    rows,
    filled,
    filledUnique: uniqueFilled,
    remainingSlots: Math.max(0, LIMITS.keywordSlots - filled),
    overLimitRows,
    duplicateGroups,
    hasOverLimit: overLimitRows.length > 0,
    hasDuplicates: duplicateGroups.length > 0,
    allWithinLimit: overLimitRows.length === 0,
    hasIssues: overLimitRows.length > 0 || duplicateGroups.length > 0,
  };
}
