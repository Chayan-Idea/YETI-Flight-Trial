/* Central Flight Trial SOP editor.
 * Public read: raw GitHub content. Admin write: short-lived token entered per save.
 * The GitHub token is never persisted to storage, cookies, DOM attributes or the repository.
 */
(() => {
 'use strict';
 const OWNER='Chayan-Idea';
 const REPO='YETI-Flight-Trial';
 const BRANCH='main';
 const FILE_PATH='data/flight-trial-sop.json';
 const RAW_URL='https://raw.githubusercontent.com/'+OWNER+'/'+REPO+'/'+BRANCH+'/'+FILE_PATH;
 const API_URL='https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/'+FILE_PATH;
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
 const tokenInput=document.getElementById('flightTrialSopGitHubToken');
 const publishBtn=document.getElementById('flightTrialSopPublishBtn');
 const tokenCancelBtn=document.getElementById('flightTrialSopTokenCancelBtn');
 const revisionLabel=document.getElementById('flightTrialSopRevision');
 let article=panel.querySelector('.flight-trial-reading-document');
 let savedHtml=article?article.outerHTML:'';
 let currentRevision=1;
 let dirty=false;
 let loading=false;
 let editing=false;
 let centralLoaded=false;
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
  if(tokenInput)tokenInput.value='';
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
  try{
   const doc=await fetchLatest();
   renderDocument(doc.html);
   centralLoaded=true;
   editBtn.disabled=false;
   setRevision(doc);
   setStatus('Latest centrally saved SOP loaded successfully. All users see this shared version.','success');
  }catch(error){
   centralLoaded=false;
   editBtn.disabled=true;
   setStatus(error.message+' The currently published page copy is being shown. Editing is disabled until the central copy can be verified.','error');
  }
 }
 function getAdminId(){
  try{
   const session=JSON.parse(sessionStorage.getItem('yetiTabAuthSessionV1')||'null');
   return session&&session.role==='admin'&&['1297','1636'].includes(session.userId)?session.userId:'Admin';
  }catch(_){return 'Admin';}
 }
 function encodeBase64Unicode(value){
  const bytes=new TextEncoder().encode(value);
  let binary='';
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));
  return btoa(binary);
 }
 async function publish(){
  if(document.body.dataset.yetiAuthRole!=='admin')throw new Error('Admin session is required to publish SOP changes.');
  if(!centralLoaded)throw new Error('The latest central SOP could not be verified. Reload the page before editing or publishing.');
  const token=tokenInput.value.trim();
  tokenInput.value='';
  if(!token)throw new Error('Enter your GitHub fine-grained token to continue.');
  const articleNow=getArticle();
  if(!articleNow)throw new Error('SOP editor is unavailable.');
  const cleanHtml=sanitizeHtml(articleNow.outerHTML);
  const nextDoc={
   schemaVersion:1,
   revision:currentRevision+1,
   updatedAt:new Date().toISOString(),
   updatedBy:'Admin '+getAdminId(),
   html:cleanHtml
  };
  const headers={
   'Accept':'application/vnd.github+json',
   'Authorization':'Bearer '+token,
   'X-GitHub-Api-Version':'2022-11-28',
   'Content-Type':'application/json'
  };
  const metaResponse=await fetch(API_URL+'?ref='+BRANCH,{method:'GET',headers});
  if(!metaResponse.ok){
   if(metaResponse.status===401||metaResponse.status===403)throw new Error('GitHub rejected the token. Check its expiry, repository access and Contents: Read and write permission.');
   throw new Error('Could not verify the current SOP revision with GitHub (HTTP '+metaResponse.status+').');
  }
  const meta=await metaResponse.json();
  const body={
   message:'Update Flight Trial SOP — revision '+nextDoc.revision,
   content:encodeBase64Unicode(JSON.stringify(nextDoc,null,2)),
   sha:meta.sha,
   branch:BRANCH
  };
  const putResponse=await fetch(API_URL,{method:'PUT',headers,body:JSON.stringify(body)});
  const result=await putResponse.json().catch(()=>({}));
  if(putResponse.status===409||putResponse.status===422)throw new Error('The central SOP changed or GitHub rejected this update. Reload the latest SOP before trying again; your current edits have not been published.');
  if(!putResponse.ok)throw new Error(result.message||('GitHub could not save the SOP (HTTP '+putResponse.status+').'));
  renderDocument(nextDoc.html);
  setRevision(nextDoc);
  setStatus('SOP revision '+nextDoc.revision+' committed successfully to GitHub. It is now the central version for all users.','success');
 }
 readBtn.addEventListener('click',()=>{
  if(dirty&&!window.confirm('Discard your unsaved SOP changes and return to Read View Mode?'))return;
  if(dirty)renderDocument(savedHtml);
  setEditMode(false);
  setStatus('Read View Mode. No changes are being edited.');
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
  tokenInput.focus();
  setStatus('Enter a fine-grained GitHub token to commit this revision.');
 });
 tokenCancelBtn.addEventListener('click',()=>{
  tokenInput.value='';
  tokenPanel.hidden=true;
  setStatus('Save cancelled. Your unsaved edits remain in Edit View Mode.');
 });
 cancelBtn.addEventListener('click',()=>{
  if(dirty&&!window.confirm('Discard all unsaved SOP changes?'))return;
  renderDocument(savedHtml);
  tokenInput.value='';
  setStatus('Editing cancelled. The last centrally saved SOP has been restored.');
 });
 publishBtn.addEventListener('click',async()=>{
  if(loading)return;
  loading=true;
  publishBtn.disabled=true;
  saveBtn.disabled=true;
  publishBtn.textContent='Publishing…';
  setStatus('Verifying GitHub access and publishing the SOP revision…');
  try{
   await publish();
   tokenPanel.hidden=true;
   setEditMode(false);
  }catch(error){
   setStatus(error.message,'error');
   tokenPanel.hidden=false;
  }finally{
   loading=false;
   publishBtn.disabled=false;
   publishBtn.textContent='Confirm & Publish';
   setDirty(dirty);
  }
 });
 tokenInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();publishBtn.click();}});
 window.addEventListener('beforeunload',event=>{
  if(editing&&dirty){event.preventDefault();event.returnValue='';}
 });
 function updateRole(){
  const isAdmin=document.body.dataset.yetiAuthRole==='admin';
  tools.hidden=!isAdmin;
  if(!isAdmin&&editing){
   if(dirty)renderDocument(savedHtml);
   setEditMode(false);
  }
 }
 new MutationObserver(updateRole).observe(document.body,{attributes:true,attributeFilter:['data-yeti-auth-role']});
 updateRole();
 loadLatest();
})();