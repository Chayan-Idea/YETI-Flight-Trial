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
 const tools=$('flightTrialSopAdminTools'),sessionLabel=$('yetiSessionRole'),readBtn=$('flightTrialSopReadModeBtn'),editBtn=$('flightTrialSopEditModeBtn'),exportBtn=$('flightTrialSopExportPdfBtn');
 const actions=$('flightTrialSopEditActions'),status=$('flightTrialSopStatus'),uploadPanel=$('flightTrialSopTokenPanel'),fileInput=$('flightTrialSopPdfInput'),proceed=$('flightTrialSopProceedBtn'),cancel=$('flightTrialSopCancelBtn'),revisionLabel=$('flightTrialSopRevision');
 let currentRevision='',publishedPdfUrl='',publishedSourceSha='',pollTimer=null,pollBusy=false,pending=false,uploadStartedAt=0,pollStartedAt=0,pendingRevision='',legacyArticle=panel.querySelector('.flight-trial-reading-document');
 const say=(s,type)=>{status.textContent=s;status.classList.toggle('is-success',type==='success');status.classList.toggle('is-error',type==='error');};
 async function getJson(url){
  let last;
  for(const u of [url,RAW+(url===MANIFEST?'data/flight-trial-sop.json':'data/sop-publication-status.json')]){
   try{const r=await fetch(u+(u.includes('?')?'&':'?')+'v='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json();}catch(e){last=e;}
  }throw last||Error('GitHub data unavailable');
 }
 const PDFJS_VERSION='4.10.38';
 const PDFJS_MODULE='https://cdn.jsdelivr.net/npm/pdfjs-dist@'+PDFJS_VERSION+'/build/pdf.min.mjs';
 const PDFJS_WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@'+PDFJS_VERSION+'/build/pdf.worker.min.mjs';
 let pdfDocument=null,pdfZoom=1,pdfRenderGeneration=0,pdfViewer=null,pdfPagesHost=null,pdfPageLabel=null,pdfZoomLabel=null;
 function makeReaderButton(label,action,aria){const b=document.createElement('button');b.type='button';b.className='btn alt';b.textContent=label;b.setAttribute('aria-label',aria||label);b.addEventListener('click',action);return b;}
 async function renderPdfPages(){
  if(!pdfDocument||!pdfPagesHost)return;
  const generation=++pdfRenderGeneration;pdfPagesHost.replaceChildren();
  const width=Math.max(280,Math.min(pdfPagesHost.clientWidth-28,1100));
  for(let n=1;n<=pdfDocument.numPages;n++){
   if(generation!==pdfRenderGeneration)return;
   const page=await pdfDocument.getPage(n),base=page.getViewport({scale:1}),scale=(width/base.width)*pdfZoom,viewport=page.getViewport({scale});
   const card=document.createElement('section');card.className='yeti-sop-pdf-page';card.id='yetiSopPdfPage'+n;
   const canvas=document.createElement('canvas');canvas.className='yeti-sop-pdf-canvas';canvas.setAttribute('aria-label','SOP page '+n);
   const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.ceil(viewport.width*ratio);canvas.height=Math.ceil(viewport.height*ratio);canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
   card.appendChild(canvas);pdfPagesHost.appendChild(card);
   const context=canvas.getContext('2d',{alpha:false});context.setTransform(ratio,0,0,ratio,0,0);
   await page.render({canvasContext:context,viewport}).promise;
  }
 }
 async function showPdf(url){
  publishedPdfUrl=url;
  if(legacyArticle)legacyArticle.hidden=true;
  const host=$('flightTrialSopDocumentHost');host.replaceChildren();
  const viewer=document.createElement('section');viewer.id='flightTrialSopPdfViewer';viewer.className='yeti-sop-pdf-viewer';viewer.setAttribute('aria-label','SOP PDF reading view');
  const toolbar=document.createElement('div');toolbar.className='yeti-sop-pdf-toolbar';
  const pageInfo=document.createElement('span');pageInfo.className='yeti-sop-pdf-page-info';pageInfo.textContent='Loading PDF…';
  const zoomInfo=document.createElement('span');zoomInfo.className='yeti-sop-pdf-zoom-info';zoomInfo.textContent='100%';
  const previous=makeReaderButton('Previous','', 'Previous PDF page'),next=makeReaderButton('Next','', 'Next PDF page');
  const zoomOut=makeReaderButton('−',()=>changeZoom(-0.15),'Zoom out'),zoomIn=makeReaderButton('+',()=>changeZoom(0.15),'Zoom in'),fit=makeReaderButton('Fit width',()=>{pdfZoom=1;zoomInfo.textContent='100%';renderPdfPages().catch(readerError);},'Fit PDF to width');
  function changeZoom(delta){pdfZoom=Math.max(.65,Math.min(2.2,Math.round((pdfZoom+delta)*100)/100));zoomInfo.textContent=Math.round(pdfZoom*100)+'%';renderPdfPages().catch(readerError);}
  const download=makeReaderButton('Open original PDF',()=>window.open(publishedPdfUrl,'_blank','noopener,noreferrer'),'Open original PDF in a new tab');
  previous.addEventListener('click',()=>{const current=Math.max(1,Number((location.hash.match(/sop-page-(\d+)/)||[])[1]||1)-1);document.getElementById('yetiSopPdfPage'+current)?.scrollIntoView({behavior:'smooth',block:'start'});});
  next.addEventListener('click',()=>{const current=Math.max(1,Number((location.hash.match(/sop-page-(\d+)/)||[])[1]||1)+1);document.getElementById('yetiSopPdfPage'+current)?.scrollIntoView({behavior:'smooth',block:'start'});});
  toolbar.append(previous,next,pageInfo,zoomOut,zoomInfo,zoomIn,fit,download);
  const scroller=document.createElement('div');scroller.className='yeti-sop-pdf-scroll';scroller.tabIndex=0;scroller.setAttribute('aria-label','Scrollable SOP PDF pages');
  pdfPagesHost=document.createElement('div');pdfPagesHost.className='yeti-sop-pdf-pages';scroller.appendChild(pdfPagesHost);
  viewer.append(toolbar,scroller);host.appendChild(viewer);pdfViewer=viewer;pdfPageLabel=pageInfo;pdfZoomLabel=zoomInfo;
  try{
   const pdfjs=await import(PDFJS_MODULE);pdfjs.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
   pdfDocument=await pdfjs.getDocument({url,withCredentials:false}).promise;
   pageInfo.textContent='1 / '+pdfDocument.numPages+' pages';
   await renderPdfPages();
   if('IntersectionObserver'in window){
    const observer=new IntersectionObserver(entries=>{const visible=entries.filter(x=>x.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(visible){const n=Number(visible.target.id.replace('yetiSopPdfPage',''));pageInfo.textContent=n+' / '+pdfDocument.numPages+' pages';}}, {root:scroller,threshold:.25});
    pdfPagesHost.querySelectorAll('.yeti-sop-pdf-page').forEach(el=>observer.observe(el));
   }
  }catch(error){readerError(error);}
 }
 function readerError(error){
  const host=$('flightTrialSopDocumentHost');const message=document.createElement('div');message.className='yeti-sop-pdf-error';
  const title=document.createElement('strong');title.textContent='The in-page PDF reader could not load.';
  const detail=document.createElement('p');detail.textContent='Check your internet connection and reload this page. The published SOP is safe; you can also open the original PDF directly.';
  const link=document.createElement('a');link.href=publishedPdfUrl;link.target='_blank';link.rel='noopener';link.textContent='Open published SOP PDF';
  message.append(title,detail,link);host.replaceChildren(message);console.error('YETI SOP PDF.js reader:',error);
 }
 async function loadPublished(){
  try{
   const doc=await getJson(MANIFEST);
   if(doc.schemaVersion===2&&doc.pdfUrl&&doc.revision){
    if(String(doc.revision)!==currentRevision||!publishedPdfUrl){currentRevision=String(doc.revision);publishedSourceSha=String(doc.sourceSha256||'');showPdf(new URL(doc.pdfUrl,BASE).href);if(revisionLabel){revisionLabel.hidden=false;revisionLabel.textContent='Revision '+doc.revision+' · '+(doc.updatedAt?new Date(doc.updatedAt).toLocaleString():'Published')+' · '+(doc.updatedBy||'Admin');}}
    // Reconcile the visible status with GitHub's authoritative publication state.
    // A previous failed attempt must not leave a red banner after a later matching
    // revision has been successfully published.
    try{
     const publication=await getJson(STATUS);
     const isCurrentPublication=publication.state==='published'
      &&String(publication.packageSha256||'')===String(doc.sourceSha256||'')
      &&String(publication.revision||'')===String(doc.revision);
     if(isCurrentPublication&&status.classList.contains('is-error')){
      say('Published SOP revision verified successfully. The shared PDF is up to date.','success');
     }
    }catch(_){/* The manifest remains authoritative for reading when status is temporarily unavailable. */}
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
  if(Date.now()-pollStartedAt>15*60*1000){pending=false;proceed.disabled=false;say('No completed GitHub publication was detected within 15 minutes. Your previous published SOP remains active. Check the GitHub Actions run, then retry.','error');return;}
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
   if(s.state==='published'&&String(s.packageSha256||'')===pendingRevision){
    say('GitHub published the new PDF. Verifying the shared reading copy…');
    const ok=await loadPublished();
    if(ok&&publishedPdfUrl&&publishedSourceSha===pendingRevision){pending=false;stopPolling();uploadPanel.hidden=true;actions.hidden=true;readBtn.classList.add('is-active');editBtn.classList.remove('is-active');say('New SOP PDF published and verified. The webpage will refresh automatically to load the shared revision.','success');setTimeout(()=>location.reload(),1800);return;}
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
 fileInput.addEventListener('change',async()=>{
  const f=fileInput.files&&fileInput.files[0];
  if(!f)return;
  if(f.type!=='application/pdf'&&!f.name.toLowerCase().endsWith('.pdf')){fileInput.value='';proceed.disabled=true;say('Only PDF documents are accepted.','error');return;}
  if(f.size<100||f.size>25*1024*1024){fileInput.value='';proceed.disabled=true;say('PDF size must be between 100 bytes and 25 MB.','error');return;}
  const head=new Uint8Array(await f.slice(0,5).arrayBuffer());
  if(String.fromCharCode(...head)!=='%PDF-'){fileInput.value='';proceed.disabled=true;say('The selected file does not have a valid PDF signature.','error');return;}
  proceed.disabled=false;say('Selected: '+f.name+' · '+(f.size/1024/1024).toFixed(2)+' MB. Click Proceed and Update in the Webpage to continue.');
 });
 proceed.addEventListener('click',async()=>{
  const f=fileInput.files&&fileInput.files[0];
  if(!f){say('Select a PDF reference document first.','error');return;}
  if(document.body.dataset.yetiAuthRole!=='admin'){say('Admin login is required.','error');return;}
  proceed.disabled=true;
  try{
   const bytes=new Uint8Array(await f.arrayBuffer());
   const digest=await crypto.subtle.digest('SHA-256',bytes);
   const sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
   let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
   const packageDoc={schemaVersion:1,packageType:'yeti-flight-trial-sop-pdf',fileName:'flight-trial-sop.pdf',mimeType:'application/pdf',sizeBytes:bytes.length,sha256,generatedAt:new Date().toISOString(),pdfBase64:btoa(binary)};
   const blob=new Blob([JSON.stringify(packageDoc,null,2)],{type:'application/json'});
   if(blob.size>25*1024*1024)throw Error('Generated JSON package exceeds GitHub upload limit. Please use a PDF smaller than approximately 18 MB.');
   const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='flight-trial-sop.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),30000);
   uploadStartedAt=Date.now();pollStartedAt=Date.now();pending=true;pendingRevision=sha256;
   say('JSON publication package generated and downloaded. Upload flight-trial-sop.json into the pending-sop folder on GitHub and commit it to main. This page will monitor publication every 5 seconds. The current SOP remains active until the new revision is published.');
   window.open('https://github.com/'+OWNER+'/'+REPO+'/upload/main/pending-sop','_blank','noopener,noreferrer');
   poll();
  }catch(e){proceed.disabled=false;say('Could not generate the JSON publication package: '+e.message,'error');}

 });
 
 exportBtn.addEventListener('click',()=>{
  if(!publishedPdfUrl){say('A PDF revision has not yet been published. The legacy reading copy is currently displayed.','error');return;}
  const a=document.createElement('a');a.href=publishedPdfUrl;a.target='_blank';a.rel='noopener';a.click();
 });
 function roleUpdate(){
  const bodyRole=(document.body.dataset.yetiAuthRole||'').trim().toLowerCase();
  const visibleRole=(sessionLabel?.textContent||'').trim().toUpperCase();
  const admin=bodyRole==='admin'||visibleRole==='ADMIN SESSION';
  if(tools)tools.hidden=!admin;
  if(!admin){uploadPanel.hidden=true;actions.hidden=true;}
  if(admin&&tools){tools.hidden=false;}
 }
 new MutationObserver(roleUpdate).observe(document.body,{attributes:true,attributeFilter:['data-yeti-auth-role']});
 document.addEventListener('yeti:auth-role-changed',roleUpdate);
 // Re-evaluate after DOM readiness and on window focus to avoid login/script timing races.
 roleUpdate();
 document.addEventListener('DOMContentLoaded',roleUpdate,{once:true});
 window.addEventListener('focus',roleUpdate);
 loadPublished();
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){loadPublished();if(pending)poll();}});
 window.addEventListener('focus',()=>{loadPublished();if(pending)poll();});
})();