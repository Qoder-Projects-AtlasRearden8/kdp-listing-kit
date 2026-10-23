import { SCHEMA_VERSION, STORAGE_KEY } from './constants.js';
import { createDraft, normalizeDraft } from './draft.js';

function unavailableResult() {
  return {
    status: 'unavailable',
    draft: createDraft(),
    error: 'Local storage is unavailable in this browser.',
  };
}

export function loadDraft(storage) {
  if (!storage) return unavailableResult();

  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (error) {
    return { ...unavailableResult(), error };
  }

  if (raw === null) {
    return { status: 'empty', draft: createDraft() };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Saved draft is not an object.');
    }
    return { status: 'loaded', draft: normalizeDraft(parsed) };
  } catch (error) {
    return {
      status: 'error',
      draft: createDraft(),
      error,
    };
  }
}

export function saveDraft(storage, draft, now = new Date()) {
  if (!storage) {
    return { ok: false, error: new Error('Local storage is unavailable.') };
  }

  const savedAt = now instanceof Date && !Number.isNaN(now.getTime())
    ? now.toISOString()
    : new Date().toISOString();
  const payload = {
    ...normalizeDraft(draft),
    version: SCHEMA_VERSION,
    updatedAt: savedAt,
  };

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { ok: true, savedAt };
  } catch (error) {
    return { ok: false, error };
  }
}

export function clearDraft(storage) {
  if (!storage) return { ok: false, error: new Error('Local storage is unavailable.') };
  try {
    storage.removeItem(STORAGE_KEY);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
