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
 const PDFJS_CDNS=[
  {module:'https://cdn.jsdelivr.net/npm/pdfjs-dist@'+PDFJS_VERSION+'/build/pdf.min.mjs',worker:'https://cdn.jsdelivr.net/npm/pdfjs-dist@'+PDFJS_VERSION+'/build/pdf.worker.min.mjs'},
  {module:'https://unpkg.com/pdfjs-dist@'+PDFJS_VERSION+'/build/pdf.min.mjs',worker:'https://unpkg.com/pdfjs-dist@'+PDFJS_VERSION+'/build/pdf.worker.min.mjs'}
 ];
 async function loadPdfJs(){
  let lastError;
  for(const cdn of PDFJS_CDNS){
   try{
    const pdfjs=await import(cdn.module);
    pdfjs.GlobalWorkerOptions.workerSrc=cdn.worker;
    return pdfjs;
   }catch(error){lastError=error;console.warn('YETI SOP PDF.js CDN unavailable:',cdn.module,error);}
  }
  throw lastError||Error('PDF.js could not be loaded from the available CDNs.');
 }
 let pdfDocument=null,pdfZoom=1,pdfRenderGeneration=0,pdfViewer=null,pdfPagesHost=null,pdfStage=null,pdfBaseWidth=0,pdfBaseHeight=0,pdfPageLabel=null,pdfZoomLabel=null,currentPdfPage=1;
 function makeReaderButton(label,action,aria){const b=document.createElement('button');b.type='button';b.className='btn alt';b.textContent=label;b.setAttribute('aria-label',aria||label);b.addEventListener('click',action);return b;}
 async function renderPdfPages(){
  if(!pdfDocument||!pdfPagesHost)return;
  const generation=++pdfRenderGeneration,scroller=pdfStage?.parentElement;
  pdfPagesHost.replaceChildren();pdfPagesHost.style.transform='scale(1)';
  const style=scroller?getComputedStyle(scroller):null;
  const horizontalPadding=style?parseFloat(style.paddingLeft)+parseFloat(style.paddingRight):16;
  const availableWidth=Math.max(280,Math.min((scroller?.clientWidth||pdfPagesHost.clientWidth)-horizontalPadding,1100));
  const width=availableWidth;pdfBaseWidth=width;pdfStage.style.width=width+'px';pdfPagesHost.style.width=width+'px';
  // Render once at 3x CSS resolution. Pinch gestures then scale the existing
  // page layer directly, avoiding expensive PDF.js re-renders while fingers move.
  const renderPixelRatio=3;
  for(let n=1;n<=pdfDocument.numPages;n++){
   if(generation!==pdfRenderGeneration)return;
   const page=await pdfDocument.getPage(n),base=page.getViewport({scale:1}),scale=width/base.width,viewport=page.getViewport({scale});
   const card=document.createElement('section');card.className='yeti-sop-pdf-page';card.id='yetiSopPdfPage'+n;
   const canvas=document.createElement('canvas');canvas.className='yeti-sop-pdf-canvas';canvas.setAttribute('aria-label','SOP page '+n);
   canvas.width=Math.ceil(viewport.width*renderPixelRatio);canvas.height=Math.ceil(viewport.height*renderPixelRatio);canvas.style.width=viewport.width+'px';
   card.appendChild(canvas);pdfPagesHost.appendChild(card);
   const context=canvas.getContext('2d',{alpha:false});context.setTransform(renderPixelRatio,0,0,renderPixelRatio,0,0);
   await page.render({canvasContext:context,viewport}).promise;
  }
  if(generation===pdfRenderGeneration){pdfBaseWidth=width;pdfBaseHeight=Math.max(1,pdfPagesHost.scrollHeight);pdfPagesHost.style.width=pdfBaseWidth+'px';pdfStage.style.width=pdfBaseWidth+'px';pdfStage.style.height=pdfBaseHeight+'px';pdfZoom=1;applyZoom(1);if(pdfZoomLabel)pdfZoomLabel.textContent='100%';}
 }
 async function showPdf(url){
  publishedPdfUrl=url;
  if(legacyArticle)legacyArticle.hidden=true;
  const host=$('flightTrialSopDocumentHost');host.replaceChildren();
  const viewer=document.createElement('section');viewer.id='flightTrialSopPdfViewer';viewer.className='yeti-sop-pdf-viewer';viewer.setAttribute('aria-label','SOP PDF reading view');
  const toolbar=document.createElement('div');toolbar.className='yeti-sop-pdf-toolbar';
  const pageInfo=document.createElement('span');pageInfo.className='yeti-sop-pdf-page-info';pageInfo.textContent='Loading PDF…';
  const zoomInfo=document.createElement('span');zoomInfo.className='yeti-sop-pdf-zoom-info';zoomInfo.textContent='100%';
  const previous=makeReaderButton('Previous',()=>navigatePage(-1),'Previous PDF page'),next=makeReaderButton('Next',()=>navigatePage(1),'Next PDF page');
  function contentPoint(clientX,clientY){
   const rect=scroller.getBoundingClientRect(),style=getComputedStyle(scroller);
   return {x:clientX-rect.left-scroller.clientLeft-parseFloat(style.paddingLeft),y:clientY-rect.top-scroller.clientTop-parseFloat(style.paddingTop)};
  }
  function applyZoom(value){
   pdfZoom=Math.max(.65,Math.min(3,value));
   pdfPagesHost.style.transform='scale('+pdfZoom+')';
   pdfStage.style.width=(pdfBaseWidth*pdfZoom)+'px';pdfStage.style.height=(pdfBaseHeight*pdfZoom)+'px';
   zoomInfo.textContent=Math.round(pdfZoom*100)+'%';
  }
  function zoomAround(value,clientX,clientY){
   const rect=scroller.getBoundingClientRect(),point=contentPoint(Number.isFinite(clientX)?clientX:rect.left+rect.width/2,Number.isFinite(clientY)?clientY:rect.top+rect.height/2);
   const focalX=(scroller.scrollLeft+point.x)/pdfZoom,focalY=(scroller.scrollTop+point.y)/pdfZoom;
   applyZoom(value);
   scroller.scrollLeft=Math.max(0,focalX*pdfZoom-point.x);scroller.scrollTop=Math.max(0,focalY*pdfZoom-point.y);
  }
  const zoomOut=makeReaderButton('−',()=>zoomAround(pdfZoom-.15),'Zoom out'),zoomIn=makeReaderButton('+',()=>zoomAround(pdfZoom+.15),'Zoom in'),fit=makeReaderButton('Fit width',()=>{pdfZoom=1;applyZoom(1);scroller.scrollLeft=0;scroller.scrollTop=0;},'Fit PDF to width');
  const download=makeReaderButton('Open original PDF',()=>window.open(publishedPdfUrl,'_blank','noopener,noreferrer'),'Open original PDF in a new tab');
  function navigatePage(delta){currentPdfPage=Math.max(1,Math.min(pdfDocument?.numPages||1,currentPdfPage+delta));document.getElementById('yetiSopPdfPage'+currentPdfPage)?.scrollIntoView({behavior:'smooth',block:'start'});pageInfo.textContent=currentPdfPage+' / '+(pdfDocument?.numPages||'…')+' pages';}
  toolbar.append(previous,next,pageInfo,zoomOut,zoomInfo,zoomIn,fit,download);
  const scroller=document.createElement('div');scroller.className='yeti-sop-pdf-scroll';scroller.tabIndex=0;scroller.setAttribute('aria-label','Scrollable SOP PDF pages');scroller.style.touchAction='none';
  pdfStage=document.createElement('div');pdfStage.className='yeti-sop-pdf-stage';
  pdfPagesHost=document.createElement('div');pdfPagesHost.className='yeti-sop-pdf-pages';pdfStage.appendChild(pdfPagesHost);scroller.appendChild(pdfStage);
  viewer.append(toolbar,scroller);host.appendChild(viewer);pdfViewer=viewer;pdfPageLabel=pageInfo;pdfZoomLabel=zoomInfo;
  // Match the earlier Daily Airworthiness viewer: pointer-based pinch zoom,
  // focus-point preservation, and one-finger pan. No PDF.js work occurs per move.
  const pointers=new Map();let gesture=null;
  const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2}),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const point=e=>({x:e.clientX,y:e.clientY});
  scroller.addEventListener('pointerdown',e=>{
   if(e.pointerType==='mouse'&&e.button!==0)return;
   try{scroller.setPointerCapture(e.pointerId)}catch(_error){}
   pointers.set(e.pointerId,point(e));const pts=[...pointers.values()];
   if(pts.length===1){gesture={type:'pan',x:pts[0].x,y:pts[0].y,left:scroller.scrollLeft,top:scroller.scrollTop};scroller.classList.add('yeti-sop-pan-active');}
   else if(pts.length===2){const center=midpoint(pts[0],pts[1]),rect=scroller.getBoundingClientRect();const focal=contentPoint(center.x,center.y);gesture={type:'pinch',distance:Math.max(1,distance(pts[0],pts[1])),zoom:pdfZoom,focalX:(scroller.scrollLeft+focal.x)/pdfZoom,focalY:(scroller.scrollTop+focal.y)/pdfZoom};scroller.classList.remove('yeti-sop-pan-active');}
   e.preventDefault();
  });
  scroller.addEventListener('pointermove',e=>{
   if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,point(e));const pts=[...pointers.values()];
   if(pts.length>=2&&gesture?.type==='pinch'){
    const center=midpoint(pts[0],pts[1]),focal=contentPoint(center.x,center.y);applyZoom(gesture.zoom*distance(pts[0],pts[1])/gesture.distance);
    scroller.scrollLeft=Math.max(0,gesture.focalX*pdfZoom-focal.x);scroller.scrollTop=Math.max(0,gesture.focalY*pdfZoom-focal.y);e.preventDefault();
   }else if(pts.length===1&&gesture?.type==='pan'){
    scroller.scrollLeft=gesture.left-(pts[0].x-gesture.x);scroller.scrollTop=gesture.top-(pts[0].y-gesture.y);e.preventDefault();
   }
  });
  const finishPointer=e=>{pointers.delete(e.pointerId);if(pointers.size===0){gesture=null;scroller.classList.remove('yeti-sop-pan-active');}else if(pointers.size===1){const p=[...pointers.values()][0];gesture={type:'pan',x:p.x,y:p.y,left:scroller.scrollLeft,top:scroller.scrollTop};}};
  scroller.addEventListener('pointerup',finishPointer);scroller.addEventListener('pointercancel',finishPointer);scroller.addEventListener('lostpointercapture',finishPointer);
  scroller.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();zoomAround(pdfZoom*Math.exp(-e.deltaY*.002),e.clientX,e.clientY);},{passive:false});
  try{
   const pdfjs=await loadPdfJs();
   // Avoid reusing a cached, partial response for a revisioned PDF URL.
   const response=await fetch(url,{cache:'no-store',credentials:'omit'});
   if(!response.ok)throw Error('Published PDF request failed: HTTP '+response.status+' '+response.statusText);
   const pdfBytes=new Uint8Array(await response.arrayBuffer());
   if(pdfBytes.length<5||String.fromCharCode(...pdfBytes.subarray(0,5))!=='%PDF-')throw Error('The published PDF response is not a valid PDF file.');
   pdfDocument=await pdfjs.getDocument({data:pdfBytes, useWorkerFetch:false, isEvalSupported:false}).promise;
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
  const detail=document.createElement('p');detail.textContent='The published PDF is still available. The browser could not initialize the in-page reader; use the direct PDF link below or retry the reader.';
  const diagnostic=document.createElement('p');diagnostic.className='yeti-sop-pdf-diagnostic';diagnostic.textContent='Reader diagnostic: '+String(error?.message||error||'Unknown PDF reader error').slice(0,260);
  const link=document.createElement('a');link.href=publishedPdfUrl;link.target='_blank';link.rel='noopener';link.textContent='Open published SOP PDF';
  const retry=makeReaderButton('Retry in-page reader',()=>showPdf(publishedPdfUrl),'Retry loading the SOP PDF reader');
  message.append(title,detail,diagnostic,link,retry);host.replaceChildren(message);
  console.error('YETI SOP PDF.js reader failed:',error);
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