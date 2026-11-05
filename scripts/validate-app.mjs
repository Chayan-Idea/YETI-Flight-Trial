import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const failures = [];
const checks = [];
const read = file => fs.readFileSync(path.resolve(file), 'utf8');
const exists = file => fs.existsSync(path.resolve(file));
const pass = message => checks.push(message);
const fail = message => failures.push(message);

function checkJavaScript(file, source) {
  try {
    new vm.Script(source, { filename: file });
    pass('JavaScript syntax: ' + file);
  } catch (error) {
    fail('JavaScript syntax: ' + file + ': ' + error.message);
  }
}

function checkCss(file) {
  const source = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0;
  for (const character of source) {
    if (character === '{') depth += 1;
    if (character === '}') depth -= 1;
    if (depth < 0) break;
  }
  if (depth === 0) pass('CSS block balance: ' + file);
  else fail('CSS block balance: ' + file + ' (final depth ' + depth + ')');
}

const html = read('index.html');
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) fail('Duplicate HTML IDs: ' + [...new Set(duplicates)].join(', '));
else pass('No duplicate static HTML IDs');

const assetReferences = [...html.matchAll(/\b(?:src|href)=["']([^"'#]+)["']/g)]
  .map(match => match[1])
  .filter(reference => reference.startsWith('./') || reference.startsWith('assets/'));
for (const reference of assetReferences) {
  const localPath = reference.split('?')[0].replace(/^\.\//, '');
  if (exists(localPath)) pass('HTML asset exists: ' + localPath);
  else fail('Missing HTML asset: ' + localPath);
}

const externalScripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)]
  .map(match => match[1]);
for (const reference of externalScripts) {
  const localPath = reference.split('?')[0].replace(/^\.\//, '');
  if (!exists(localPath)) {
    fail('Missing JavaScript entry: ' + localPath);
    continue;
  }
  checkJavaScript(localPath, read(localPath));
}

const inlineScripts = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(source => source.trim());
inlineScripts.forEach((source, index) => checkJavaScript('index.html inline script ' + (index + 1), source));

const stylesheets = [...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
  .map(match => match[1]);
for (const reference of stylesheets) {
  const localPath = reference.split('?')[0].replace(/^\.\//, '');
  if (exists(localPath)) checkCss(localPath);
  else fail('Missing stylesheet: ' + localPath);
}

checkJavaScript('service-worker.js', read('service-worker.js'));

if (failures.length) {
  console.error('YETI Flight Trial validation FAILED');
  for (const failure of failures) console.error('✗ ' + failure);
  process.exitCode = 1;
} else {
  console.log('YETI Flight Trial validation PASSED');
}
for (const check of checks) console.log('✓ ' + check);
console.log('Checks passed: ' + checks.length + '; failures: ' + failures.length);
