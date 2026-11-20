/* Loads only a ChatGPT-published, explicitly approved PDF template package.
 * The webpage never asks operators to upload the master PDF.
 */
(function(root){
 'use strict';
 async function start(){
  const packageUrl=root.YETI_DAILY_AIRWORTHINESS_PDF_PACKAGE_URL;
  if(!packageUrl||!root.YETI_PDF_TEMPLATE_PACKAGE)return;
  try{
   const candidate=await root.YETI_PDF_TEMPLATE_PACKAGE.load(packageUrl);
   if(candidate.package.activation?.status!=='approved'){
    root.YETI_PDF_TEMPLATE_STATUS={status:'pending-approval',templateId:candidate.package.document.templateId,validation:candidate.validation};
    return;
   }
   root.YETI_PDF_TEMPLATE_PACKAGE.activate(candidate,true);
   root.YETI_PDF_TEMPLATE_STATUS={status:'active',templateId:candidate.package.document.templateId,validation:candidate.validation};
  }catch(error){
   root.YETI_PDF_TEMPLATE_STATUS={status:'load-failed',error:error.message};
   console.error('Approved PDF template could not be loaded; retaining the last working checklist.',error);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})(window);
