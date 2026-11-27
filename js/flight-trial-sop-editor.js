/* Central Flight Trial SOP editor. Publication is prepared locally and completed through an authenticated GitHub Actions workflow. */
(() => {
 'use strict';
 const OWNER='Chayan-Idea';
 const REPO='YETI-Flight-Trial';
 const BRANCH='main';
 const FILE_PATH='data/flight-trial-sop.json';
 const STATUS_PATH='data/sop-publication-status.json';
 // Prefer the GitHub Pages origin (same-origin, no CORS dependency). Raw GitHub is
 // retained only as a fallback if the deployed Pages asset is temporarily unavailable.
 const PAGE_BASE=new URL('./',window.location.href);
 const PAGE_SOP_URL=new URL(FILE_PATH,PAGE_BASE).href;
 const PAGE_STATUS_URL=new URL(STATUS_PATH,PAGE_BASE).href;
 const RAW_URL='https://raw.githubusercontent.com/'+OWNER+'/'+REPO+'/'+BRANCH+'/'+FILE_PATH;
 const RAW_STATUS_URL='https://raw.githubusercontent.com/'+OWNER+'/'+REPO+'/'+BRANCH+'/'+STATUS_PATH;
 const panel=document.getElementById('flightTrialPreparationSopPanel');
 if(!panel)return;
 const tools=document.getElementById('flightTrialSopAdminTools');
 const readBtn=document.getElementById('flightTrialSopReadModeBtn');
 const editBtn=document.getElementById('flightTrialSopEditModeBtn');
 const exportPdfBtn=document.getElementById('flightTrialSopExportPdfBtn');
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
 let currentRevision='';
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
 let liveSyncTimer=null;
 let liveSyncRunning=false;
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
 function compareRevision(a,b){
  const left=String(a??''),right=String(b??'');
  if(/^\d+$/.test(left)&&/^\d+$/.test(right))return Number(left)-Number(right);
  if(/^\d+$/.test(left))return -1;
  if(/^\d+$/.test(right))return 1;
  return left.localeCompare(right);
 }
 function setRevision(doc){
  currentRevision=doc.revision==null?'':String(doc.revision);
  if(revisionLabel){
   const updated=doc.updatedAt?new Date(doc.updatedAt).toLocaleString():'Initial published version';
   revisionLabel.hidden=false;
   revisionLabel.textContent='Revision '+currentRevision+' · Last updated: '+updated+' · '+(doc.updatedBy||'YETI Admin');
  }
 }
 async function fetchFreshJson(primaryUrl,fallbackUrl,label){
  const failures=[];
  for(const baseUrl of [primaryUrl,fallbackUrl]){
   try{
    const separator=baseUrl.includes('?')?'&':'?';
    const response=await fetch(baseUrl+separator+'v='+Date.now(),{
     method:'GET',cache:'no-store',credentials:'same-origin',
     headers:{'Accept':'application/json','Cache-Control':'no-cache','Pragma':'no-cache'}
    });
    if(!response.ok)throw new Error('HTTP '+response.status+' from '+new URL(baseUrl).host);
    return await response.json();
   }catch(error){
    failures.push(error&&error.message?error.message:String(error));
   }
  }
  throw new Error(label+' could not be fetched from GitHub Pages or the GitHub raw fallback. '+failures.join(' | '));
 }
 async function fetchLatest(){
  const doc=await fetchFreshJson(PAGE_SOP_URL,RAW_URL,'The latest central SOP');
  if(doc.schemaVersion!==1||typeof doc.html!=='string')throw new Error('The central SOP file has an unsupported format.');
  return doc;
 }
 async function pollPublicationStatus(){
  if(!pendingPublicationRevision||publicationMonitorBusy||document.visibilityState==='hidden')return;
  publicationMonitorBusy=true;
  try{
   let publication;
   try{
    publication=await fetchFreshJson(PAGE_STATUS_URL,RAW_STATUS_URL,'The SOP publication status');
   }catch(error){
    setStatus('Checked GitHub at '+new Date().toLocaleTimeString()+'. '+error.message+' Retrying in 5 seconds.','error');
    return;
   }
   const statusUpdatedAt=Date.parse(publication.updatedAt||'');
   const checkedAt=new Date();
   const checkedLabel=checkedAt.toLocaleTimeString();
   const updatedLabel=Number.isFinite(statusUpdatedAt)?new Date(statusUpdatedAt).toLocaleTimeString():'unknown';
   if(publication.schemaVersion!==1||!Number.isFinite(statusUpdatedAt)||!['validating','publishing','published','failed'].includes(publication.state)){
    throw new Error('GitHub returned an invalid SOP publication-status JSON. Checked at '+checkedLabel+'. Retrying in 5 seconds.');
   }
   // Revision identity is the authoritative correlation key. Do not reject a valid
   // workflow status merely because the admin prepared the local JSON more than
   // 60 seconds before uploading it.
   if(publication.state!=='failed'&&String(publication.revision)!==String(pendingPublicationRevision)){
    setStatus('Checked GitHub at '+checkedLabel+'. Latest status was updated at '+updatedLabel+'. Waiting for Revision '+pendingPublicationRevision+' (latest reported: Revision '+(publication.revision??'—')+', '+publication.state+'). Next check in 5 seconds.');
    return;
   }
   if(publication.state==='validating'){
    setStatus('Checked GitHub at '+checkedLabel+'. JSON upload detected; GitHub Actions is validating Revision '+pendingPublicationRevision+'… Next check in 5 seconds.');
    return;
   }
   if(publication.state==='publishing'){
    setStatus('Checked GitHub at '+checkedLabel+'. JSON validation successful; publishing Revision '+pendingPublicationRevision+' to the central SOP… Next check in 5 seconds.');
    return;
   }
   if(publication.state==='failed'){
    setStatus('Checked GitHub at '+checkedLabel+'. SOP publication failed: '+(publication.message||'GitHub Actions could not publish this revision.')+' Edit and Publish options remain available.','error');
    return;
   }
   if(publication.state==='published'){
    setStatus('GitHub Actions has published Revision '+pendingPublicationRevision+'. Verifying the central SOP file…');
    const doc=await fetchLatest();
    if(String(doc.revision)!==String(pendingPublicationRevision)){
     setStatus('GitHub confirms publication. Waiting for central SOP Revision '+pendingPublicationRevision+' to become available; checking again in 5 seconds…');
     return;
    }
    if(typeof doc.html!=='string'||doc.revision==null)throw new Error('The published central SOP JSON is incomplete. Retrying verification in 5 seconds.');
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
   setStatus('Checked GitHub at '+new Date().toLocaleTimeString()+'. '+error.message+' YETI will retry automatically in 5 seconds.','error');
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
   if(editing&&pendingPublicationRevision&&compareRevision(doc.revision,pendingPublicationRevision)>=0){
    setStatus('Central SOP Revision '+doc.revision+' is visible. Waiting for GitHub publication status to confirm completion…');
    return;
   }
   if(editing&&compareRevision(doc.revision,currentRevision)>0&&!pendingPublicationRevision){
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
   if(centralLoaded&&compareRevision(doc.revision,currentRevision)<=0)return;
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
  const updatedAt=new Date().toISOString();
  const revisionBase=updatedAt.slice(0,19).replace(/[-:T]/g,'').replace(/^(\d{8})(\d{6})$/,'$1-$2');
  let revision=revisionBase;
  const currentText=String(currentRevision);
  if(currentText===revisionBase||currentText.startsWith(revisionBase+'-')){
   const suffix=Number(currentText.slice(revisionBase.length+1))||0;
   revision=revisionBase+'-'+String(suffix+1).padStart(2,'0');
  }
  const nextDoc={schemaVersion:1,revision,updatedAt,updatedBy:'Admin '+getAdminId(),html:cleanHtml};
  pendingPublicationRevision=nextDoc.revision;
  pendingPublicationStartedAt=Date.now();
  const blob=new Blob([JSON.stringify(nextDoc,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download='flight-trial-sop.json';document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  publicationRunId=null;
  publicationReloadScheduled=false;
  setStatus('SOP JSON prepared with timestamp revision '+revision+'. Waiting for upload and commit to GitHub. Live publication status will update every 5 seconds.','success');
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
 exportPdfBtn.addEventListener('click',()=>{
  if(document.body.dataset.yetiAuthRole!=='admin')return;
  const source=getArticle();
  if(!source){setStatus('The SOP document is not available for PDF export.','error');return;}
  const printable=source.cloneNode(true);
  printable.contentEditable='false';
  printable.classList.remove('is-editing');
  printable.removeAttribute('contenteditable');
  printable.querySelectorAll('[contenteditable]').forEach(node=>node.removeAttribute('contenteditable'));
  const textLength=(printable.innerText||printable.textContent||'').replace(/\\s+/g,' ').trim().length;
  if(textLength<100){setStatus('PDF export stopped: the SOP content is empty or has not finished loading. Refresh the SOP and try again.','error');return;}
  const printWindow=window.open('','_blank');
  if(!printWindow){setStatus('The PDF export window was blocked. Allow pop-ups for YETI and try again.','error');return;}
  const printCss=`
   @page{size:A4 portrait;margin:14mm}
   *{box-sizing:border-box!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
   html,body{display:block!important;visibility:visible!important;width:100%!important;min-height:0!important;margin:0!important;padding:0!important;background:#fff!important;color:#172536!important}
   body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:1.42}
   article.flight-trial-reading-document{display:block!important;visibility:visible!important;width:100%!important;max-width:none!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;color:#172536!important;opacity:1!important;overflow:visible!important}
   .flight-trial-reading-document *{visibility:visible!important;opacity:1!important}
   .flight-trial-reading-header{display:block!important;text-align:center!important;padding:0 0 5mm!important;margin:0 0 6mm!important;border-bottom:2px solid #174f7d!important;break-after:avoid-page;page-break-after:avoid}
   .flight-trial-reading-header .nav-kicker{display:block!important;color:#00647b!important;font-size:8pt!important;font-weight:bold!important;letter-spacing:2px!important}
   .flight-trial-reading-header h2{display:block!important;font-size:22pt!important;text-align:center!important;margin:2mm 0!important;color:#123b70!important}
   .flight-trial-reading-header h3{display:block!important;font-size:14pt!important;text-align:center!important;margin:0 0 5mm!important;color:#174f7d!important}
   .flight-trial-reading-meta{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:0!important;border:1px solid #9eb2c5!important;text-align:left!important}
   .flight-trial-reading-meta span{display:block!important;padding:2mm!important;border:1px solid #d5e0e9!important;font-size:8pt!important;overflow-wrap:anywhere!important}
   .flight-trial-reading-meta b{display:block!important;color:#fff!important;background:#123b70!important;margin:-2mm -2mm 1mm!important;padding:1.5mm 2mm!important}
   .flight-trial-reading-section{display:block!important;visibility:visible!important;margin:0 0 5mm!important;break-inside:auto!important;page-break-inside:auto!important}
   .flight-trial-reading-section h3{display:block!important;break-after:avoid-page!important;page-break-after:avoid!important;font-size:12pt!important;color:#123b70!important;border-bottom:1px solid #9db4c9!important;padding-bottom:2mm!important}
   .flight-trial-reading-section h4{display:block!important;break-after:avoid-page!important;page-break-after:avoid!important;font-size:10pt!important;color:#174f7d!important}
   .flight-trial-reading-section p,.flight-trial-reading-section li{display:list-item;font-size:9pt!important;line-height:1.4!important}
   .flight-trial-reading-section p{display:block!important}
   .flight-trial-reading-section ul,.flight-trial-reading-section ol{display:block!important;padding-left:6mm!important}
   .flight-trial-reading-table-wrap{display:block!important;width:100%!important;overflow:visible!important;border:0!important}
   .flight-trial-reading-section table{display:table!important;width:100%!important;min-width:0!important;border-collapse:collapse!important;table-layout:fixed!important;font-size:8pt!important}
   .flight-trial-reading-section thead{display:table-header-group!important}
   .flight-trial-reading-section tbody{display:table-row-group!important}
   .flight-trial-reading-section tr{display:table-row!important;break-inside:avoid!important;page-break-inside:avoid!important}
   .flight-trial-reading-section th,.flight-trial-reading-section td{display:table-cell!important;border:1px solid #8b9aaa!important;padding:2mm!important;vertical-align:top!important;overflow-wrap:anywhere!important}
   .flight-trial-reading-section th{background:#e8f0f7!important;color:#173d60!important}
   .flight-trial-reading-note,.flight-trial-reading-warning{display:block!important;break-inside:avoid!important;page-break-inside:avoid!important}
   .flight-trial-reading-footer{display:block!important;padding-top:3mm!important;border-top:1px solid #dce5ee!important;color:#586b7e!important;font-size:8pt!important}
   a{color:inherit!important;text-decoration:none!important}
  `;
  const launchPrint=()=>{
   if(printWindow.closed)return;
   const bodyText=(printWindow.document.body?.innerText||printWindow.document.body?.textContent||'').replace(/\\s+/g,' ').trim();
   if(bodyText.length<100){setStatus('PDF export could not render the SOP content. Please refresh the SOP and try again.','error');printWindow.close();return;}
   const images=[...printWindow.document.images];
   Promise.all(images.map(img=>img.decode?img.decode().catch(()=>{}):Promise.resolve())).then(()=>{
    const doPrint=()=>{if(!printWindow.closed){printWindow.focus();printWindow.print();}};
    if(printWindow.document.fonts?.ready)printWindow.document.fonts.ready.then(doPrint).catch(doPrint);else doPrint();
   });
  };
  printWindow.addEventListener('load',launchPrint,{once:true});
  printWindow.document.open();
  printWindow.document.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>YETI Flight Trial SOP</title><style>'+printCss+'</style></head><body>'+printable.outerHTML+'</body></html>');
  printWindow.document.close();
  // The load listener is registered before writing; this fallback covers browsers
  // that complete the about:blank document load before dispatching the event.
  printWindow.setTimeout(()=>{if(printWindow.document.readyState==='complete')launchPrint();},250);
  setStatus('A4 SOP export is preparing. Choose “Save as PDF” in the print destination to save the document.','success');
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
 // Run one serialized live-sync cycle: refresh the SOP first, then its publication
 // status, and schedule the next cycle five seconds after the current cycle ends.
 // This avoids overlapping interval callbacks and skipped polls during slow requests.
 async function runLiveSync(){
  if(liveSyncRunning)return;
  liveSyncRunning=true;
  try{
   if(document.visibilityState==='visible'){
    await loadLatest();
    if(pendingPublicationRevision)await pollPublicationStatus();
   }
  }finally{
   liveSyncRunning=false;
   if(liveSyncTimer!==null)window.clearTimeout(liveSyncTimer);
   liveSyncTimer=window.setTimeout(runLiveSync,5000);
  }
 }
 function triggerLiveSync(){
  if(liveSyncTimer!==null){window.clearTimeout(liveSyncTimer);liveSyncTimer=null;}
  if(!liveSyncRunning)runLiveSync();
 }
 runLiveSync();
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')triggerLiveSync();});
 window.addEventListener('focus',triggerLiveSync);
 window.addEventListener('pageshow',triggerLiveSync);
})();