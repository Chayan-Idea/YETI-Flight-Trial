/* Verified loader for ChatGPT-prepared PDF template packages. */
(function(root){
 'use strict';
 const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
 async function sha256(buffer){
  if(!root.crypto?.subtle)throw new Error('SHA-256 verification is unavailable.');
  const digest=await root.crypto.subtle.digest('SHA-256',buffer);
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 }
 function validatePackage(pkg){
  const errors=[];
  if(!plain(pkg))return {valid:false,errors:['Package must be an object.']};
  if(pkg.packageVersion!==1)errors.push('Unsupported package version.');
  if(!['candidate','approved'].includes(pkg.activation?.status))errors.push('Activation status must be candidate or approved.');
  if(!plain(pkg.document)||!pkg.document.templateId||!pkg.document.version)errors.push('Document identity/version missing.');
  if(!plain(pkg.sourcePdf)||typeof pkg.sourcePdf.path!=='string'||!pkg.sourcePdf.path.endsWith('.pdf'))errors.push('Source PDF path missing.');
  if(!/^[a-f0-9]{64}$/i.test(pkg.sourcePdf?.sha256||''))errors.push('Source PDF SHA-256 missing or invalid.');
  if(!plain(pkg.template)||!Array.isArray(pkg.sections))errors.push('Template geometry and checklist sections are required.');
  if(pkg.template?.page?.width!==pkg.document?.pageWidth||pkg.template?.page?.height!==pkg.document?.pageHeight)errors.push('Page geometry mismatch.');
  if(pkg.template?.signatureMode!==undefined&&!['mapped-source-cell','append-signature-page'].includes(pkg.template.signatureMode))errors.push('Unsupported signature placement mode.');
  const ids=(pkg.sections||[]).flatMap(s=>(s.items||[]).map(i=>i.id));
  if(!ids.length)errors.push('No checklist checkpoints found.');
  if(new Set(ids).size!==ids.length)errors.push('Duplicate checkpoint IDs found.');
  if(pkg.template?.signatureMode!=='append-signature-page'){
   for(const id of ids.filter(id=>id!=='9.0')){
    const row=pkg.template?.rows?.[id];
    if(!Array.isArray(row)||row[0]<1||row[0]>pkg.document.pageCount||row[1]<0||row[1]>pkg.document.pageHeight)errors.push('Missing/invalid coordinate mapping: '+id);
   }
  }
  for(const groupName of ['header','fieldBoxes','specialFields']){
   for(const [key,box] of Object.entries(pkg.template?.[groupName]||{})){
    if(!plain(box)||!Number.isInteger(box.page)||box.page<1||box.page>pkg.document.pageCount||!Number.isFinite(box.x)||!Number.isFinite(box.y)||!Number.isFinite(box.width)||!Number.isFinite(box.height)||box.x<0||box.y<0||box.width<=0||box.height<=0||box.x+box.width>pkg.document.pageWidth+0.5||box.y+box.height>pkg.document.pageHeight+0.5)errors.push('Missing or out-of-page cell geometry: '+groupName+'.'+key);
   }
  }
  return {valid:errors.length===0,errors,checkpointCount:ids.length};
 }
 async function load(packageUrl){
  const response=await fetch(packageUrl,{cache:'no-store'});
  if(!response.ok)throw new Error('Template package fetch failed: '+response.status);
  const pkg=await response.json(),validation=validatePackage(pkg);
  if(!validation.valid)throw new Error('Template rejected: '+validation.errors.join(' '));
  const pdfUrl=new URL(pkg.sourcePdf.path,root.location.href);
  const pdfResponse=await fetch(pdfUrl.href,{cache:'no-store'});
  if(!pdfResponse.ok)throw new Error('Source PDF fetch failed: '+pdfResponse.status);
  const bytes=await pdfResponse.arrayBuffer();
  if(bytes.byteLength<100||new TextDecoder().decode(new Uint8Array(bytes.slice(0,5)))!=='%PDF-')throw new Error('Source asset is not a valid PDF.');
  if((await sha256(bytes)).toLowerCase()!==pkg.sourcePdf.sha256.toLowerCase())throw new Error('Source PDF checksum mismatch.');
  return {package:pkg,validation,pdfBytes:bytes,sourceUrl:pdfUrl.href,status:'validated-pending-approval'};
 }
 function activate(candidate,approved){
  if(approved!==true)throw new Error('Explicit approval is required.');
  if(candidate?.package?.activation?.status!=='approved')throw new Error('Candidate PDF package is review-only and cannot be activated.');
  if(!candidate?.validation?.valid||!candidate.pdfBytes)throw new Error('Only a fully validated package can be activated.');
  const packageDocument=candidate.package.document;
  const template={...candidate.package.template,templateId:packageDocument.templateId,version:packageDocument.version,sourcePages:packageDocument.pageCount};
  const registration=root.YETI_PDF_TEMPLATE_MANAGER.register(template,candidate.package.sections);
  if(!registration.validation.valid)throw new Error('Coordinate map rejected: '+registration.validation.errors.join(' '));
  registration.template.sourcePdfPath=candidate.package.sourcePdf.path;
  registration.template.sourcePdfSha256=candidate.package.sourcePdf.sha256;
  registration.template.document=candidate.package.document;
  const activated=root.YETI_PDF_TEMPLATE_MANAGER.activate(registration,true);root.YETI_ACTIVE_PDF_TEMPLATE={...candidate,template:activated.template};root.dispatchEvent(new CustomEvent('yeti:pdf-template-activated',{detail:{template:activated.template,source:candidate}}));return activated;
 }
 root.YETI_PDF_TEMPLATE_PACKAGE=Object.freeze({validatePackage,load,activate});
})(window);
