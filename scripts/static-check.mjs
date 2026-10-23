#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const TEXT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.svg', '.txt', '.yml', '.yaml']);
const SKIP_DIRECTORIES = new Set(['.git', 'coverage', 'node_modules', '.preview']);

const results = [];

function pass(label) {
  results.push({ ok: true, label });
}

function fail(label, details) {
  results.push({ ok: false, label, details });
}

async function pathExists(path, type = 'file') {
  try {
    const info = await stat(path);
    return type === 'either' || (type === 'file' ? info.isFile() : info.isDirectory());
  } catch {
    return false;
  }
}

async function walk(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.nojekyll') continue;
    if (SKIP_DIRECTORIES.has(entry.name)) continue;
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

const files = await walk(root);
const relative = (absolute) => absolute.slice(root.length + 1).replaceAll('\\', '/');
const fileSet = new Set(files.map(relative));
const textFiles = files.filter((file) => TEXT_EXTENSIONS.has(extname(file).toLowerCase()));
const textCache = new Map();

async function text(absoluteOrRelative) {
  const absolute = absoluteOrRelative.startsWith(root)
    ? absoluteOrRelative
    : resolve(root, absoluteOrRelative);
  if (!textCache.has(absolute)) textCache.set(absolute, await readFile(absolute, 'utf8'));
  return textCache.get(absolute);
}

const indexHtml = await text('index.html');
const cssText = await text('styles.css');
const appText = await text('app.js');
const packageJson = JSON.parse(await text('package.json'));

function extractIds(html) {
  return [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
}

const ids = extractIds(indexHtml);
const idSet = new Set(ids);

async function checkProjectScripts() {
  const details = [];
  for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
    for (const match of command.matchAll(/(?:^|\s)(scripts\/[\w.-]+\.mjs)(?=\s|$)/g)) {
      if (!await pathExists(resolve(root, match[1]))) {
        details.push(`npm script "${name}" points to missing ${match[1]}.`);
      }
    }
  }
  if (!packageJson.scripts?.test) details.push('package.json has no test script.');
  if (!String(packageJson.scripts?.test ?? '').includes('node --test')) {
    details.push('The test script should use the built-in node --test runner.');
  }
  const dependencies = Object.keys(packageJson.dependencies ?? {});
  const devDependencies = Object.keys(packageJson.devDependencies ?? {});
  if (dependencies.length || devDependencies.length) {
    details.push('Runtime and dev dependencies should stay empty for this zero-build app.');
  }
  if (details.length) fail('Project scripts and dependency-free setup', details);
  else pass('Project scripts resolve and the app has zero dependencies');
}

async function checkLocalReferences() {
  const details = [];
  let count = 0;

  for (const match of indexHtml.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
    const reference = match[1].trim();
    if (!reference
      || reference.startsWith('#')
      || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) continue;

    count += 1;
    const pathPart = reference.split(/[?#]/, 1)[0];
    const target = resolve(root, `.${pathPart.startsWith('/') ? '' : '/'}${pathPart}`);
    const relativeTarget = relative(target);
    if (!relativeTarget.startsWith('..') && !await pathExists(target, 'either')) {
      details.push(`index.html references missing local file: ${reference}`);
    }
  }

  for (const match of cssText.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    const reference = match[2].trim();
    if (!reference || reference.startsWith('#') || reference.startsWith('data:')) continue;
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) {
      details.push(`styles.css loads a remote asset, which the offline CSP would block: ${reference}`);
      continue;
    }
    count += 1;
    const pathPart = reference.split(/[?#]/, 1)[0];
    if (!await pathExists(resolve(root, pathPart))) {
      details.push(`styles.css references a missing local asset: ${reference}`);
    }
  }

  if (details.length) fail('Local asset references', details);
  else pass(`${count} local asset reference${count === 1 ? '' : 's'} resolve to real files; no remote assets`);
}

async function checkAnchors() {
  const details = [];
  let count = 0;
  for (const match of indexHtml.matchAll(/<a\b[^>]*\bhref="#([^"]+)"/g)) {
    count += 1;
    if (!idSet.has(match[1])) details.push(`Anchor links to missing id "#${match[1]}".`);
  }
  for (const match of indexHtml.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/\brel="[^"]*\bnoopener\b/.test(match[0])) {
      details.push(`External link opens a new tab without rel="noopener": ${match[0].slice(0, 90)}`);
    }
  }
  if (details.length) fail('In-page anchors and new-tab links', details);
  else pass(`${count} in-page anchors resolve; new-tab links use noopener`);
}

async function checkIdsAndLabels() {
  const details = [];
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  for (const id of new Set(duplicates)) details.push(`Duplicate id "${id}".`);

  let labelCount = 0;
  for (const match of indexHtml.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g)) {
    labelCount += 1;
    if (!idSet.has(match[1])) details.push(`Label points to missing control id "${match[1]}".`);
  }

  let ariaCount = 0;
  for (const match of indexHtml.matchAll(/\baria-(?:describedby|labelledby|controls)="([^"]+)"/g)) {
    for (const token of match[1].trim().split(/\s+/)) {
      ariaCount += 1;
      if (!idSet.has(token)) details.push(`ARIA reference points to missing id "${token}".`);
    }
  }

  if (details.length) fail('Unique ids and accessible-name wiring', details);
  else pass(`${ids.length} unique ids, ${labelCount} label targets, and ${ariaCount} ARIA references resolve`);
}

async function checkDocumentShell() {
  const details = [];
  if (!/<html\b[^>]*\blang="[^"]+"/i.test(indexHtml)) details.push('The <html> element needs a lang attribute.');
  if (!/<meta\b[^>]*name="viewport"/i.test(indexHtml)) details.push('The viewport meta tag is missing.');
  if (!/<meta\b[^>]*name="description"/i.test(indexHtml)) details.push('The page description meta tag is missing.');
  if (!/<link\b[^>]*rel="icon"/i.test(indexHtml)) details.push('The favicon link is missing.');
  const h1Count = (indexHtml.match(/<h1\b/gi) ?? []).length;
  if (h1Count !== 1) details.push(`Expected exactly one <h1>, found ${h1Count}.`);
  if (!/<a\b[^>]*class="[^"]*skip-link/.test(indexHtml)) details.push('The skip link is missing.');
  if (!/<main\b[^>]*\bid="main"/.test(indexHtml)) details.push('The <main> landmark needs id="main" for the skip link.');

  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(indexHtml)) {
    details.push('Inline <script> blocks are blocked by the app CSP and should be moved to a file.');
  }
  if (/\son[a-z]+\s*=/i.test(indexHtml)) {
    details.push('Inline event-handler attributes are present; keep behavior in app.js.');
  }

  const csp = indexHtml.match(/<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]+)"/i)?.[1] ?? '';
  if (!csp) details.push('The Content-Security-Policy meta tag is missing.');
  else {
    if (!/default-src 'self'/.test(csp)) details.push("CSP should keep default-src 'self'.");
    if (/unsafe-eval|unsafe-inline[^;]*script-src|script-src[^;]*unsafe-inline/.test(csp)) {
      details.push('CSP must not allow inline scripts or eval.');
    }
    if (!/connect-src 'none'/.test(csp)) details.push("CSP should set connect-src 'none' for a local-first app.");
  }

  if (details.length) fail('Document shell, landmarks, and CSP', details);
  else pass('Document shell, landmark, favicon, and CSP basics are in place');
}

function checkHook(label, condition, failureDetail, details) {
  if (!condition) details.push(failureDetail);
}

async function checkUiWiring() {
  const details = [];

  for (const match of appText.matchAll(/\$\$?\(\s*['"`]#([A-Za-z][\w-]*)['"`]\s*\)/g)) {
    if (!idSet.has(match[1])) details.push(`app.js selects missing id "#${match[1]}".`);
  }

  for (const match of appText.matchAll(/\$\$?\(\s*'(\[[^']+\]|\.[^']+)'\s*\)/g)) {
    const selector = match[1].trim();
    const attribute = selector.match(/^\[([\w-]+)\]$/)?.[1];
    if (attribute) {
      if (!new RegExp(`\\b${attribute}(?:="|=|\\s|>)`).test(indexHtml)) {
        details.push(`app.js needs the markup hook [${attribute}], but index.html has none.`);
      }
      continue;
    }
    const firstPart = selector.split(/[\s:[.#]/)[0];
    const className = firstPart.replace(/^\./, '');
    if (className && !new RegExp(`class="[^"]*\\b${className}\\b`).test(indexHtml)) {
      details.push(`app.js selects ".${className}", but no element has that class.`);
    }
  }

  checkHook('bindings', /data-bind="/.test(indexHtml), 'No [data-bind] controls are present.', details);
  checkHook('keywords', /data-keyword-row="/.test(indexHtml), 'No keyword rows are present.', details);
  checkHook('formatting', /data-format="/.test(indexHtml), 'No description formatting buttons are present.', details);
  checkHook('form', /<form\b/.test(indexHtml) === false, 'Unexpected <form> found; this app intentionally avoids form submission.', details);

  if (details.length) fail('UI selector wiring', details);
  else pass('Every literal id and markup hook used by app.js exists in index.html');
}

async function checkImports() {
  const details = [];
  let count = 0;

  for (const file of files.filter((item) => ['.js', '.mjs'].includes(extname(item)))) {
    const source = await text(file);
    for (const match of source.matchAll(/\b(?:from|import)\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      count += 1;
      const target = resolve(dirname(file), match[1]);
      if (!await pathExists(target, 'file') && !await pathExists(`${target}.js`, 'file')) {
        details.push(`${relative(file)} imports missing module ${match[1]}.`);
      }
    }
  }

  if (details.length) fail('ES module imports', details);
  else pass(`${count} relative ES module imports resolve`);
}

async function checkPrivacy() {
  const details = [];

  const runtimeFiles = ['app.js', 'src/ai.js', 'src/constants.js', 'src/demo.js', 'src/draft.js', 'src/editor.js', 'src/markdown.js', 'src/readiness.js', 'src/sanitize.js', 'src/storage.js', 'src/text.js'];
  for (const file of runtimeFiles) {
    if (!fileSet.has(file)) continue;
    const source = await text(file);
    if (/\b(?:fetch\s*\(|XMLHttpRequest|new WebSocket|sendBeacon)\b/.test(source)) {
      details.push(`${file} contains a network call; the app is meant to stay offline.`);
    }
  }

  const secretPatterns = [
    [/AKIA[0-9A-Z]{16}/, 'an AWS access key lookalike'],
    [/gh[pousr]_[A-Za-z0-9]{36,}/, 'a GitHub token lookalike'],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'a private key'],
    [/AIza[0-9A-Za-z_-]{35}/, 'a Google API key lookalike'],
    [/\bsk-[A-Za-z0-9]{20,}\b/, 'an OpenAI-style secret lookalike'],
  ];

  for (const file of textFiles.filter((item) => relative(item) !== 'scripts/static-check.mjs')) {
    const source = await text(file);
    for (const [pattern, label] of secretPatterns) {
      if (pattern.test(source)) details.push(`${relative(file)} appears to contain ${label}.`);
    }
  }

  const envFiles = files.filter((item) => /(^|\/)\.env(?:\.|$)/.test(relative(item)));
  if (envFiles.length) details.push(`Environment files should not be committed: ${envFiles.map(relative).join(', ')}`);

  if (details.length) fail('Offline-only and secret-free source', details);
  else pass('No network calls, API keys, private keys, or environment files found');
}

await checkProjectScripts();
await checkLocalReferences();
await checkAnchors();
await checkIdsAndLabels();
await checkDocumentShell();
await checkUiWiring();
await checkImports();
await checkPrivacy();

console.log('KDP Listing Kit static checks');
console.log('');
for (const result of results) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.label}`);
  for (const detail of result.details ?? []) console.log(`      - ${detail}`);
}

const failures = results.filter((result) => !result.ok);
console.log('');
if (failures.length) {
  console.log(`${failures.length} static check group${failures.length === 1 ? '' : 's'} failed.`);
  process.exitCode = 1;
} else {
  console.log(`All ${results.length} static check groups passed.`);
}
