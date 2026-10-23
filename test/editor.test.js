import test from 'node:test';
import assert from 'node:assert/strict';

import { insertSnippet, wrapList, wrapSelection } from '../src/editor.js';

test('wrapSelection wraps selected text and keeps it selected', () => {
  const result = wrapSelection('Hello world', 6, 11, '<b>', '</b>', 'text');
  assert.equal(result.value, 'Hello <b>world</b>');
  assert.equal(result.value.slice(result.selectionStart, result.selectionEnd), 'world');
});

test('wrapSelection inserts a selected placeholder with no selection', () => {
  const result = wrapSelection('Hello ', 6, 6, '<i>', '</i>', 'emphasis');
  assert.equal(result.value, 'Hello <i>emphasis</i>');
  assert.equal(result.value.slice(result.selectionStart, result.selectionEnd), 'emphasis');
});

test('wrapSelection clamps stale ranges and works with an empty value', () => {
  const result = wrapSelection('abc', 99, 42, '<p>', '</p>', 'Paragraph');
  assert.equal(result.value, 'abc<p>Paragraph</p>');
  assert.equal(result.selectionStart > 3, true);

  const empty = wrapSelection('', 5, 9, '<b>', '</b>', 'bold');
  assert.equal(empty.value, '<b>bold</b>');
});

test('insertSnippet replaces selection and places the cursor after it', () => {
  const result = insertSnippet('Hello world', 6, 11, '<br>');
  assert.equal(result.value, 'Hello <br>');
  assert.equal(result.selectionStart, 10);
  assert.equal(result.selectionEnd, 10);
});

test('wrapList creates a bulleted list with placeholder text', () => {
  const result = wrapList('Intro\n', 6, 6, false);
  assert.equal(result.value, 'Intro\n<ul>\n  <li>List item</li>\n</ul>');
  assert.equal(
    result.value.slice(result.selectionStart, result.selectionEnd),
    'List item',
  );
});

test('wrapList turns selected lines into ordered list items', () => {
  const result = wrapList('First\nSecond', 0, 12, true);
  assert.equal(
    result.value,
    '<ol>\n  <li>First</li>\n  <li>Second</li>\n</ol>',
  );
  assert.equal(result.selectionStart, result.value.length);
});

test('wrapList ignores blank selected lines', () => {
  const result = wrapList('A\n\n  B  ', 0, 8, false);
  assert.equal(result.value, '<ul>\n  <li>A</li>\n  <li>B</li>\n</ul>');
});
