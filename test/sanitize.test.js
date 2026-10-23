import test from 'node:test';
import assert from 'node:assert/strict';

import { ALLOWED_TAGS, LIMITS } from '../src/constants.js';
import { htmlToPlainText, sanitizeDescription } from '../src/sanitize.js';

test('keeps every KDP-allowed tag and normalizes names to lowercase', () => {
  const source = '<P>Hello</P><B>bold</B><EM>em</EM><I>italic</I><U>under</U>'
    + '<H4>four</H4><H5>five</H5><H6>six</H6><UL><LI>item</LI></UL>'
    + '<OL><LI>one</LI></OL>line<br>break';
  const result = sanitizeDescription(source);
  const tags = [...result.safeHtml.matchAll(/<\/?([a-z0-9]+)>/gu)].map((match) => match[1]);

  assert.ok(tags.length > 0);
  for (const tag of tags) assert.ok(ALLOWED_TAGS.includes(tag), `${tag} should be allowed`);
  assert.match(result.safeHtml, /<h4>four<\/h4>/);
  assert.match(result.safeHtml, /<br>/);
  assert.equal(result.hasMarkupIssues, false);
});

test('strips attributes and reports them', () => {
  const result = sanitizeDescription('<p class="lead" style="color:red">Hello</p>');
  assert.equal(result.safeHtml, '<p>Hello</p>');
  assert.equal(result.hasMarkupIssues, true);
  assert.deepEqual(result.strippedAttributes, [
    { tag: 'p', attribute: 'class', count: 1 },
    { tag: 'p', attribute: 'style', count: 1 },
  ]);
});

test('does not flag the self-closing slash on br as an attribute', () => {
  const result = sanitizeDescription('<br />');
  assert.equal(result.safeHtml, '<br>');
  assert.equal(result.strippedAttributes.length, 0);
  assert.equal(result.malformedCount, 0);
});

test('drops unsupported tags but keeps ordinary text content', () => {
  const result = sanitizeDescription('<div><span>Hello</span><script>alert(1)</script></div>');
  assert.equal(result.safeHtml, 'Hello');
  assert.deepEqual(result.unsupportedTags, [
    { name: 'div', count: 2 },
    { name: 'script', count: 1 },
    { name: 'span', count: 2 },
  ]);
  assert.equal(result.hasMarkupIssues, true);
  assert.doesNotMatch(result.safeHtml, /<div|<span|<script/i);
});

test('drops script and style contents from both the preview and visible text', () => {
  const result = sanitizeDescription('Before<script>alert("x")</script><style>body{}</style>After');
  assert.equal(result.safeHtml, 'BeforeAfter');
  assert.equal(result.plainText, 'BeforeAfter');
  assert.equal(result.unsupportedTags.length, 2);
  assert.doesNotMatch(result.plainText, /alert|body/);
});

test('an unclosed raw-text element does not leak the rest of the source', () => {
  const result = sanitizeDescription('Before<script>alert("x")');
  assert.equal(result.safeHtml, 'Before');
  assert.equal(result.plainText, 'Before');
});

test('neutralizes common script and event-handler payloads', () => {
  const payload = '<img src=x onerror="alert(1)"><a href="javascript:alert(2)">link</a>'
    + '<b onclick="alert(3)">bold</b><svg/onload=alert(4)>x</svg>';
  const result = sanitizeDescription(payload);

  assert.equal(result.safeHtml, 'link<b>bold</b>x');
  assert.doesNotMatch(result.safeHtml, /script|onerror|onload|javascript/i);
  assert.doesNotMatch(result.safeHtml, /<img|<a\s|<svg/i);
});

test('drops HTML comments and flags them', () => {
  const result = sanitizeDescription('Before<!-- secret note -->After');
  assert.equal(result.safeHtml, 'BeforeAfter');
  assert.equal(result.commentCount, 1);
  assert.equal(result.hasMarkupIssues, true);
});

test('escapes literal < and bare ampersands but preserves entities', () => {
  const result = sanitizeDescription('Tom & Jerry &amp; friends; 5 < 7');
  assert.equal(result.safeHtml, 'Tom &amp; Jerry &amp; friends; 5 &lt; 7');
  assert.equal(result.plainText, 'Tom & Jerry & friends; 5 < 7');
});

test('flags malformed tag-like text and escapes it in the preview', () => {
  const result = sanitizeDescription('A <b title="broken" text');
  assert.equal(result.safeHtml, 'A &lt;b title="broken" text');
  assert.equal(result.malformedCount, 1);
  assert.equal(result.hasMarkupIssues, true);
});

test('drops a closing br and records malformed markup', () => {
  const result = sanitizeDescription('line</br>next');
  assert.equal(result.safeHtml, 'linenext');
  assert.equal(result.malformedCount, 1);
});

test('plain text represents paragraphs, breaks, and lists', () => {
  const source = '<p>First &amp; second</p><br><p>Third</p>'
    + '<ul><li>One</li><li>Two</li></ul>';
  const text = htmlToPlainText(source);

  assert.equal(text, 'First & second\n\nThird\n\n\u2022 One\n\u2022 Two');
});

test('plain text decodes common entities and numeric entities', () => {
  const text = htmlToPlainText('<p>Caf&eacute; &#8212; &quot;ready&quot; &copy; &#x2764;</p>');
  assert.equal(text, 'Caf\u00e9 \u2014 "ready" \u00a9 \u2764');
});

test('tracks raw characters including HTML and approximate visible counts', () => {
  const result = sanitizeDescription('<p>Hello world</p>');
  assert.equal(result.rawCount, 18);
  assert.equal(result.plainCount, 11);
  assert.equal(result.wordCount, 2);
  assert.equal(result.limit, LIMITS.description);
  assert.equal(result.state, 'ok');
});

test('reports near-limit and over-limit descriptions', () => {
  const near = sanitizeDescription('a'.repeat(3600));
  assert.equal(near.state, 'near');
  assert.equal(near.overBy, 0);

  const over = sanitizeDescription('a'.repeat(4001));
  assert.equal(over.state, 'over');
  assert.equal(over.overBy, 1);
  assert.equal(over.remaining, 0);
});

test('empty and tag-only descriptions have no visible text', () => {
  const empty = sanitizeDescription('');
  assert.equal(empty.state, 'empty');
  assert.equal(empty.hasVisibleText, false);

  const tagOnly = sanitizeDescription('<p></p><br>');
  assert.equal(tagOnly.hasVisibleText, false);
  assert.equal(tagOnly.state, 'empty');
});

test('non-string input is treated as empty', () => {
  const result = sanitizeDescription(null);
  assert.equal(result.source, '');
  assert.equal(result.safeHtml, '');
  assert.equal(result.rawCount, 0);
});

test('the safe output never emits tags outside the allowlist', () => {
  const messy = '<table><tr><td><b>Hi</b></td></tr></table><iframe src="https://x">x</iframe>'
    + '<style>body{}</style><h1>Title</h1><p style="x">Okay</p>';
  const result = sanitizeDescription(messy);
  const tags = [...result.safeHtml.matchAll(/<\/?([a-zA-Z0-9]+)[^>]*>/gu)].map((match) => match[1].toLowerCase());
  for (const tag of tags) assert.ok(ALLOWED_TAGS.includes(tag));
  assert.doesNotMatch(result.safeHtml, /<[^>]+\s/);
});
