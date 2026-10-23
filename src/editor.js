function clampRange(source, start, end) {
  const length = source.length;
  const safeStart = Math.min(Math.max(Number.isFinite(start) ? Math.floor(start) : 0, 0), length);
  const rawEnd = Number.isFinite(end) ? Math.floor(end) : safeStart;
  const safeEnd = Math.min(Math.max(rawEnd, safeStart), length);
  return { start: safeStart, end: safeEnd };
}

export function wrapSelection(value, start, end, openTag, closeTag, placeholder = '') {
  const source = typeof value === 'string' ? value : '';
  const range = clampRange(source, start, end);
  const selected = source.slice(range.start, range.end);
  const inner = selected || placeholder;
  const next = (
    source.slice(0, range.start)
    + openTag
    + inner
    + closeTag
    + source.slice(range.end)
  );

  return {
    value: next,
    selectionStart: range.start + openTag.length,
    selectionEnd: range.start + openTag.length + inner.length,
  };
}

export function insertSnippet(value, start, end, snippet) {
  const source = typeof value === 'string' ? value : '';
  const range = clampRange(source, start, end);
  const next = source.slice(0, range.start) + snippet + source.slice(range.end);

  return {
    value: next,
    selectionStart: range.start + snippet.length,
    selectionEnd: range.start + snippet.length,
  };
}

export function wrapList(value, start, end, ordered = false) {
  const source = typeof value === 'string' ? value : '';
  const range = clampRange(source, start, end);
  const selected = source.slice(range.start, range.end);
  const open = ordered ? '<ol>' : '<ul>';
  const close = ordered ? '</ol>' : '</ul>';

  let items = selected
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const hasSelection = items.length > 0;
  if (!hasSelection) items = ['List item'];

  const prefix = `${open}\n  <li>`;
  const separator = '</li>\n  <li>';
  const suffix = `</li>\n${close}`;
  const replacement = prefix + items.join(separator) + suffix;
  const next = source.slice(0, range.start) + replacement + source.slice(range.end);

  const selectionStart = range.start + (hasSelection
    ? replacement.length
    : prefix.length);
  const selectionEnd = range.start + (hasSelection
    ? replacement.length
    : prefix.length + items[0].length);

  return {
    value: next,
    selectionStart,
    selectionEnd,
  };
}
