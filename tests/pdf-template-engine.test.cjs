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
const restoredCameraCheck=sections.flatMap(section=>section.items).find(item=>item.id==='8.1');
assert.ok(restoredCameraCheck,'user-requested checkpoint 8.1 must be restored in the final daily checklist');
assert.equal(restoredCameraCheck.title,'Camera Functionality','restored checkpoint 8.1 title must remain consistent with the approved YETI master checklist');
assert.deepEqual(JSON.parse(JSON.stringify(restoredCameraCheck.criteria)),['Video recording is ok.'],'restored checkpoint 8.1 acceptance criterion must be preserved');
assert.ok(manifest.rows['8.1'],'the approved v1 source PDF must retain its verified 8.1 row mapping');
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
const bootstrapSource=fs.readFileSync(path.join(root,'js/pdf-template-bootstrap.js'),'utf8');
assert.ok(bootstrapSource.includes('failClosed('),'unverified active PDF must fail closed');
assert.ok(bootstrapSource.includes('Checklist entry and PDF export are disabled'),'stale checklist interaction must be blocked when approval or checksum validation fails');
const publisherSource=fs.readFileSync(path.join(root,'scripts/publish-approved-pdf.py'),'utf8');
assert.ok(publisherSource.includes('approval-reference'),'publisher must require an approval record');
assert.ok(publisherSource.includes('version_dir.exists()'),'published PDF versions must not be overwritten');
const rendererSourceForAppend=fs.readFileSync(path.join(root,'js/pdf-overlay-renderer.js'),'utf8');
assert.ok(rendererSourceForAppend.includes('append-signature-page'),'renderer must support appended signature pages for un-mapped PDFs');
assert.ok(rendererSourceForAppend.includes('yeti-pdf-signature-page'),'preview must display the appended signature page');
assert.equal(manifest.columns.passCenterX,511.35);
assert.ok(rendererSourceForAppend.includes('statusWidth=bold.widthOfTextAtSize(st.label,statusSize)'),'status labels must be horizontally centred within their status cells');
assert.ok(rendererSourceForAppend.includes("ctx.textAlign='center'"),'all preview overlay text must be centre aligned');
assert.ok(rendererSourceForAppend.includes('x:((c.remarksLeft+c.remarksRight)/2)*sx'),'exported remarks must be centre aligned inside the remarks cell');
const flightPreparationSource=fs.readFileSync(path.join(root,'js/flight-preparation.js'),'utf8');
assert.ok(flightPreparationSource.includes('scheduleLivePdfPreview'),'visible PDF preview must synchronize automatically after input changes');
assert.ok(flightPreparationSource.includes("if(category==='daily')scheduleLivePdfPreview(true)"),'Daily Airworthiness photo additions must refresh the PDF preview');
assert.ok(flightPreparationSource.includes("['trialPhase','trialStage','flightPlace','flightDate']"),'trial information fields must refresh the PDF preview');
assert.equal(manifest.columns.failCenterX,534.95);
assert.equal(manifest.columns.notAvailableCenterX,570.01);
const schema=JSON.parse(fs.readFileSync(path.join(root,'schemas/pdf-template-package.schema.json'),'utf8'));
assert.equal(schema.title,'YETI PDF Checklist Template Package');
const approvedPackage=JSON.parse(fs.readFileSync(path.join(root,'assets/templates/IF_YETI_TD0_FTR_CKT_005/v1/template-package.json'),'utf8'));
assert.equal(approvedPackage.sourcePdf.path,'assets/templates/YETI TD0 Trial DAC Format.pdf','the final selected PDF must be the active source asset');
assert.equal(approvedPackage.sourcePdf.sha256,'03fe8f45e83b081669c4386585004a351ddcb2d8a14923854bafc36436d79560','the final selected PDF must match the verified source checksum');
const approvedIds=approvedPackage.sections.flatMap(section=>section.items.map(item=>item.id));
assert.equal(approvedIds.length,62,'final approved checklist must contain 62 checkpoints');
assert.ok(approvedIds.includes('8.1'),'final approved checklist must include restored Camera Functionality checkpoint 8.1');
assert.equal(approvedPackage.activation.status,'approved','final selected PDF package must be approved');
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
assert.ok(rendererSource.includes('drawLivePreview'),'live PDF preview must render checklist overlays');
assert.ok(rendererSource.includes('drawLiveExport'),'PDF export must use the same live overlay specification');
assert.ok(rendererSource.includes("'Not Available':{label:'N/A',fill:'#737373'"),'Not Available must render as a grey N/A label');
assert.ok(rendererSource.includes("label:'PASS',fill:'#16834a'"),'Pass must render as a green label');
assert.ok(rendererSource.includes("label:'FAIL',fill:'#b42332'"),'Fail must render as a red label');
assert.ok(rendererSource.includes('a?.remarks'),'remarks must be overlaid in the approved remarks column');
assert.ok(rendererSource.includes('trial?.phase'),'trial metadata must be overlaid using approved header coordinates');
assert.ok(rendererSource.includes('minimumCellVoltage'),'minimum cell voltage must map to its approved special-field coordinates');
console.log('PDF live overlay checks passed: source PDF, status labels, remarks, trial metadata, mapped battery values, signature and daily photo evidence.');

assert.ok(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('Update PDF Preview'),'manual PDF preview update button must not exist');
assert.ok(!fs.readFileSync(path.join(root,'js/flight-preparation.js'),'utf8').includes("$('previewBtn').onclick"),'manual PDF preview update handler must not exist');
assert.ok(!fs.readFileSync(path.join(root,'js/flight-preparation.js'),'utf8').includes("if(!$('previewPanel')?.classList.contains('show'))return"),'live preview refresh must not depend on panel visibility');

const livePreviewSource=fs.readFileSync(path.join(root,'js/flight-preparation.js'),'utf8');
assert.ok(livePreviewSource.includes('previewBuildRevision=0'),'live preview build must use a monotonic revision guard');
assert.ok(livePreviewSource.includes('if(buildRevision!==previewBuildRevision)return'),'stale asynchronous preview builds must be discarded');
assert.ok(livePreviewSource.includes('immediate?0:100'),'live preview should refresh within a short debounce window');
assert.ok(rendererSourceForAppend.includes('function fitSingleLine'),'long text must fit within its assigned PDF cell without wrapping into adjacent rows');
assert.ok(rendererSourceForAppend.includes('m?.fieldBoxes?.[key]'),'template-specific value fields must be placed in explicitly mapped cells');
