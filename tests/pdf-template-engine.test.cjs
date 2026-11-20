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
assert.equal(packageLoader.validatePackage({...pkg,sourcePdf:{path:'source.pdf',sha256:'bad'}}).valid,false,'missing source checksum must be rejected');
assert.equal(packageLoader.validatePackage({...pkg,sections:[...sections,{title:'Duplicate',items:[{id:'1.1',title:'duplicate'}]}]}).valid,false,'duplicate checkpoint package must be rejected');
