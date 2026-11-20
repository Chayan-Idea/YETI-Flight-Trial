/* Loads only a ChatGPT-published, explicitly approved PDF template package.
 * The webpage never asks operators to upload the master PDF.
 */
(function(root){
 'use strict';
 function failClosed(message){
  const list=document.getElementById('list');
  if(list){const alert=document.createElement('p');alert.className='alert alert-danger';alert.setAttribute('role','alert');alert.textContent=message;list.replaceChildren(alert);}
  const preview=document.getElementById('previewContent');
  if(preview)preview.textContent='PDF preview is unavailable because the approved checklist template could not be verified.';
  document.querySelectorAll('button').forEach(button=>{
   if(/export.*pdf|pdf.*export/i.test(button.textContent||'')){button.disabled=true;button.title='Export disabled until the approved PDF template is verified.'}
  });
 }
 async function start(){
  const packageUrl=root.YETI_DAILY_AIRWORTHINESS_PDF_PACKAGE_URL;
  if(!packageUrl||!root.YETI_PDF_TEMPLATE_PACKAGE)return;
  try{
   const candidate=await root.YETI_PDF_TEMPLATE_PACKAGE.load(packageUrl);
   if(candidate.package.activation?.status!=='approved'){
    root.YETI_PDF_TEMPLATE_STATUS={status:'pending-approval',templateId:candidate.package.document.templateId,validation:candidate.validation};
    failClosed('Daily Airworthiness PDF template is awaiting explicit approval. Checklist entry and PDF export are disabled.');
    return;
   }
   root.YETI_PDF_TEMPLATE_PACKAGE.activate(candidate,true);
   root.YETI_PDF_TEMPLATE_STATUS={status:'active',templateId:candidate.package.document.templateId,validation:candidate.validation};
  }catch(error){
   root.YETI_PDF_TEMPLATE_STATUS={status:'load-failed',error:error.message};
   console.error('Approved PDF template could not be loaded; daily checklist is disabled to prevent stale-template use.',error);
   failClosed('Approved Daily Airworthiness PDF could not be loaded or checksum-verified. Checklist entry and PDF export are disabled. Please contact the template administrator.');
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})(window);
