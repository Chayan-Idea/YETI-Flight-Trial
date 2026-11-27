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
  const response=await fetch(RAW_URL+'?v='+Date.now(),{cache:'no-store',headers:{'Accept':'application/json'}});
  if(!response.ok)throw new Error('The latest central SOP could not be loaded (HTTP '+response.status+').');
  const doc=await response.json();
  if(doc.schemaVersion!==1||typeof doc.html!=='string')throw new Error('The central SOP file has an unsupported format.');
  return doc;
 }
 async function loadLatest(){
  if(refreshInProgress||document.visibilityState==='hidden')return;
  refreshInProgress=true;
  try{
   const doc=await fetchLatest();
   if(editing&&doc.revision>currentRevision){
    // A newer central revision confirms that the Admin's GitHub publication completed.
    // Replace the local editing copy with the published document and close all edit/publish controls.
    renderDocument(doc.html);
    centralLoaded=true;
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
  const blob=new Blob([JSON.stringify(nextDoc,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download='flight-trial-sop.json';document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  setStatus('SOP publication file downloaded. Upload it to the GitHub pending-sop folder and commit to main. GitHub Actions will validate and publish it automatically.','success');
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
 githubUploadBtn.addEventListener('click',()=>window.open('https://github.com/'+OWNER+'/'+REPO+'/upload/main/pending-sop','_blank','noopener'));
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
 window.setInterval(()=>{if(document.visibilityState==='visible')loadLatest();},10000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadLatest();});
 window.addEventListener('focus',loadLatest);
})();