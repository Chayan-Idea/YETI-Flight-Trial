import fs from 'node:fs';
import { spawn } from 'node:child_process';

const BUDGET_MS = 110_000;
const startedAt = Date.now();
const active = new Set();
const results = new Map();
let timedOut = false;

const layers = [
  {
    id: 'static-validation',
    label: 'Layer 1 — Static and structural validation',
    commands: [['scripts/validate-app.mjs']]
  },
  {
    id: 'engine-unit-tests',
    label: 'Layer 2 — Propulsion calculation unit tests',
    commands: [['tests/propulsion-analysis-engine.test.js'], ['tests/yeti-modules.test.js']]
  },
  {
    id: 'browser-smoke',
    label: 'Layer 3 — Browser startup, Flight Preparation and UI preservation',
    commands: [['tests/browser-smoke.cjs'], ['tests/flight-preparation.e2e.cjs'], ['tests/ui-preservation.e2e.cjs']]
  },
  {
    id: 'browser-workflow',
    label: 'Layer 4 — Propulsion Analyzer, multi-log and PDF regression',
    commands: [['tests/propulsion-analyser.e2e.cjs']]
  },
  {
    id: 'application-assurance',
    label: 'Layer 5 — Cross-browser, offline, accessibility, security and responsive assurance',
    commands: [['tests/application-assurance.e2e.cjs']]
  }
];

function stopAll() {
  for (const child of active) {
    try {
      if (child.pid && process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch {}
  }
}

const deadline = setTimeout(() => {
  timedOut = true;
  console.error('[YETI QUALITY] 110-second execution budget exceeded. Stopping all running checks; certification will not be issued.');
  stopAll();
}, BUDGET_MS);

function run(command, layer) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, command, {
      stdio: 'inherit',
      env: process.env,
      detached: process.platform !== 'win32'
    });
    active.add(child);
    child.once('error', error => {
      active.delete(child);
      console.error('[' + layer + '] Could not start ' + command.join(' ') + ': ' + error.message);
      resolve(1);
    });
    child.once('exit', (code, signal) => {
      active.delete(child);
      resolve(code === 0 ? 0 : (code ?? 1));
    });
  });
}

async function runLayer(layer) {
  const began = Date.now();
  console.log('::group::' + layer.label);
  let code = 0;
  for (const command of layer.commands) {
    if (timedOut || Date.now() - startedAt >= BUDGET_MS) {
      code = 124;
      break;
    }
    const result = await run(command, layer.id);
    if (result !== 0) {
      code = result;
      break;
    }
  }
  const durationMs = Date.now() - began;
  results.set(layer.id, { result: code === 0 && !timedOut ? 'success' : 'failure', durationMs, exitCode: code });
  console.log('[' + layer.label + '] ' + (code === 0 && !timedOut ? 'PASS' : 'FAIL') + ' — ' + (durationMs / 1000).toFixed(1) + 's');
  console.log('::endgroup::');
  return code;
}

async function main() {
  console.log('[YETI QUALITY] One workflow; five assurance layers run concurrently; final certification is Layer 6.');
  const layerCodes = await Promise.all(layers.map(runLayer));
  clearTimeout(deadline);

  const failed = layers.filter(layer => results.get(layer.id)?.result !== 'success');
  if (timedOut || failed.length || layerCodes.some(code => code !== 0)) {
    console.error('[YETI QUALITY] FAILED. No Phase 5 certification will be generated.');
    process.exitCode = 1;
  } else {
    console.log('::group::Layer 6 — Final release certification');
    const qualityResults = {
      'static-validation': { result: 'success' },
      'engine-unit-tests': { result: 'success' },
      'browser-smoke': { result: 'success' },
      'browser-workflow': { result: 'success' },
      'application-assurance': { result: 'success' }
    };
    const certification = await run(['scripts/phase5-release-certification.mjs'], 'phase5-certification');
    results.set('phase5-certification', {
      result: certification === 0 ? 'success' : 'failure',
      durationMs: Date.now() - startedAt,
      exitCode: certification
    });
    console.log('[Layer 6 — Final release certification] ' + (certification === 0 ? 'PASS' : 'FAIL'));
    console.log('::endgroup::');
    if (certification !== 0) process.exitCode = 1;
    else console.log('[YETI QUALITY] ALL SIX LAYERS PASSED.');
  }

  const totalMs = Date.now() - startedAt;
  const summary = [
    '# YETI Six-Layer Quality Check',
    '',
    '**Overall:** ' + (process.exitCode === 0 ? 'PASS' : 'FAIL'),
    '**Elapsed:** ' + (totalMs / 1000).toFixed(1) + ' seconds (execution budget: 110 seconds)',
    '',
    '| Layer | Result | Duration |',
    '|---|---|---:|',
    ...layers.map(layer => {
      const result = results.get(layer.id) || { result: 'not completed', durationMs: 0 };
      return '| ' + layer.label + ' | ' + result.result.toUpperCase() + ' | ' + (result.durationMs / 1000).toFixed(1) + 's |';
    }),
    '| Layer 6 — Final release certification | ' + (results.get('phase5-certification')?.result || 'NOT RUN').toUpperCase() + ' | ' + ((results.get('phase5-certification')?.durationMs || 0) / 1000).toFixed(1) + 's |',
    '',
    timedOut ? '**Timeout:** The 110-second execution budget was exceeded. No certification issued.' : ''
  ].join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  console.log(summary);
}
main().catch(error => {
  clearTimeout(deadline);
  stopAll();
  console.error('[YETI QUALITY] Unexpected orchestrator failure:', error);
  process.exitCode = 1;
});
