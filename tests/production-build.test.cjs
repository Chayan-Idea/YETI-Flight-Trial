const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'yeti-production-site-'));
try{
 execFileSync(process.execPath,[path.join(root,'scripts/build-site.mjs'),output],{cwd:root,stdio:'inherit'});
 for(const file of ['index.html','manifest.webmanifest','service-worker.js','js/flight-preparation.js','js/flight-trial-sop-editor.js','js/propulsion-analyser.js','js/propulsion-analysis-engine.js','css/app.css','css/propulsion-analyser.css','data/flight-trial-sop.json','data/sop-publication-status.json','assets/templates/IF_YETI_TD0_FTR_CKT_005/v3/template-package.json']){
  assert.ok(fs.existsSync(path.join(output,file)),'Production package must include '+file);
 }
 for(const file of ['.github','docs','scripts','tests','template-inbox','schemas','README.md','sw.js']){
  assert.ok(!fs.existsSync(path.join(output,file)),'Production package must exclude '+file);
 }
 const sw=fs.readFileSync(path.join(output,'service-worker.js'),'utf8');
 const start=sw.indexOf('const SHELL=['),end=sw.indexOf('];',start);
 assert.ok(start>=0&&end>start,'Production service-worker shell list must be present');
 for(const match of sw.slice(start,end).matchAll(/['"]([^'"]+)['"]/g)){
  assert.ok(fs.existsSync(path.join(output,match[1].replace(/^\.\//,''))),'Precached production asset must exist: '+match[1]);
 }
 const index=fs.readFileSync(path.join(output,'index.html'),'utf8');
 for(const match of index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)){
  const ref=match[1].split(/[?#]/,1)[0];
  if(/^https?:/i.test(ref))continue;
  assert.ok(fs.existsSync(path.join(output,ref.replace(/^\.\//,''))),'Production script must exist: '+ref);
 }
 console.log('Production build inclusion, exclusion, and offline-shell tests passed.');
}finally{
 fs.rmSync(output,{recursive:true,force:true});
}
