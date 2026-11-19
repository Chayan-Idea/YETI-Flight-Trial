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

const serviceWorker = read('service-worker.js');
checkJavaScript('service-worker.js', serviceWorker);
const shellMatch = serviceWorker.match(/\\bconst\\s+SHELL\\s*=\\s*\\[([\\s\\S]*?)\\]/);
if (!shellMatch) {
  fail('Service worker app-shell list could not be identified');
} else {
  const shellAssets = [...shellMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1]);
  const duplicateShellAssets = shellAssets.filter((asset, index) => shellAssets.indexOf(asset) !== index);
  if (duplicateShellAssets.length) fail('Duplicate service-worker precache assets: ' + [...new Set(duplicateShellAssets)].join(', '));
  else pass('No duplicate service-worker precache assets');
  for (const asset of shellAssets) {
    const localPath = asset.split('?')[0].replace(/^\\.\\//, '');
    if (exists(localPath)) pass('Service-worker precache asset exists: ' + localPath);
    else fail('Missing service-worker precache asset: ' + localPath);
  }
  const appAssets = [
    ...[...html.matchAll(/<script\\b[^>]*\\bsrc=["']([^"']+)["'][^>]*><\\/script>/gi)].map(match => match[1]),
    ...[...html.matchAll(/<link\\b[^>]*\\brel=["']stylesheet["'][^>]*\\bhref=["']([^"']+)["'][^>]*>/gi)].map(match => match[1])
  ].map(reference => reference.split('?')[0]);
  for (const asset of appAssets) {
    if (!shellAssets.includes(asset)) fail('Application entry is missing from service-worker precache: ' + asset);
  }
  if (!appAssets.some(asset => asset.endsWith('/propulsion-analysis-engine.js'))) {
    fail('Propulsion analysis engine is not loaded by index.html');
  } else if (!shellAssets.includes('./js/propulsion-analysis-engine.js')) {
    fail('Propulsion analysis engine is missing from service-worker precache');
  } else pass('All application scripts and stylesheets are included in service-worker precache');
}

if (failures.length) {
  console.error('YETI Flight Trial validation FAILED');
  for (const failure of failures) console.error('✗ ' + failure);
  process.exitCode = 1;
} else {
  console.log('YETI Flight Trial validation PASSED');
}
for (const check of checks) console.log('✓ ' + check);
console.log('Checks passed: ' + checks.length + '; failures: ' + failures.length);
