import { LIMITS } from './src/constants.js';
import { createDraft, isDraftEmpty } from './src/draft.js';
import { createDemoDraft } from './src/demo.js';
import { insertSnippet, wrapList, wrapSelection } from './src/editor.js';
import { buildExportFileName, buildListingSheet } from './src/markdown.js';
import { evaluateReadiness } from './src/readiness.js';
import { sanitizeDescription } from './src/sanitize.js';
import {
  clearDraft as clearStoredDraft,
  loadDraft,
  saveDraft,
} from './src/storage.js';
import { formatCount } from './src/text.js';

const SAVE_DELAY = 450;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const els = {
  titleInput: $('#book-title'),
  subtitleInput: $('#book-subtitle'),
  authorInput: $('#book-author'),
  titleCount: $('#title-count'),
  subtitleCount: $('#subtitle-count'),
  titleCombinedCount: $('#title-combined-count'),
  titleMeterBar: $('#title-meter-bar'),
  titleLimitPanel: $('#title-limit-panel'),
  titleFeedback: $('#title-feedback'),

  descriptionInput: $('#description-input'),
  descriptionCount: $('#description-count'),
  descriptionVisibleCount: $('#description-visible-count'),
  descriptionVisibleCountFooter: $('#description-visible-count-footer'),
  descriptionWordCount: $('#description-word-count'),
  descriptionWordCountFooter: $('#description-word-count-footer'),
  descriptionMeterBar: $('#description-meter-bar'),
  descriptionLimitPanel: $('#description-limit-panel'),
  descriptionState: $('#description-state'),
  descriptionFeedback: $('#description-feedback'),
  previewTitle: $('#preview-title'),
  previewSubtitle: $('#preview-subtitle'),
  previewAuthor: $('#preview-author'),
  previewDescription: $('#preview-description'),
  previewEmpty: $('#preview-empty'),
  markupReport: $('.markup-report'),
  markupStatusIcon: $('.markup-status use'),
  markupSummary: $('#description-markup-summary'),
  issueList: $('#description-issues'),
  cleanHtml: $('#clean-html'),
  formatToolbar: $('.format-toolbar'),

  keywordFilled: $('#keyword-filled'),
  keywordFeedback: $('#keyword-feedback'),
  keywordRows: $$('[data-keyword-row]'),

  aiStatus: $('#ai-status'),
  aiStatusTitle: $('#ai-status-title'),
  aiStatusDetail: $('#ai-status-detail'),
  aiStatusIcon: $('.ai-status-icon use'),
  aiCheckProgress: $('#ai-check-progress'),

  progressCount: $('#progress-count'),
  progressBar: $('#progress-bar'),
  progressTrack: $('#prep-progress'),
  progressBadge: $('#progress-badge'),
  prepSteps: $$('.prep-step'),

  exportStatTitle: $('#export-stat-title'),
  exportStatDescription: $('#export-stat-description'),
  exportStatKeywords: $('#export-stat-keywords'),
  exportStatAi: $('#export-stat-ai'),
  exportReadinessNote: $('#export-readiness-note'),
  exportTop: $('#export-top'),
  downloadMarkdown: $('#download-markdown'),
  copyMarkdown: $('#copy-markdown'),
  loadDemo: $('#load-demo'),
  clearDraft: $('#clear-draft'),

  saveStatus: $('#save-status'),
  saveStatusText: $('#save-status-text'),
  toast: $('#toast'),
};

const boundControls = $$('[data-bind]');

let storage;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}

const loaded = loadDraft(storage);
let state = loaded.draft;
let pendingSave = false;
let saveTimer = null;
let toastTimer = null;
let hasShownSaveError = false;

const FORMATS = {
  bold: { open: '<b>', close: '</b>', placeholder: 'bold text' },
  italic: { open: '<i>', close: '</i>', placeholder: 'italic text' },
  underline: { open: '<u>', close: '</u>', placeholder: 'underlined text' },
  h4: { open: '<h4>', close: '</h4>', placeholder: 'Heading' },
  h5: { open: '<h5>', close: '</h5>', placeholder: 'Heading' },
  h6: { open: '<h6>', close: '</h6>', placeholder: 'Heading' },
  p: { open: '<p>', close: '</p>', placeholder: 'Paragraph' },
};

function getPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((current, key) => current[key], object);
  target[last] = value;
}

function setInvalid(element, invalid) {
  if (invalid) element.setAttribute('aria-invalid', 'true');
  else element.removeAttribute('aria-invalid');
}

function hydrateForm() {
  for (const control of boundControls) {
    const value = getPath(state, control.dataset.bind);
    if (control.type === 'checkbox') {
      control.checked = value === true;
    } else if (control.type === 'radio') {
      control.checked = control.dataset.value === value;
    } else {
      control.value = typeof value === 'string' ? value : '';
    }
  }
}

function updateControlState(control) {
  const path = control.dataset.bind;
  if (control.type === 'checkbox') {
    setPath(state, path, control.checked);
  } else if (control.type === 'radio') {
    if (!control.checked) return false;
    setPath(state, path, control.dataset.value);
  } else {
    setPath(state, path, control.value);
  }
  return true;
}

function onBoundTextInput(event) {
  const control = event.target.closest('[data-bind]');
  if (!control || control.type === 'checkbox' || control.type === 'radio') return;
  updateControlState(control);
  renderAll();
  queueSave();
}

function onBoundChoiceChange(event) {
  const control = event.target.closest('[data-bind]');
  if (!control || (control.type !== 'checkbox' && control.type !== 'radio')) return;
  if (!updateControlState(control)) return;
  renderAll();
  queueSave();
}

function plural(number, singular, pluralForm = `${singular}s`) {
  return number === 1 ? singular : pluralForm;
}

function setTitleUI(metrics) {
  els.titleCount.textContent = `${formatCount(metrics.titleCount)} ${plural(metrics.titleCount, 'character')}`;
  els.subtitleCount.textContent = `${formatCount(metrics.subtitleCount)} ${plural(metrics.subtitleCount, 'character')}`;
  els.titleCombinedCount.textContent = formatCount(metrics.combined);

  const percent = Math.min(100, (metrics.combined / LIMITS.titleSubtitle) * 100);
  els.titleMeterBar.style.width = `${percent}%`;
  els.titleLimitPanel.classList.toggle('is-near', metrics.state === 'near');
  els.titleLimitPanel.classList.toggle('is-over', metrics.state === 'over');
  setInvalid(els.titleInput, metrics.state === 'over');
  setInvalid(els.subtitleInput, metrics.state === 'over');

  let message = "Within KDP's 200-character combined limit.";
  if (metrics.state === 'empty') {
    message = 'KDP counts the title and subtitle together—200 characters in total.';
  } else if (metrics.state === 'over') {
    message = "Over KDP's 200-character combined limit. Trim a little from the title or subtitle.";
  } else if (metrics.state === 'near') {
    message = metrics.remaining === 0
      ? "At KDP's 200-character combined limit. One more character will be too many."
      : 'Close to the 200-character combined limit.';
  }
  els.titleFeedback.textContent = message;
}

function descriptionStateLabel(description) {
  if (description.state === 'empty') return 'Start writing';
  if (description.state === 'over') return 'Over limit';
  if (description.state === 'near') {
    return description.remaining === 0 ? 'At limit' : 'Nearly full';
  }
  return 'Within limit';
}

function descriptionStateMessage(description) {
  if (description.state === 'empty') {
    return 'Use the toolbar for formatting, or paste your own KDP-safe HTML.';
  }
  if (description.state === 'over') {
    return "Over KDP's 4,000-character limit. Remember that HTML tags count too.";
  }
  if (description.state === 'near') {
    return description.remaining === 0
      ? "At the 4,000-character limit. One more character will be too many."
      : 'Close to the 4,000-character limit. HTML tags count too.';
  }
  return "Within KDP's 4,000-character limit. HTML tags count too.";
}

function addIssue(list, prefix, codeText, suffix) {
  const item = document.createElement('li');
  item.append(prefix);
  if (codeText) {
    const code = document.createElement('code');
    code.textContent = codeText;
    item.append(code);
  }
  item.append(suffix);
  list.append(item);
}

function renderMarkupIssues(description) {
  const hasIssues = description.hasMarkupIssues;
  els.markupReport.classList.toggle('has-issues', hasIssues);
  els.markupStatusIcon.setAttribute('href', hasIssues ? '#icon-warning' : '#icon-check');
  els.cleanHtml.hidden = !hasIssues;
  els.issueList.hidden = !hasIssues;
  els.issueList.replaceChildren();

  if (!hasIssues) {
    els.markupSummary.textContent = "All markup is on KDP's allowed list.";
    return;
  }

  const issueKinds = description.unsupportedTags.reduce((sum, tag) => sum + tag.count, 0)
    + description.strippedAttributes.reduce((sum, attribute) => sum + attribute.count, 0)
    + description.commentCount
    + description.malformedCount;
  els.markupSummary.textContent = `${issueKinds} markup ${plural(issueKinds, 'issue')} found. The preview skips anything KDP does not allow.`;

  for (const tag of description.unsupportedTags) {
    addIssue(
      els.issueList,
      'Unsupported ',
      `<${tag.name}>`,
      ` removed from the preview (${formatCount(tag.count)}).`,
    );
  }

  for (const attribute of description.strippedAttributes) {
    addIssue(
      els.issueList,
      'Attribute removed: ',
      `${attribute.tag} ${attribute.attribute}`,
      ` (${formatCount(attribute.count)}). Only the tags themselves are on KDP's list.`,
    );
  }

  if (description.commentCount > 0) {
    addIssue(
      els.issueList,
      'HTML comments removed from the preview',
      '',
      ` (${formatCount(description.commentCount)}).`,
    );
  }

  if (description.malformedCount > 0) {
    addIssue(
      els.issueList,
      'Malformed tag-like text found',
      '',
      ` (${formatCount(description.malformedCount)}). It appears as text, not formatting.`,
    );
  }
}

function renderDescription(description) {
  els.descriptionCount.textContent = formatCount(description.rawCount);
  els.descriptionVisibleCount.textContent = formatCount(description.plainCount);
  els.descriptionVisibleCountFooter.textContent = formatCount(description.plainCount);
  els.descriptionWordCount.textContent = formatCount(description.wordCount);
  els.descriptionWordCountFooter.textContent = formatCount(description.wordCount);

  const percent = Math.min(100, (description.rawCount / LIMITS.description) * 100);
  els.descriptionMeterBar.style.width = `${percent}%`;
  els.descriptionMeterBar.classList.toggle('is-near', description.state === 'near');
  els.descriptionMeterBar.classList.toggle('is-over', description.state === 'over');
  els.descriptionLimitPanel.classList.toggle('is-near', description.state === 'near');
  els.descriptionLimitPanel.classList.toggle('is-over', description.state === 'over');
  setInvalid(els.descriptionInput, description.state === 'over');

  els.descriptionState.textContent = descriptionStateLabel(description);
  els.descriptionState.className = `state-pill state-pill--${description.state}`;
  els.descriptionFeedback.textContent = descriptionStateMessage(description);

  const titleText = state.book.title.trim();
  els.previewTitle.textContent = titleText || 'Your book title';
  els.previewTitle.classList.toggle('is-placeholder', !titleText);

  const subtitleText = state.book.subtitle.trim();
  els.previewSubtitle.textContent = subtitleText;
  els.previewSubtitle.hidden = !subtitleText;

  const authorText = state.book.author.trim();
  els.previewAuthor.textContent = authorText ? `by ${authorText}` : '';
  els.previewAuthor.hidden = !authorText;

  if (description.hasVisibleText) {
    els.previewDescription.innerHTML = description.safeHtml;
    els.previewDescription.hidden = false;
    els.previewEmpty.hidden = true;
  } else {
    els.previewDescription.replaceChildren();
    els.previewDescription.hidden = true;
    els.previewEmpty.hidden = false;
  }

  renderMarkupIssues(description);
}

function renderKeywords(keywords) {
  els.keywordFilled.textContent = String(keywords.filled);

  for (const rowElement of els.keywordRows) {
    const index = Number(rowElement.dataset.keywordRow);
    const row = keywords.rows[index];
    const input = $(`#keyword-${index}`);
    const count = $(`#keyword-count-${index}`);
    if (!row || !input || !count) continue;

    count.textContent = `${formatCount(row.length)} / ${LIMITS.keywordLength}`;
    rowElement.classList.toggle('is-near', row.state === 'near' && row.duplicateOf.length === 0);
    rowElement.classList.toggle('is-over', row.overBy > 0);
    rowElement.classList.toggle('is-duplicate', row.overBy === 0 && row.duplicateOf.length > 0);
    setInvalid(input, row.overBy > 0);
  }

  els.keywordFeedback.classList.remove('is-warn', 'is-error');
  let message = `${keywords.filled} of 7 slots used. All planned phrases fit the 50-character limit, with no duplicates.`;
  if (keywords.hasOverLimit) {
    const slots = keywords.overLimitRows.map((row) => row.index + 1).join(', ');
    message = `Keyword ${plural(keywords.overLimitRows.length, 'slot')} ${slots} ${plural(keywords.overLimitRows.length, 'is', 'are')} over 50 characters.`;
    els.keywordFeedback.classList.add('is-error');
  } else if (keywords.hasDuplicates) {
    const groups = keywords.duplicateGroups
      .map((group) => group.map((index) => index + 1).join(' and '))
      .join('; ');
    message = `Slot${keywords.duplicateGroups.length === 1 ? '' : 's'} ${groups} repeat the same phrase. Give each slot a different job.`;
    els.keywordFeedback.classList.add('is-warn');
  } else if (keywords.filled === 0) {
    message = 'No search phrases planned yet. There is no need to fill all seven if the phrases are not useful.';
  }
  els.keywordFeedback.textContent = message;
}

function aiStatusIcon(tone) {
  if (tone === 'ok') return '#icon-check';
  if (tone === 'warn' || tone === 'error') return '#icon-warning';
  return '#icon-info';
}

function renderAi(ai) {
  els.aiCheckProgress.textContent = `${ai.checksDone} of ${ai.checksTotal}`;
  els.aiStatus.className = `ai-status is-${ai.tone}`;
  els.aiStatusTitle.textContent = ai.label;
  els.aiStatusDetail.textContent = ai.detail;
  els.aiStatusIcon.setAttribute('href', aiStatusIcon(ai.tone));
}

function progressBadge(completed) {
  if (completed >= 5) return 'Checks clear';
  if (completed >= 3) return 'Nearly there';
  if (completed >= 1) return 'Taking shape';
  return 'Just starting';
}

function renderProgress(readiness) {
  els.progressCount.textContent = String(readiness.completed);
  els.progressBar.style.width = `${readiness.percent}%`;
  els.progressTrack.setAttribute('aria-valuenow', String(readiness.completed));
  els.progressTrack.setAttribute('aria-valuetext', `${readiness.completed} of ${readiness.total} prep checks complete`);
  els.progressBadge.textContent = progressBadge(readiness.completed);

  for (const step of readiness.steps) {
    const item = $(`.prep-step[data-step="${step.id}"]`);
    if (!item) continue;
    item.classList.toggle('is-done', step.done);
    const detail = $(`#step-detail-${step.id}`);
    const stateLabel = $(`#step-state-${step.id}`);
    if (detail) detail.textContent = step.detail;
    if (stateLabel) stateLabel.textContent = step.done ? 'Complete.' : 'Not complete.';
  }
}

function aiShortLabel(ai) {
  if (ai.state === 'ready-none') return 'No disclosure';
  if (ai.state === 'ready-disclose') return 'Will disclose';
  return 'Needs review';
}

function renderExport(readiness) {
  els.exportStatTitle.textContent = `${formatCount(readiness.title.combined)} / ${LIMITS.titleSubtitle}`;
  els.exportStatDescription.textContent = `${formatCount(readiness.description.rawCount)} / ${formatCount(LIMITS.description)}`;
  els.exportStatKeywords.textContent = `${readiness.keywords.filled} of ${LIMITS.keywordSlots}`;
  els.exportStatAi.textContent = aiShortLabel(readiness.ai);

  if (readiness.complete) {
    els.exportReadinessNote.textContent = 'All five prep checks are clear. Your sheet will be a clean summary of the listing.';
  } else {
    els.exportReadinessNote.textContent = `${readiness.completed} of ${readiness.total} prep checks are clear. You can export now; the sheet will mark anything still open.`;
  }
}

function renderAll() {
  const readiness = evaluateReadiness(state);
  setTitleUI(readiness.title);
  renderDescription(readiness.description);
  renderKeywords(readiness.keywords);
  renderAi(readiness.ai);
  renderProgress(readiness);
  renderExport(readiness);
  return readiness;
}

function setSaveStatus(kind, text, title = '') {
  els.saveStatus.classList.remove('is-saving', 'is-saved', 'is-error');
  if (kind) els.saveStatus.classList.add(`is-${kind}`);
  els.saveStatusText.textContent = text;
  if (title) els.saveStatus.title = title;
  else els.saveStatus.removeAttribute('title');
}

function formatSaveTime(isoString) {
  try {
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!pendingSave) return true;

  const result = saveDraft(storage, state, new Date());
  pendingSave = false;

  if (!result.ok) {
    setSaveStatus('error', 'Could not save locally', 'Your browser blocked local storage. Use Export to keep a copy.');
    if (!hasShownSaveError) {
      hasShownSaveError = true;
      showToast('This browser blocked local saving. Download your Markdown sheet to keep a copy.', true);
    }
    return false;
  }

  hasShownSaveError = false;
  state.updatedAt = result.savedAt;
  const time = formatSaveTime(result.savedAt);
  setSaveStatus('saved', 'Saved locally', time ? `Last saved at ${time}` : 'Saved in this browser.');
  return true;
}

function queueSave() {
  pendingSave = true;
  setSaveStatus('saving', 'Saving…');
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, SAVE_DELAY);
}

function showToast(message, isError = false) {
  if (toastTimer) clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.toggle('is-error', isError);
  els.toast.hidden = false;
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
    toastTimer = null;
  }, 4600);
}

function writeEditorValue(value, selectionStart, selectionEnd) {
  els.descriptionInput.value = value;
  els.descriptionInput.focus();
  els.descriptionInput.setSelectionRange(selectionStart, selectionEnd);
  els.descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function applyFormat(format) {
  const input = els.descriptionInput;
  const value = input.value;
  const start = input.selectionStart ?? value.length;
  const end = input.selectionEnd ?? start;

  if (format === 'ul' || format === 'ol') {
    const result = wrapList(value, start, end, format === 'ol');
    writeEditorValue(result.value, result.selectionStart, result.selectionEnd);
    return;
  }

  if (format === 'br') {
    const result = insertSnippet(value, start, end, '<br>');
    writeEditorValue(result.value, result.selectionStart, result.selectionEnd);
    return;
  }

  const config = FORMATS[format];
  if (!config) return;
  const result = wrapSelection(
    value,
    start,
    end,
    config.open,
    config.close,
    config.placeholder,
  );
  writeEditorValue(result.value, result.selectionStart, result.selectionEnd);
}

function cleanDescriptionHtml() {
  const cleaned = sanitizeDescription(els.descriptionInput.value).safeHtml;
  if (cleaned === els.descriptionInput.value) {
    showToast('Nothing needed cleaning.');
    return;
  }
  writeEditorValue(cleaned, cleaned.length, cleaned.length);
  showToast('Unsupported markup removed. Give the preview a quick look.');
}

function loadDemoDraft() {
  if (!isDraftEmpty(state)) {
    const confirmed = window.confirm(
      'Load the demo draft? It will replace the current draft in this browser. Download a sheet first if you want to keep your work.',
    );
    if (!confirmed) return;
  }

  state = createDemoDraft();
  hydrateForm();
  renderAll();
  pendingSave = true;
  flushSave();
  showToast('Demo loaded. It is a fictional sample—replace it with your book.');
  $('#book').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetDraft() {
  const confirmed = window.confirm(
    'Clear this draft? This removes the locally saved listing from this browser and cannot be undone. Download a Markdown sheet first if you want to keep it.',
  );
  if (!confirmed) return;

  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pendingSave = false;

  const result = clearStoredDraft(storage);
  state = createDraft();
  hydrateForm();
  renderAll();
  setSaveStatus(null, 'New local draft');
  els.titleInput.focus();
  els.titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

  if (!result.ok) {
    showToast('The page is reset, but this browser would not remove the old saved copy.', true);
  } else {
    showToast('Draft cleared from this browser.');
  }
}

function getMarkdownSheet() {
  return buildListingSheet(state, { now: new Date() });
}

function downloadMarkdown() {
  try {
    const markdown = getMarkdownSheet();
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildExportFileName(state);
    anchor.rel = 'noopener';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast('Markdown sheet downloaded.');
  } catch {
    showToast('The download could not start. Try Copy Markdown instead.', true);
  }
}

function fallbackCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-9999px';
  area.style.left = '-9999px';
  const previousSelection = document.getSelection();
  const previousRange = previousSelection && previousSelection.rangeCount > 0
    ? previousSelection.getRangeAt(0)
    : null;

  document.body.append(area);
  area.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    area.remove();
    if (previousRange && previousSelection) {
      previousSelection.removeAllRanges();
      previousSelection.addRange(previousRange);
    }
  }
  return copied;
}

async function copyMarkdown() {
  const markdown = getMarkdownSheet();
  let copied = false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(markdown);
      copied = true;
    } catch {
      copied = false;
    }
  }

  if (!copied) copied = fallbackCopy(markdown);

  if (copied) showToast('Markdown sheet copied.');
  else showToast('Copy was blocked. Use Download Markdown instead.', true);
}

function initialSaveStatus() {
  if (loaded.status === 'loaded') {
    setSaveStatus('saved', 'Saved locally', "This draft was restored from this browser's local storage.");
  } else if (loaded.status === 'empty') {
    setSaveStatus(null, 'New local draft');
  } else if (loaded.status === 'error') {
    setSaveStatus('error', 'Saved draft unreadable', 'The existing local draft could not be read, so a blank page was opened.');
    showToast('A saved draft could not be read. Starting with a clean page; your next edit will save normally.', true);
  } else {
    setSaveStatus('error', 'Local saving unavailable', 'This browser is blocking local storage.');
    showToast('This browser is blocking local storage. You can still plan and export your sheet.', true);
    hasShownSaveError = true;
  }
}

function wireEvents() {
  document.addEventListener('input', onBoundTextInput);
  document.addEventListener('change', onBoundChoiceChange);

  els.formatToolbar.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button[data-format]')) event.preventDefault();
  });

  els.formatToolbar.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-format]');
    if (button) applyFormat(button.dataset.format);
  });

  els.cleanHtml.addEventListener('click', cleanDescriptionHtml);
  els.loadDemo.addEventListener('click', loadDemoDraft);
  els.clearDraft.addEventListener('click', resetDraft);
  els.downloadMarkdown.addEventListener('click', downloadMarkdown);
  els.exportTop.addEventListener('click', downloadMarkdown);
  els.copyMarkdown.addEventListener('click', copyMarkdown);

  window.addEventListener('pagehide', () => {
    if (pendingSave) flushSave();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && pendingSave) flushSave();
  });
}

function init() {
  hydrateForm();
  renderAll();
  initialSaveStatus();
  wireEvents();
}

init();
