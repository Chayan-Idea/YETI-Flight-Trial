/* Central Flight Trial SOP editor. Publication is prepared locally and completed through an authenticated GitHub Actions workflow. */
(() => {
 'use strict';
 const OWNER='Chayan-Idea';
 const REPO='YETI-Flight-Trial';
 const BRANCH='main';
 const FILE_PATH='data/flight-trial-sop.json';
 const RAW_URL='https://raw.githubusercontent.com/'+OWNER+'/'+REPO+'/'+BRANCH+'/'+FILE_PATH;
 const panel=document.getElementById('flightTrialPreparationSopPanel');
 if(!panel)return;
 const tools=document.getElementById('flightTrialSopAdminTools');
 const readBtn=document.getElementById('flightTrialSopReadModeBtn');
 const editBtn=document.getElementById('flightTrialSopEditModeBtn');
 const actions=document.getElementById('flightTrialSopEditActions');
 const saveBtn=document.getElementById('flightTrialSopSaveBtn');
 const cancelBtn=document.getElementById('flightTrialSopCancelBtn');
 const status=document.getElementById('flightTrialSopStatus');
 const tokenPanel=document.getElementById('flightTrialSopTokenPanel');
 const downloadBtn=document.getElementById('flightTrialSopDownloadBtn');
 const githubUploadBtn=document.getElementById('flightTrialSopGithubUploadBtn');
 const revisionLabel=document.getElementById('flightTrialSopRevision');
 let article=panel.querySelector('.flight-trial-reading-document');
 let savedHtml=article?article.outerHTML:'';
 let currentRevision=1;
 let dirty=false;
 let loading=false;
 let editing=false;
 let centralLoaded=false;
 let refreshInProgress=false;
 let refreshRequested=false;
 let pendingPublicationRevision=null;
 let pendingPublicationStartedAt=0;
 let publicationRunId=null;
 let publicationMonitorBusy=false;
 let publicationReloadScheduled=false;
 editBtn.disabled=true;
 const allowedTags=new Set(['ARTICLE','HEADER','SECTION','DIV','H2','H3','H4','UL','OL','LI','TABLE','THEAD','TBODY','TR','TH','TD','P','SPAN','B','STRONG','EM','I','U','FOOTER','BR','HR']);
 function setStatus(message,type){
  status.textContent=message;
  status.classList.toggle('is-success',type==='success');
  status.classList.toggle('is-error',type==='error');
 }
 function getArticle(){article=panel.querySelector('.flight-trial-reading-document');return article;}
 function setDirty(value){
  dirty=value;
  saveBtn.disabled=!dirty||loading;
  saveBtn.textContent=loading?'Publishing…':'Save Changes';
 }
 function sanitizeHtml(html){
  const doc=new DOMParser().parseFromString(String(html),'text/html');
  const root=doc.body.firstElementChild;
  if(!root||root.tagName!=='ARTICLE'||!root.classList.contains('flight-trial-reading-document'))throw new Error('The SOP document structure is incomplete. Cancel editing and try again.');
  [...root.querySelectorAll('*')].reverse().forEach(el=>{
   if(!allowedTags.has(el.tagName)){el.replaceWith(...el.childNodes);return;}
   [...el.attributes].forEach(attr=>{if(attr.name!=='class')el.removeAttribute(attr.name);});
  });
  root.removeAttribute('contenteditable');
  return root.outerHTML;
 }
 function renderDocument(html){
  const clean=sanitizeHtml(html);
  const template=document.createElement('template');
  template.innerHTML=clean;
  const next=template.content.firstElementChild;
  const old=getArticle();
  if(!old||!next)throw new Error('SOP document could not be rendered.');
  old.replaceWith(next);
  article=next;
  savedHtml=next.outerHTML;
  setDirty(false);
  setEditMode(false);
 }
 function setEditMode(enabled){
  editing=!!enabled;
  const current=getArticle();
  if(current){
   current.contentEditable=editing?'true':'false';
   current.classList.toggle('is-editing',editing);
  }
  readBtn.classList.toggle('is-active',!editing);
  editBtn.classList.toggle('is-active',editing);
  readBtn.setAttribute('aria-pressed',String(!editing));
  editBtn.setAttribute('aria-pressed',String(editing));
  actions.hidden=!editing;
  tokenPanel.hidden=true;
  if(!editing)setDirty(false);
  if(editing)setStatus('Editing mode is active. Changes are not published until you save them.');
 }
 function setRevision(doc){
  currentRevision=Number.isInteger(doc.revision)&&doc.revision>0?doc.revision:1;
  if(revisionLabel){
   const updated=doc.updatedAt?new Date(doc.updatedAt).toLocaleString():'Initial published version';
   revisionLabel.hidden=false;
   revisionLabel.textContent='Revision '+currentRevision+' · Last updated: '+updated+' · '+(doc.updatedBy||'YETI Admin');
  }
 }
 async function fetchLatest(){
  const response=await fetch(RAW_URL+'?v='+Date.now(),{cache:'no-store',credentials:'omit',headers:{'Accept':'application/json','Cache-Control':'no-cache','Pragma':'no-cache'}});
  if(!response.ok)throw new Error('The latest central SOP could not be loaded (HTTP '+response.status+').');
  const doc=await response.json();
  if(doc.schemaVersion!==1||typeof doc.html!=='string')throw new Error('The central SOP file has an unsupported format.');
  return doc;
 }
 async function pollPublicationStatus(){
  if(!pendingPublicationRevision||publicationMonitorBusy||document.visibilityState==='hidden')return;
  publicationMonitorBusy=true;
  try{
   const statusUrl='https://raw.githubusercontent.com/'+OWNER+'/'+REPO+'/'+BRANCH+'/data/sop-publication-status.json?v='+Date.now();
   const response=await fetch(statusUrl,{cache:'no-store',credentials:'omit',headers:{'Accept':'application/json','Cache-Control':'no-cache','Pragma':'no-cache'}});
   if(!response.ok){
    if(response.status===404){setStatus('Waiting for GitHub to receive the SOP JSON upload and start validation… Status checks repeat every 5 seconds.');return;}
    throw new Error('SOP publication status could not be read (HTTP '+response.status+'). Retrying in 5 seconds.');
   }
   const publication=await response.json();
   const statusUpdatedAt=Date.parse(publication.updatedAt||'');
   if(publication.schemaVersion!==1||!Number.isFinite(statusUpdatedAt)||!['validating','publishing','published','failed'].includes(publication.state)){
    throw new Error('GitHub returned an invalid SOP publication-status JSON. Retrying in 5 seconds.');
   }
   // Revision identity is the authoritative correlation key. Do not reject a valid
   // workflow status merely because the admin prepared the local JSON more than
   // 60 seconds before uploading it.
   if(publication.state!=='failed'&&Number(publication.revision)!==Number(pendingPublicationRevision)){
    setStatus('GitHub status checked at '+new Date(statusUpdatedAt).toLocaleTimeString()+'. Waiting for Revision '+pendingPublicationRevision+' (latest reported: Revision '+(publication.revision??'—')+', '+publication.state+'). Next check in 5 seconds.');
    return;
   }
   if(publication.state==='validating'){
    setStatus('JSON file upload in GitHub successful. GitHub Actions is validating the uploaded JSON…');
    return;
   }
   if(publication.state==='publishing'){
    setStatus('JSON validation successful. Publishing Revision '+pendingPublicationRevision+' to the central SOP…');
    return;
   }
   if(publication.state==='failed'){
    setStatus('SOP publication failed: '+(publication.message||'GitHub Actions could not publish this revision.')+' Edit and Publish options remain available.','error');
    return;
   }
   if(publication.state==='published'){
    setStatus('GitHub Actions has published Revision '+pendingPublicationRevision+'. Verifying the central SOP file…');
    const doc=await fetchLatest();
    if(Number(doc.revision)<Number(pendingPublicationRevision)){
     setStatus('GitHub confirms publication. Waiting for central SOP Revision '+pendingPublicationRevision+' to become available; checking again in 5 seconds…');
     return;
    }
    if(typeof doc.html!=='string'||!Number.isInteger(Number(doc.revision)))throw new Error('The published central SOP JSON is incomplete. Retrying verification in 5 seconds.');
    renderDocument(doc.html);
    centralLoaded=true;
    setRevision(doc);
    pendingPublicationRevision=null;
    pendingPublicationStartedAt=0;
    publicationRunId=null;
    setEditMode(false);
    actions.hidden=true;
    tokenPanel.hidden=true;
    setStatus('SOP Revision '+doc.revision+' is published and verified. Publishing controls are closed. YETI will refresh automatically…','success');
    if(!publicationReloadScheduled){
     publicationReloadScheduled=true;
     window.setTimeout(()=>window.location.reload(),1200);
    }
    return;
   }
   setStatus('GitHub received the SOP publication request. Waiting for the next processing stage…');
  }catch(error){
   setStatus(error.message+' YETI will retry automatically in 5 seconds.','error');
  }finally{
   publicationMonitorBusy=false;
  }
 }
 async function loadLatest(){
  if(document.visibilityState==='hidden')return;
  if(refreshInProgress){refreshRequested=true;return;}
  refreshInProgress=true;
  try{
   const doc=await fetchLatest();
   if(editing&&pendingPublicationRevision&&doc.revision>=pendingPublicationRevision){
    setStatus('Central SOP Revision '+doc.revision+' is visible. Waiting for GitHub publication status to confirm completion…');
    return;
   }
   if(editing&&doc.revision>currentRevision&&!pendingPublicationRevision){
    // A newer central revision confirms that the Admin's GitHub publication completed.
    // Replace the local editing copy with the published document and close all edit/publish controls.
    renderDocument(doc.html);
    centralLoaded=true;
    pendingPublicationRevision=null;
    pendingPublicationStartedAt=0;
    editBtn.disabled=false;
    setRevision(doc);
    setStatus('SOP Revision '+doc.revision+' published successfully. Read View Mode has been restored.','success');
    return;
   }
   if(editing)return;
   if(centralLoaded&&doc.revision<=currentRevision)return;
   renderDocument(doc.html);
   centralLoaded=true;
   editBtn.disabled=false;
   setRevision(doc);
   setStatus('Latest centrally saved SOP loaded successfully. All users see this shared version.','success');
  }catch(error){
   centralLoaded=false;
   editBtn.disabled=true;
   setStatus(error.message+' The currently published page copy is being shown. Editing is disabled until the central copy can be verified.','error');
  }finally{
   refreshInProgress=false;
   if(refreshRequested){refreshRequested=false;window.setTimeout(loadLatest,0);}
  }
 }
 function getAdminId(){
  try{
   const session=JSON.parse(sessionStorage.getItem('yetiTabAuthSessionV1')||'null');
   return session&&session.role==='admin'&&['1297','1636'].includes(session.userId)?session.userId:'Admin';
  }catch(_){return 'Admin';}
 }
 function preparePublication(){
  if(document.body.dataset.yetiAuthRole!=='admin')throw new Error('Admin session is required to prepare SOP publication.');
  if(!centralLoaded)throw new Error('The latest central SOP could not be verified. Reload before preparing publication.');
  const articleNow=getArticle();
  if(!articleNow)throw new Error('SOP editor is unavailable.');
  const cleanHtml=sanitizeHtml(articleNow.outerHTML);
  const nextDoc={schemaVersion:1,revision:currentRevision+1,updatedAt:new Date().toISOString(),updatedBy:'Admin '+getAdminId(),html:cleanHtml};
  pendingPublicationRevision=nextDoc.revision;
  pendingPublicationStartedAt=Date.now();
  const blob=new Blob([JSON.stringify(nextDoc,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download='flight-trial-sop.json';document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  publicationRunId=null;
  publicationReloadScheduled=false;
  setStatus('SOP JSON prepared. Waiting for upload and commit to GitHub. Live publication status will update every 5 seconds.','success');
  pollPublicationStatus();
 }
 readBtn.addEventListener('click',()=>{
  if(dirty&&!window.confirm('Discard your unsaved SOP changes and return to Read View Mode?'))return;
  if(dirty)renderDocument(savedHtml);
  setEditMode(false);
  setStatus('Read View Mode. Checking for the latest central SOP…');
  loadLatest();
 });
 editBtn.addEventListener('click',()=>{
  if(document.body.dataset.yetiAuthRole!=='admin'||!centralLoaded)return;
  if(!editing)setEditMode(true);
 });
 panel.addEventListener('input',event=>{
  if(!editing||!event.target.closest('.flight-trial-reading-document'))return;
  setDirty(true);
  setStatus('Unsaved changes detected. Select Save Changes to publish the new central SOP.');
 });
 saveBtn.addEventListener('click',()=>{
  if(!dirty||loading)return;
  tokenPanel.hidden=false;
  setStatus('Prepare the updated SOP file, then submit it through the authenticated GitHub repository workflow.');
 });
 cancelBtn.addEventListener('click',()=>{
  if(dirty&&!window.confirm('Discard all unsaved SOP changes?'))return;
  renderDocument(savedHtml);
  setStatus('Editing cancelled. Checking for the latest centrally saved SOP…');
  loadLatest();
 });
 downloadBtn.addEventListener('click',()=>{
  try{preparePublication();}catch(error){setStatus(error.message,'error');}
 });
 githubUploadBtn.addEventListener('click',()=>{
  const uploadWindow=window.open('https://github.com/'+OWNER+'/'+REPO+'/upload/main/pending-sop','_blank','noopener');
  if(pendingPublicationRevision)setStatus(uploadWindow?'GitHub upload page opened. Upload flight-trial-sop.json and commit it to main. YETI is monitoring the workflow every 5 seconds.':'Allow the GitHub tab to open, then upload flight-trial-sop.json and commit it to main. YETI is monitoring every 5 seconds.');
 });
 window.addEventListener('beforeunload',event=>{
  if(editing&&dirty){event.preventDefault();event.returnValue='';}
 });
 function updateRole(){
  const isAdmin=document.body.dataset.yetiAuthRole==='admin';
  tools.hidden=!isAdmin;
  if(!isAdmin){tokenPanel.hidden=true;}
  if(!isAdmin&&editing){
   if(dirty)renderDocument(savedHtml);
   setEditMode(false);
  }
 }
 new MutationObserver(updateRole).observe(document.body,{attributes:true,attributeFilter:['data-yeti-auth-role']});
 updateRole();
 loadLatest();
 // Keep already-open read sessions synchronized with central edits without disturbing an active Admin edit.
 window.setInterval(()=>{
  if(document.visibilityState==='visible'&&pendingPublicationRevision){pollPublicationStatus();loadLatest();}
 },5000);
 window.setInterval(()=>{
  if(document.visibilityState==='visible'&&!pendingPublicationRevision)loadLatest();
 },5000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){loadLatest();pollPublicationStatus();}});
 window.addEventListener('focus',()=>{loadLatest();pollPublicationStatus();});
 window.addEventListener('pageshow',()=>{loadLatest();pollPublicationStatus();});
})();