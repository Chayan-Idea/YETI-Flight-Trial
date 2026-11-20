/* Versioned, fail-closed PDF template registry for the 01B checklist. */
(function(root){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 function validate(template,sections){
  const errors=[];
  if(!template||!template.templateId)errors.push('Missing template identity.');
  if(!template?.page||template.page.width<=0||template.page.height<=0)errors.push('Invalid source page geometry.');
  if(!Number.isInteger(template?.sourcePages)||template.sourcePages<1)errors.push('Invalid source page count.');
  const ids=(sections||[]).flatMap(section=>(section.items||[]).map(item=>item.id));
  if(!ids.length)errors.push('Checklist schema contains no checkpoints.');
  if(new Set(ids).size!==ids.length)errors.push('Checklist schema contains duplicate checkpoint IDs.');
  const rows=template?.rows||{};
  ids.filter(id=>id!=='9.0').forEach(id=>{
   const row=rows[id];
   if(!Array.isArray(row)||row.length!==2||!Number.isInteger(row[0])||row[0]<1||row[0]>template.sourcePages||!Number.isFinite(row[1])||row[1]<0||row[1]>template.page.height)errors.push('Missing or invalid PDF row mapping: '+id);
  });
  Object.entries(template?.columns||{}).forEach(([key,value])=>{if(!Number.isFinite(value)||value<0||value>template.page.width)errors.push('Invalid column coordinate: '+key)});
  return {valid:errors.length===0,errors,checkpointCount:ids.length,coordinateCount:Object.keys(rows).length};
 }
 let active=null,activeValidation=null;
 function register(template,sections){
  const candidate=clone(template),validation=validate(candidate,sections);
  return {template:candidate,validation,status:validation.valid?'validated':'rejected'};
 }
 function activate(registration,approval){
  if(!registration?.validation?.valid)throw new Error('Cannot activate an invalid PDF template.');
  if(approval!==true)throw new Error('Template activation requires explicit approval.');
  active=Object.freeze(clone(registration.template));activeValidation=registration.validation;
  return getActiveTemplate();
 }
 function getActiveTemplate(){return active?{template:active,validation:activeValidation}:null}
 root.YETI_PDF_TEMPLATE_MANAGER=Object.freeze({validate,register,activate,getActiveTemplate});
})(window);
