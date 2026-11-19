import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const expected = [
  ['static-validation', 'Phase 1 — Static and structural validation'],
  ['engine-unit-tests', 'Phase 2 — Propulsion calculation assurance'],
  ['browser-smoke', 'Phase 3 — Flight Preparation workflows and UI preservation'],
  ['browser-workflow', 'Phase 3 — Propulsion Analyzer workflow regression'],
  ['application-assurance', 'Phase 4 — Cross-browser, offline, accessibility, security and responsive assurance']
];

function git(args) {
  return execFileSync('git', args, { encoding:'utf8', stdio:['ignore','pipe','pipe'] }).trim();
}
function fail(message) {
  console.error('[PHASE 5 CERTIFICATION FAILED]', message);
  process.exit(1);
}

let needs;
try { needs = JSON.parse(process.env.QUALITY_RESULTS || '{}'); }
catch { fail('The upstream quality-gate results could not be parsed.'); }

const missing = expected.filter(([key]) => !needs[key]);
const failed = expected.filter(([key]) => needs[key] && needs[key].result !== 'success');
if (missing.length) fail('Missing mandatory quality gates: '+missing.map(x=>x[0]).join(', '));
if (failed.length) fail('Mandatory quality gates did not pass: '+failed.map(([key])=>key+'='+needs[key].result).join(', '));

const headSha = git(['rev-parse','HEAD']);
const workflowSha = process.env.GITHUB_SHA || '';
if (workflowSha && headSha !== workflowSha) fail('Checked-out commit does not match the workflow commit SHA.');

let mainSha='';
try {
  execFileSync('git',['fetch','origin','main','--depth=1'],{stdio:'inherit'});
  mainSha=git(['rev-parse','origin/main']);
  execFileSync('git',['merge-base','--is-ancestor','origin/main','HEAD'],{stdio:'ignore'});
} catch {
  fail('The quality branch is not based on the current origin/main. Refresh the isolated branch and rerun certification.');
}

try { execFileSync('git',['diff','--check','origin/main...HEAD'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}); }
catch(error) {
  const detail=String(error.stdout||'')+String(error.stderr||'');
  fail('Git whitespace and patch-integrity validation failed. '+(detail.trim()||('git diff --check exited with code '+error.status+'.')));
}

const workingTree = git(['status','--porcelain']);
if (workingTree) fail('The certification checkout is not clean: '+workingTree);

const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || 'unknown';
const base = process.env.GITHUB_BASE_REF || 'main';
const event = process.env.GITHUB_EVENT_NAME || 'unknown';
const now = new Date().toISOString();
const gates = expected.map(([key,label])=>({id:key,phase:label,result:needs[key].result.toUpperCase()}));

const report = {
  certification:'YETI QUALITY ASSURANCE 2.0 — PHASE 5',
  status:'READY FOR USER REVIEW',
  certified_at_utc:now,
  repository:'Chayan-Idea/YETI-Flight-Trial',
  branch:branch,
  base_branch:base,
  event:event,
  commit_sha:headSha,
  production_baseline_sha:mainSha,
  quality_gates:gates,
  all_mandatory_gates_passed:true,
  working_tree_clean:true,
  patch_integrity:'PASS',
  main_modified_by_certification:false,
  merge_performed:false,
  deployment_performed:false,
  user_approval_required_before_merge_or_deployment:true,
  rollback_baseline:mainSha,
  release_note:'This report certifies the tested commit only. It does not merge, deploy, publish a release, or authorize production use.'
};

const lines = [
  '# YETI Quality Assurance 2.0 — Phase 5 Release Certification',
  '',
  '**Status:** '+report.status,
  '',
  '- Certified at (UTC): '+now,
  '- Repository: '+report.repository,
  '- Branch: '+branch,
  '- Base branch: '+base,
  '- Event: '+event,
  '- Certified commit: '+headSha,
  '- Production baseline: '+mainSha,
  '',
  '## Mandatory quality gates',
  '',
  '| Phase | Quality gate | Result |',
  '|---|---|---|',
  ...gates.map(g=>'| '+g.phase.split(' — ')[0]+' | '+g.phase.split(' — ')[1]+' | **'+g.result+'** |'),
  '',
  '## Integrity and release controls',
  '',
  '- Clean checkout: PASS',
  '- Git patch integrity (git diff --check): PASS',
  '- Isolated branch remains based on current origin/main: PASS',
  '- Production main modified by this certification: NO',
  '- Merge performed: NO',
  '- Deployment performed: NO',
  '- User approval required before merge/deployment: YES',
  '- Rollback baseline commit: '+mainSha,
  '',
  '## Release decision',
  '',
  'All mandatory quality gates passed for this exact commit. The candidate is ready for user review only. This certification does not authorize merging or deployment.',
  ''
].join('\n');

const outDir=path.resolve('quality-evidence');
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'PHASE5_RELEASE_CERTIFICATION.md'),lines);
fs.writeFileSync(path.join(outDir,'PHASE5_RELEASE_CERTIFICATION.json'),JSON.stringify(report,null,2)+'\n');
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines+'\n');
console.log('[PHASE 5 CERTIFIED]',JSON.stringify(report,null,2));
