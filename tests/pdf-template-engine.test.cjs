const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const window={};
const context=vm.createContext({window,console});
for(const file of [
 'js/daily-airworthiness-template.js',
 'js/daily-airworthiness-pdf-manifest.js',
 'js/pdf-template-manager.js',
 'js/pdf-coordinate-mapper.js',
 'js/pdf-template-package-loader.js',
 'js/pdf-overlay-renderer.js'
])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const manifest=window.YETI_DAILY_AIRWORTHINESS_PDF_MANIFEST;
const sections=window.YETI_DAILY_AIRWORTHINESS_TEMPLATE;
const manager=window.YETI_PDF_TEMPLATE_MANAGER;
const mapper=window.YETI_PDF_COORDINATE_MAPPER;
assert.equal(manifest.page.width,842);
assert.equal(manifest.page.height,595);
assert.equal(manifest.sourcePages,2);
assert.ok(window.YETI_PDF_TEMPLATE_STATUS.valid,'baseline PDF template must validate');
const ids=sections.flatMap(s=>s.items.map(i=>i.id));
assert.equal(new Set(ids).size,ids.length,'checkpoint IDs must be unique');
for(const id of ids.filter(id=>id!=='9.0')){
 const anchor=mapper.getCheckpointAnchors(manifest,id);
 assert.ok(anchor, 'missing coordinate mapping for '+id);
 assert.ok(anchor.page===1||anchor.page===2,'invalid page for '+id);
 assert.ok(anchor.pass.x>0&&anchor.pass.x<842,'Pass anchor outside page for '+id);
 assert.ok(anchor.fail.x>0&&anchor.fail.x<842,'Fail anchor outside page for '+id);
 assert.ok(anchor.notAvailable.x>0&&anchor.notAvailable.x<842,'N/A anchor outside page for '+id);
 assert.ok(anchor.remarks.x<842,'Remarks anchor outside page for '+id);
}
assert.equal(mapper.statusAnchor(manifest,'4.9.1','Pass').page,2);
assert.equal(mapper.statusAnchor(manifest,'4.8.2','Fail').page,1);
assert.deepEqual(JSON.parse(JSON.stringify(mapper.topLeftToBottomLeft({x:100,y:100},manifest.page))),{x:100,y:495});
assert.throws(()=>mapper.assertPoint({x:900,y:10},manifest.page),/outside the source page/);
const invalid=manager.register({...manifest,rows:{}},sections);
assert.equal(invalid.validation.valid,false,'incomplete coordinate map must be rejected');
assert.throws(()=>manager.activate(invalid,true),/invalid PDF template/);
assert.throws(()=>manager.activate(manager.register(manifest,sections),false),/explicit approval/);
console.log('PDF template engine checks passed: source geometry, '+ids.length+' checklist IDs, coordinate anchors, page assignment, bounds, fail-closed validation and explicit activation.');

const packageLoader=window.YETI_PDF_TEMPLATE_PACKAGE;
const overlay=window.YETI_PDF_OVERLAY_RENDERER;
assert.equal(typeof overlay.renderPreview,'function');
assert.equal(typeof overlay.exportPdf,'function');
const rendererSourceForAppend=fs.readFileSync(path.join(root,'js/pdf-overlay-renderer.js'),'utf8');
assert.ok(rendererSourceForAppend.includes('append-signature-page'),'renderer must support appended signature pages for un-mapped PDFs');
assert.ok(rendererSourceForAppend.includes('yeti-pdf-signature-page'),'preview must display the appended signature page');
assert.equal(manifest.columns.passCenterX,511.35);
assert.equal(manifest.columns.failCenterX,534.95);
assert.equal(manifest.columns.notAvailableCenterX,570.01);
const schema=JSON.parse(fs.readFileSync(path.join(root,'schemas/pdf-template-package.schema.json'),'utf8'));
assert.equal(schema.title,'YETI PDF Checklist Template Package');
const pkg={
 packageVersion:1,
 activation:{status:'approved'},
 document:{templateId:manifest.templateId,version:manifest.version,pageCount:manifest.sourcePages,pageWidth:manifest.page.width,pageHeight:manifest.page.height,orientation:'landscape'},
 sourcePdf:{path:'assets/templates/dac/source.pdf',sha256:'a'.repeat(64)},
 template:manifest,
 sections
};
assert.equal(packageLoader.validatePackage(pkg).valid,true,'well-formed package should validate');
const coordinateFreePkg={...pkg,template:{page:{...manifest.page},rows:{},columns:{},signatureMode:'append-signature-page'}};
assert.equal(packageLoader.validatePackage(coordinateFreePkg).valid,true,'new PDFs without mapped signature/status cells should validate in safe append-signature mode');
assert.equal(manager.validate({...coordinateFreePkg.template,templateId:pkg.document.templateId,version:pkg.document.version,sourcePages:pkg.document.pageCount},sections).valid,true,'coordinate-free append-signature templates should activate after explicit package approval');
assert.equal(manager.validate({...pkg.template,templateId:pkg.document.templateId,version:pkg.document.version,sourcePages:pkg.document.pageCount},pkg.sections).valid,true,'package document identity and page count must be merged before registry validation');
assert.equal(packageLoader.validatePackage({...pkg,sourcePdf:{path:'source.pdf',sha256:'bad'}}).valid,false,'missing source checksum must be rejected');
assert.equal(packageLoader.validatePackage({...pkg,sections:[...sections,{title:'Duplicate',items:[{id:'1.1',title:'duplicate'}]}]}).valid,false,'duplicate checkpoint package must be rejected');
assert.throws(()=>packageLoader.activate({package:{activation:{status:'candidate'}},validation:{valid:true},pdfBytes:new ArrayBuffer(8)},true),/review-only/,'candidate packages must never activate, even when a caller passes approval');

const versions=manager.listVersions(manifest.templateId);
assert.ok(versions.some(v=>v.version===manifest.version),'registered baseline version must be retained');
assert.equal(manager.activateVersion(manifest.templateId,manifest.version,true).template.version,manifest.version);
assert.throws(()=>manager.activateVersion(manifest.templateId,'missing',true),/not registered/);

const whitelistPhotos=overlay.safePhotos([
 {id:1,name:'daily.jpg',category:'daily',data:'data:image/jpeg;base64,AA=='},
 {id:2,name:'default.png',data:'data:image/png;base64,AA=='},
 {id:3,name:'loading.jpg',category:'loading',data:'data:image/jpeg;base64,AA=='},
 {id:4,name:'invalid.txt',category:'daily',data:'data:text/plain;base64,AA=='},
 null
]);
assert.deepEqual(JSON.parse(JSON.stringify(whitelistPhotos.map(p=>p.name))),['daily.jpg','default.png'],'only daily/default photo evidence should be exported');
assert.ok(manifest.specialFields.checkerReviewer.page>=1,'signature must be anchored to a source page');
assert.deepEqual(JSON.parse(JSON.stringify(manifest.specialFields.checkerReviewer)),{page:2,x:573.9,y:294.99,width:216.28,height:25.68},'signature must fit the original Checker + Reviewer signature cell');
assert.ok(manifest.specialFields.checkerReviewer.x+manifest.specialFields.checkerReviewer.width<=manifest.page.width,'signature area must remain inside source page');
assert.ok(manifest.specialFields.checkerReviewer.y+manifest.specialFields.checkerReviewer.height<=manifest.page.height,'signature area must remain inside source page');
const rendererSource=fs.readFileSync(path.join(root,'js/pdf-overlay-renderer.js'),'utf8');
assert.ok(!rendererSource.includes('answer.status'),'PDF renderer must not draw checklist status marks');
assert.ok(!rendererSource.includes('answer.remarks'),'PDF renderer must not draw checklist remarks');
assert.ok(!rendererSource.includes('trialInfo'),'PDF renderer must not draw dynamic trial metadata');
console.log('PDF export whitelist checks passed: original pages, signature bounds, daily photos only, no checklist answers/remarks/metadata.');
