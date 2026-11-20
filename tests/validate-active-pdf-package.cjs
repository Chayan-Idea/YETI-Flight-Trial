#!/usr/bin/env node
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const manifest=fs.readFileSync(path.join(root,'js/daily-airworthiness-pdf-manifest.js'),'utf8');
const match=manifest.match(/YETI_DAILY_AIRWORTHINESS_PDF_PACKAGE_URL="([^"]+)"/);
assert.ok(match,'Active PDF package pointer is missing.');
const packagePath=path.resolve(root,match[1].replace(/^\.\//,''));
assert.ok(packagePath.startsWith(path.join(root,'assets','templates')+path.sep),'Active package must resolve inside versioned template assets.');
assert.ok(fs.existsSync(packagePath),'Active approved PDF package file is missing.');
const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
const window={};
vm.runInNewContext(fs.readFileSync(path.join(root,'js/pdf-template-package-loader.js'),'utf8'),{window});
const validation=window.YETI_PDF_TEMPLATE_PACKAGE.validatePackage(pkg);
assert.equal(pkg.activation?.status,'approved','Production pointer must reference an approved package.');
assert.ok(validation.valid,'Active PDF package validation failed: '+validation.errors.join('; '));
const pdfPath=path.resolve(root,pkg.sourcePdf.path);
assert.ok(pdfPath.startsWith(path.join(root,'assets','templates')+path.sep),'Source PDF must remain in immutable versioned assets.');
const bytes=fs.readFileSync(pdfPath);
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),pkg.sourcePdf.sha256,'Active source PDF checksum mismatch.');
const ids=pkg.sections.flatMap(section=>section.items.map(item=>item.id));
assert.equal(new Set(ids).size,ids.length,'Active checklist contains duplicate IDs.');
assert.equal(validation.checkpointCount,ids.length,'Active package checkpoint count mismatch.');
for(const id of ids.filter(id=>id!=='9.0')){
 const row=pkg.template.rows[id];
 assert.ok(Array.isArray(row)&&Number.isInteger(row[0])&&row[0]>=1&&row[0]<=pkg.document.pageCount,'Missing or invalid source row map: '+id);
}
console.log('Active PDF package gate passed: approved package, '+ids.length+' checkpoints, complete row/column geometry and verified SHA-256.');
