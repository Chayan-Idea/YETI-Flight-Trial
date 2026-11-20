import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

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

// Parse every maintained browser JavaScript and CommonJS test file, not only scripts referenced by index.html.
function collectJavaScript(directory) {
  if (!exists(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectJavaScript(file);
    return /\.(?:js|cjs)$/.test(entry.name) ? [file] : [];
  });
}
const checkedFiles = new Set(externalScripts.map(reference => reference.split('?')[0].replace(/^\.\//, '')));
for (const directory of ['js', 'scripts', 'tests']) {
  for (const file of collectJavaScript(directory)) {
    if (checkedFiles.has(file)) continue;
    checkJavaScript(file, read(file));
    checkedFiles.add(file);
  }
}
pass('All JavaScript application, utility, and test files were syntax-checked');

// Validate the approved PDF package and its exact source asset without installing browser dependencies.
const pdfPackagePath = 'assets/templates/IF_YETI_TD0_FTR_CKT_005/v1/template-package.json';
const pdfPackage = JSON.parse(read(pdfPackagePath));
if (pdfPackage.activation?.status !== 'approved') fail('Daily Airworthiness PDF package is not explicitly approved');
else pass('Daily Airworthiness PDF package has explicit approval');
const sourcePdfPath = pdfPackage.sourcePdf?.path;
if (!sourcePdfPath || !exists(sourcePdfPath)) {
  fail('Daily Airworthiness source PDF is missing');
} else {
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(sourcePdfPath)).digest('hex');
  if (actualHash !== pdfPackage.sourcePdf.sha256) fail('Daily Airworthiness source PDF SHA-256 does not match its approved package');
  else pass('Daily Airworthiness source PDF SHA-256 matches the approved package');
}
const packageSections = pdfPackage.sections;
const packageCheckpoints = Array.isArray(packageSections) ? packageSections.reduce((total, section) => total + (Array.isArray(section.items) ? section.items.length : 0), 0) : 0;
if (!Array.isArray(packageSections) || packageSections.length !== 9 || packageCheckpoints !== 62) {
  fail('Daily Airworthiness PDF package must contain exactly 9 sections and 62 checkpoints');
} else pass('Daily Airworthiness PDF package contains 9 sections and 62 checkpoints');
if (pdfPackage.document?.pageCount !== 2 || pdfPackage.document?.pageWidth !== 842 || pdfPackage.document?.pageHeight !== 595 || pdfPackage.document?.orientation !== 'landscape') {
  fail('Daily Airworthiness source PDF geometry does not match the approved two-page A4 landscape format');
} else pass('Daily Airworthiness source PDF geometry matches the approved two-page landscape format');

const serviceWorker = read('service-worker.js');
checkJavaScript('service-worker.js', serviceWorker);
if (/v169/.test(serviceWorker) && /pathname\.endsWith\('\.pdf'\)/.test(serviceWorker) && /template-package\.json/.test(serviceWorker)) {
  pass('Service worker bypasses stale PDF and template-package caches');
} else fail('Service worker must bypass cached PDF templates and versioned package manifests');
const shellStart = serviceWorker.indexOf('const SHELL=[');
const shellEnd = shellStart >= 0 ? serviceWorker.indexOf('];', shellStart) : -1;
if (shellStart < 0 || shellEnd < 0) {
  fail('Service worker app-shell list could not be identified');
} else {
  const shellText = serviceWorker.slice(shellStart, shellEnd);
  const shellAssets = [...shellText.matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1]);
  const duplicateShellAssets = shellAssets.filter((asset, index) => shellAssets.indexOf(asset) !== index);
  if (duplicateShellAssets.length) fail('Duplicate service-worker precache assets: ' + [...new Set(duplicateShellAssets)].join(', '));
  else pass('No duplicate service-worker precache assets');
  for (const asset of shellAssets) {
    const localPath = asset.startsWith('./') ? asset.slice(2) : asset;
    if (exists(localPath)) pass('Service-worker precache asset exists: ' + localPath);
    else fail('Missing service-worker precache asset: ' + localPath);
  }
  const appAssets = [...externalScripts, ...stylesheets].map(reference => reference.split('?')[0]);
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
