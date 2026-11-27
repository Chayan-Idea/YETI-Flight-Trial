/* Shared Flight Trial SOP PDF publisher and reader. GitHub remains the only publication store. */
(() => {
 'use strict';
 const OWNER='Chayan-Idea',REPO='YETI-Flight-Trial',BRANCH='main';
 const BASE=new URL('./',location.href);
 const MANIFEST=new URL('data/flight-trial-sop.json',BASE).href;
 const STATUS=new URL('data/sop-publication-status.json',BASE).href;
 const RAW='https://raw.githubusercontent.com/'+OWNER+'/'+REPO+'/main/';
 const panel=document.getElementById('flightTrialPreparationSopPanel');
 if(!panel)return;
 const $=id=>document.getElementById(id);
 const tools=$('flightTrialSopAdminTools'),readBtn=$('flightTrialSopReadModeBtn'),editBtn=$('flightTrialSopEditModeBtn'),exportBtn=$('flightTrialSopExportPdfBtn');
 const actions=$('flightTrialSopEditActions'),status=$('flightTrialSopStatus'),uploadPanel=$('flightTrialSopTokenPanel'),fileInput=$('flightTrialSopPdfInput'),proceed=$('flightTrialSopProceedBtn'),cancel=$('flightTrialSopCancelBtn'),revisionLabel=$('flightTrialSopRevision');
 let currentRevision='',publishedPdfUrl='',pollTimer=null,pollBusy=false,pending=false,uploadStartedAt=0,legacyArticle=panel.querySelector('.flight-trial-reading-document');
 const say=(s,type)=>{status.textContent=s;status.classList.toggle('is-success',type==='success');status.classList.toggle('is-error',type==='error');};
 async function getJson(url){
  let last;
  for(const u of [url,RAW+(url===MANIFEST?'data/flight-trial-sop.json':'data/sop-publication-status.json')]){
   try{const r=await fetch(u+(u.includes('?')?'&':'?')+'v='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json();}catch(e){last=e;}
  }throw last||Error('GitHub data unavailable');
 }
 function showPdf(url){
  let frame=$('flightTrialSopPdfFrame');
  if(!frame){frame=document.createElement('iframe');frame.id='flightTrialSopPdfFrame';frame.title='Published Flight Trial SOP PDF';frame.style.cssText='display:block;width:100%;height:min(82vh,1100px);min-height:620px;border:1px solid #d6e0ea;border-radius:12px;background:#fff';const host=$('flightTrialSopDocumentHost');host.replaceChildren(frame);}
  frame.src=url+(url.includes('#')?'&':'#')+'toolbar=1&navpanes=1&view=FitH';
  frame.hidden=false;
  if(legacyArticle)legacyArticle.hidden=true;
  publishedPdfUrl=url;
 }
 async function loadPublished(){
  try{
   const doc=await getJson(MANIFEST);
   if(doc.schemaVersion===2&&doc.pdfUrl&&doc.revision){
    if(String(doc.revision)!==currentRevision||!publishedPdfUrl){currentRevision=String(doc.revision);showPdf(new URL(doc.pdfUrl,BASE).href);if(revisionLabel){revisionLabel.hidden=false;revisionLabel.textContent='Revision '+doc.revision+' · '+(doc.updatedAt?new Date(doc.updatedAt).toLocaleString():'Published')+' · '+(doc.updatedBy||'Admin');}}
    editBtn.disabled=false;return true;
   }
   // Until the first PDF is published, preserve the currently deployed SOP HTML.
   if(legacyArticle)legacyArticle.hidden=false;
   editBtn.disabled=false;return true;
  }catch(e){say('Could not verify the central SOP manifest. The last deployed reading copy is retained. '+e.message,'error');editBtn.disabled=true;return false;}
 }
 function stopPolling(){if(pollTimer){clearTimeout(pollTimer);pollTimer=null;}}
 async function poll(){
  if(!pending||pollBusy||document.visibilityState==='hidden')return;
  pollBusy=true;
  try{
   const s=await getJson(STATUS);
   const t=new Date().toLocaleTimeString();
   if(s.state==='validating'||s.state==='publishing'){
    say('Checked GitHub at '+t+'. '+(s.message||'PDF validation/publication is in progress.')+' Next check in 5 seconds.');return;
   }
   if(s.state==='failed'){
    say('PDF publication failed: '+(s.message||'GitHub Actions rejected the document.')+' Your previous published PDF remains available. You can retry.','error');pending=false;proceed.disabled=false;return;
   }
   if(s.state==='published'&&String(s.revision)!==currentRevision&&Date.parse(s.updatedAt||'')>=uploadStartedAt){
    say('GitHub published the new PDF. Verifying the shared reading copy…');
    const ok=await loadPublished();
    if(ok&&publishedPdfUrl){pending=false;stopPolling();uploadPanel.hidden=true;actions.hidden=true;readBtn.classList.add('is-active');editBtn.classList.remove('is-active');say('New SOP PDF published and verified. The same revision is now available in Admin and User Reading Mode.','success');return;}
   }
   say('Waiting for the uploaded PDF to be committed to GitHub. Next check in 5 seconds.');
  }catch(e){say('GitHub status check failed: '+e.message+' Retrying in 5 seconds.','error');}
  finally{pollBusy=false;if(pending)pollTimer=setTimeout(poll,5000);}
 }
 readBtn.addEventListener('click',()=>{uploadPanel.hidden=true;actions.hidden=true;readBtn.classList.add('is-active');editBtn.classList.remove('is-active');loadPublished();});
 editBtn.addEventListener('click',()=>{
  if(document.body.dataset.yetiAuthRole!=='admin')return;
  uploadPanel.hidden=false;actions.hidden=false;readBtn.classList.remove('is-active');editBtn.classList.add('is-active');
  say('Select the replacement SOP PDF. The currently published PDF remains available until the new revision passes validation.');
 });
 fileInput.addEventListener('change',()=>{
  const f=fileInput.files&&fileInput.files[0];
  if(!f)return;
  if(f.type!=='application/pdf'&&!f.name.toLowerCase().endsWith('.pdf')){fileInput.value='';say('Only PDF documents are accepted.','error');return;}
  if(f.size<100||f.size>25*1024*1024){fileInput.value='';say('PDF size must be between 100 bytes and 25 MB.','error');return;}
  say('Selected: '+f.name+' · '+(f.size/1024/1024).toFixed(2)+' MB. Click Proceed and Update in the Webpage to continue.');
 });
 proceed.addEventListener('click',async()=>{
  const f=fileInput.files&&fileInput.files[0];
  if(!f){say('Select a PDF reference document first.','error');return;}
  if(document.body.dataset.yetiAuthRole!=='admin'){say('Admin login is required.','error');return;}
  proceed.disabled=true;uploadStartedAt=Date.now();pending=true;
  say('Publication package ready. GitHub authentication is required for the final upload. In the GitHub tab, upload this selected file renamed exactly as flight-trial-sop.pdf into pending-sop/ and commit to main. Do not replace the current published PDF manually.');
  const w=window.open('https://github.com/'+OWNER+'/'+REPO+'/upload/main/pending-sop','_blank','noopener');
  if(!w){say('Allow the GitHub tab to open. Upload the selected PDF as flight-trial-sop.pdf into pending-sop/ and commit to main.');}
  poll();
 });
 cancelBtn.addEventListener('click',()=>{fileInput.value='';uploadPanel.hidden=true;actions.hidden=true;readBtn.classList.add('is-active');editBtn.classList.remove('is-active');say('Upload cancelled. The last published SOP PDF remains unchanged.');});
 exportBtn.addEventListener('click',()=>{
  if(!publishedPdfUrl){say('A PDF revision has not yet been published. The legacy reading copy is currently displayed.','error');return;}
  const a=document.createElement('a');a.href=publishedPdfUrl;a.target='_blank';a.rel='noopener';a.click();
 });
 function roleUpdate(){const admin=document.body.dataset.yetiAuthRole==='admin';tools.hidden=!admin;if(!admin){uploadPanel.hidden=true;actions.hidden=true;}}
 new MutationObserver(roleUpdate).observe(document.body,{attributes:true,attributeFilter:['data-yeti-auth-role']});
 roleUpdate();loadPublished();
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){loadPublished();if(pending)poll();}});
 window.addEventListener('focus',()=>{loadPublished();if(pending)poll();});
})();