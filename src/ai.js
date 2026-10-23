import { AI_CHECKS, AI_CONTENT_TYPES } from './constants.js';

const DECISIONS = new Set(['unsure', 'none', 'disclose']);

export function evaluateAiDisclosure(aiInput) {
  const ai = aiInput && typeof aiInput === 'object' ? aiInput : {};
  const decision = DECISIONS.has(ai.decision) ? ai.decision : 'unsure';
  const generated = ai.generated && typeof ai.generated === 'object' ? ai.generated : {};
  const checks = ai.checks && typeof ai.checks === 'object' ? ai.checks : {};

  const selectedTypes = AI_CONTENT_TYPES.filter((type) => generated[type.id] === true);
  const checksTotal = AI_CHECKS.length;
  const checksDone = AI_CHECKS.filter((check) => checks[check.id] === true).length;
  const allChecks = checksDone === checksTotal;

  let state = 'undecided';
  let label = 'Decision needed';
  let detail = 'Read the quick guide, then record your AI disclosure plan.';
  let tone = 'info';
  let ready = false;

  if (decision === 'none' && selectedTypes.length > 0) {
    state = 'conflict';
    label = 'Answers conflict';
    detail = 'You marked AI-generated content but chose “No AI-generated content.” Choose the disclosure option or update the content types.';
    tone = 'error';
  } else if (decision === 'disclose' && selectedTypes.length === 0) {
    state = 'missing-types';
    label = 'Add content types';
    detail = 'A disclosure decision needs at least one AI-generated content type. If none apply, choose “No AI-generated content.”';
    tone = 'error';
  } else if (decision !== 'unsure' && !allChecks) {
    state = 'needs-checklist';
    label = `${checksDone} of ${checksTotal} checks done`;
    detail = 'Finish the pre-publish checklist so your disclosure plan is ready to use.';
    tone = 'warn';
  } else if (decision === 'none') {
    state = 'ready-none';
    label = 'No disclosure flagged';
    detail = 'Your answers are consistent. Double-check the final book in KDP before publishing.';
    tone = 'ok';
    ready = true;
  } else if (decision === 'disclose') {
    state = 'ready-disclose';
    label = 'Disclosure plan ready';
    detail = 'Tell KDP which AI-generated content is included when you publish.';
    tone = 'ok';
    ready = true;
  }

  return {
    decision,
    selectedTypes,
    checksDone,
    checksTotal,
    allChecks,
    state,
    label,
    detail,
    tone,
    ready,
  };
}
