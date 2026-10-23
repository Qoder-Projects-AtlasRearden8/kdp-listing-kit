import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeKeywords,
  analyzeTitle,
  countCharacters,
  countWords,
  formatCount,
} from '../src/text.js';

test('counts characters conservatively as UTF-16 code units', () => {
  assert.equal(countCharacters('hello'), 5);
  assert.equal(countCharacters(''), 0);
  assert.equal(countCharacters(null), 0);
  assert.equal(countCharacters('a\u{1f4da}'), 3);
});

test('counts words from whitespace-separated text', () => {
  assert.equal(countWords(' one  two\nthree '), 3);
  assert.equal(countWords('   '), 0);
  assert.equal(countWords(null), 0);
});

test('formats counts with grouping', () => {
  assert.equal(formatCount(4000), '4,000');
  assert.equal(formatCount(0), '0');
});

test('title metrics add title and subtitle together', () => {
  const metrics = analyzeTitle('Hello', 'World');
  assert.equal(metrics.titleCount, 5);
  assert.equal(metrics.subtitleCount, 5);
  assert.equal(metrics.combined, 10);
  assert.equal(metrics.remaining, 190);
  assert.equal(metrics.overBy, 0);
  assert.equal(metrics.state, 'ok');
});

test('title metrics treat an empty listing as empty and long listings as near or over', () => {
  assert.equal(analyzeTitle('', '').state, 'empty');
  assert.equal(analyzeTitle('a'.repeat(100), 'b'.repeat(80)).state, 'near');
  assert.equal(analyzeTitle('a'.repeat(200), '').state, 'near');

  const over = analyzeTitle('a'.repeat(150), 'b'.repeat(60));
  assert.equal(over.state, 'over');
  assert.equal(over.combined, 210);
  assert.equal(over.overBy, 10);
  assert.equal(over.remaining, 0);
});

test('title counts include whitespace exactly as typed', () => {
  const metrics = analyzeTitle('Hello ', 'World');
  assert.equal(metrics.combined, 11);
});

test('keyword analysis pads to seven slots and flags over-limit fields', () => {
  const analysis = analyzeKeywords(['short', 'a'.repeat(51)]);
  assert.equal(analysis.rows.length, 7);
  assert.equal(analysis.filled, 2);
  assert.equal(analysis.hasOverLimit, true);
  assert.equal(analysis.hasDuplicates, false);
  assert.equal(analysis.overLimitRows[0].index, 1);
  assert.equal(analysis.rows[1].overBy, 1);
  assert.equal(analysis.rows[6].state, 'empty');
});

test('keyword analysis finds duplicates after trimming and normalizing case', () => {
  const analysis = analyzeKeywords([
    'Beginner AI Guide',
    'beginner   ai guide',
    '',
    'Beginner AI Guide',
  ]);
  assert.equal(analysis.hasDuplicates, true);
  assert.equal(analysis.filled, 3);
  assert.equal(analysis.filledUnique, 1);
  assert.deepEqual(analysis.rows[0].duplicateOf, [1, 3]);
  assert.deepEqual(analysis.rows[1].duplicateOf, [0, 3]);
  assert.deepEqual(analysis.rows[3].duplicateOf, [0, 1]);
  assert.deepEqual(analysis.duplicateGroups, [[0, 1, 3]]);
});

test('keyword analysis does not treat blank slots as duplicates', () => {
  const analysis = analyzeKeywords(['', '   ', '']);
  assert.equal(analysis.hasDuplicates, false);
  assert.equal(analysis.filled, 0);
  assert.equal(analysis.hasIssues, false);
});

test('keyword analysis reports near-limit slots without calling them over', () => {
  const analysis = analyzeKeywords(['a'.repeat(45)]);
  assert.equal(analysis.rows[0].state, 'near');
  assert.equal(analysis.rows[0].overBy, 0);
  assert.equal(analysis.hasOverLimit, false);
});

test('keyword length counts raw spaces, not just trimmed text', () => {
  const analysis = analyzeKeywords(['   short   ']);
  assert.equal(analysis.filled, 1);
  assert.equal(analysis.rows[0].length, 11);
  assert.equal(analysis.rows[0].trimmed, 'short');
});
