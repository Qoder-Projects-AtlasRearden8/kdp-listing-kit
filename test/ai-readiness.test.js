import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateAiDisclosure } from '../src/ai.js';
import { createDemoDraft } from '../src/demo.js';
import { createDraft } from '../src/draft.js';
import { evaluateReadiness } from '../src/readiness.js';

const ALL_CHECKS = {
  policy: true,
  inventory: true,
  rights: true,
  facts: true,
  revisit: true,
};

test('AI disclosure starts undecided', () => {
  const result = evaluateAiDisclosure(createDraft().ai);
  assert.equal(result.decision, 'unsure');
  assert.equal(result.state, 'undecided');
  assert.equal(result.ready, false);
  assert.equal(result.selectedTypes.length, 0);
  assert.equal(result.checksDone, 0);
});

test('AI disclosure is ready for a no-AI book after all checks', () => {
  const result = evaluateAiDisclosure({
    decision: 'none',
    generated: { text: false, images: false, translations: false },
    checks: ALL_CHECKS,
  });
  assert.equal(result.state, 'ready-none');
  assert.equal(result.ready, true);
  assert.equal(result.checksDone, 5);
  assert.equal(result.checksTotal, 5);
});

test('AI disclosure flags conflicting answers', () => {
  const result = evaluateAiDisclosure({
    decision: 'none',
    generated: { text: true },
    checks: ALL_CHECKS,
  });
  assert.equal(result.state, 'conflict');
  assert.equal(result.ready, false);
  assert.match(result.detail, /conflict|No AI-generated/i);
});

test('AI disclosure requires a content type when disclosing', () => {
  const result = evaluateAiDisclosure({
    decision: 'disclose',
    generated: {},
    checks: ALL_CHECKS,
  });
  assert.equal(result.state, 'missing-types');
  assert.equal(result.ready, false);
});

test('AI disclosure requires the whole checklist', () => {
  const result = evaluateAiDisclosure({
    decision: 'disclose',
    generated: { images: true },
    checks: { policy: true, inventory: true },
  });
  assert.equal(result.state, 'needs-checklist');
  assert.equal(result.checksDone, 2);
  assert.equal(result.ready, false);
  assert.equal(result.label, '2 of 5 checks done');
});

test('AI disclosure is ready with generated types and a full checklist', () => {
  const result = evaluateAiDisclosure({
    decision: 'disclose',
    generated: { text: true, images: true, translations: false },
    checks: ALL_CHECKS,
  });
  assert.equal(result.state, 'ready-disclose');
  assert.equal(result.ready, true);
  assert.deepEqual(result.selectedTypes.map((type) => type.id), ['text', 'images']);
});

test('AI disclosure handles malformed input defensively', () => {
  const result = evaluateAiDisclosure({ decision: 'nonsense', generated: 'no', checks: [] });
  assert.equal(result.decision, 'unsure');
  assert.equal(result.ready, false);
});

test('a blank draft has no completed readiness checks', () => {
  const readiness = evaluateReadiness(createDraft());
  assert.equal(readiness.completed, 0);
  assert.equal(readiness.total, 5);
  assert.equal(readiness.percent, 0);
  assert.equal(readiness.complete, false);
  for (const step of readiness.steps) assert.equal(step.done, false);
});

test('the demo draft completes every readiness check', () => {
  const readiness = evaluateReadiness(createDemoDraft());
  assert.equal(readiness.completed, 5);
  assert.equal(readiness.percent, 100);
  assert.equal(readiness.complete, true);
  assert.ok(readiness.description.rawCount < 4000);
  assert.equal(readiness.keywords.hasIssues, false);
  assert.equal(readiness.ai.ready, true);
});

test('readiness fails when the title and subtitle exceed the combined limit', () => {
  const draft = createDemoDraft();
  draft.book.title = 'a'.repeat(150);
  draft.book.subtitle = 'b'.repeat(60);
  const readiness = evaluateReadiness(draft);
  assert.equal(readiness.steps.find((step) => step.id === 'book').done, false);
  assert.match(readiness.steps.find((step) => step.id === 'book').detail, /Trim 10/);
});

test('readiness fails for descriptions that are over-limit or use unsupported HTML', () => {
  const over = createDemoDraft();
  over.description = `<p>${'a'.repeat(4000)}</p>`;
  let readiness = evaluateReadiness(over);
  assert.equal(readiness.steps.find((step) => step.id === 'description').done, false);
  assert.match(readiness.steps.find((step) => step.id === 'description').detail, /Over the limit/);

  const markup = createDemoDraft();
  markup.description = '<div>Hello</div>';
  readiness = evaluateReadiness(markup);
  assert.equal(readiness.steps.find((step) => step.id === 'description').done, false);
  assert.match(readiness.steps.find((step) => step.id === 'description').detail, /unsupported/);
});

test('readiness fails for duplicate keywords and missing categories', () => {
  const duplicate = createDemoDraft();
  duplicate.keywords[1] = duplicate.keywords[0];
  let readiness = evaluateReadiness(duplicate);
  assert.equal(readiness.steps.find((step) => step.id === 'keywords').done, false);
  assert.match(readiness.steps.find((step) => step.id === 'keywords').detail, /repeat/);

  const categories = createDemoDraft();
  categories.categories[2] = '';
  readiness = evaluateReadiness(categories);
  assert.equal(readiness.steps.find((step) => step.id === 'categories').done, false);
  assert.match(readiness.steps.find((step) => step.id === 'categories').detail, /2 of 3/);
});

test('readiness fails while the AI checklist is incomplete', () => {
  const draft = createDemoDraft();
  draft.ai.checks.revisit = false;
  const readiness = evaluateReadiness(draft);
  assert.equal(readiness.steps.find((step) => step.id === 'ai').done, false);
  assert.equal(readiness.ai.ready, false);
});
