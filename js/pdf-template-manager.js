/* Versioned, fail-closed PDF template registry for the 01B checklist. */
(function(root){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 function validate(template,sections){
  const errors=[];
  if(!template||!template.templateId)errors.push('Missing template identity.');
  if(!template?.page||template.page.width<=0||template.page.height<=0)errors.push('Invalid source page geometry.');
  if(!Number.isInteger(template?.sourcePages)||template.sourcePages<1)errors.push('Invalid source page count.');
  if(template?.signatureMode!==undefined&&!['mapped-source-cell','append-signature-page'].includes(template.signatureMode))errors.push('Unsupported signature placement mode.');
  const ids=(sections||[]).flatMap(section=>(section.items||[]).map(item=>item.id));
  if(!ids.length)errors.push('Checklist schema contains no checkpoints.');
  if(new Set(ids).size!==ids.length)errors.push('Checklist schema contains duplicate checkpoint IDs.');
  const rows=template?.rows||{};
  ids.filter(id=>id!=='9.0').forEach(id=>{
   if(template.signatureMode==='append-signature-page')return;
   const row=rows[id];
   if(!Array.isArray(row)||row.length!==2||!Number.isInteger(row[0])||row[0]<1||row[0]>template.sourcePages||!Number.isFinite(row[1])||row[1]<0||row[1]>template.page.height)errors.push('Missing or invalid PDF row mapping: '+id);
  });
  Object.entries(template?.columns||{}).forEach(([key,value])=>{if(!Number.isFinite(value)||value<0||value>template.page.width)errors.push('Invalid column coordinate: '+key)});
  return {valid:errors.length===0,errors,checkpointCount:ids.length,coordinateCount:Object.keys(rows).length};
 }
 let active=null,activeValidation=null;const registry=new Map();
 function register(template,sections){
  const candidate=clone(template);candidate.checklistSections=clone(sections||[]);const validation=validate(candidate,candidate.checklistSections);
  const registration={template:candidate,validation,status:validation.valid?'validated':'rejected'};if(validation.valid)registry.set(candidate.templateId+'@'+candidate.version,registration);return registration;
 }
 function activate(registration,approval){
  if(!registration?.validation?.valid)throw new Error('Cannot activate an invalid PDF template.');
  if(approval!==true)throw new Error('Template activation requires explicit approval.');
  active=Object.freeze(clone(registration.template));activeValidation=registration.validation;
  return getActiveTemplate();
 }
 function getActiveTemplate(){return active?{template:active,validation:activeValidation}:null}
 function listVersions(templateId){return [...registry.entries()].filter(([key])=>key.startsWith(templateId+'@')).map(([key,value])=>({version:value.template.version,status:value.status,valid:value.validation.valid})).sort((a,b)=>a.version.localeCompare(b.version,undefined,{numeric:true}))}
 function activateVersion(templateId,version,approval){const entry=registry.get(templateId+'@'+version);if(!entry)throw new Error('Requested template version is not registered.');return activate(entry,approval)}
 root.YETI_PDF_TEMPLATE_MANAGER=Object.freeze({validate,register,activate,getActiveTemplate,listVersions,activateVersion});
 const initial=register(root.YETI_DAILY_AIRWORTHINESS_PDF_MANIFEST,root.YETI_DAILY_AIRWORTHINESS_TEMPLATE);
 root.YETI_PDF_TEMPLATE_STATUS={templateId:initial.template.templateId,version:initial.template.version,...initial.validation};
 if(initial.validation.valid)activate(initial,true);
})(window);
