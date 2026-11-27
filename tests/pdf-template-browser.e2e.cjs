const { chromium } = require('playwright');
const { loginToYeti } = require('./helpers/yeti-login.cjs');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.pdf':'application/pdf','.webmanifest':'application/manifest+json'};
const server = http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const target=path.resolve(root,pathname==='/'?'./index.html':'.'+pathname);
  if(!target.startsWith(root)||!fs.existsSync(target)||fs.statSync(target).isDirectory()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});
  fs.createReadStream(target).pipe(res);
});

(async()=>{
 let browser,page;
 const pageErrors=[],consoleErrors=[],failedRequests=[];
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  page.on('requestfailed',r=>failedRequests.push({url:r.url(),error:r.failure()?.errorText||'failed'}));
  const response=await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'networkidle'});
  await loginToYeti(page, 'user');
  if(!response?.ok())throw new Error('YETI staging shell failed to load');
  await page.waitForFunction(()=>{const active=window.YETI_ACTIVE_PDF_TEMPLATE;return active&&document.querySelectorAll('#list .item').length===active.validation.checkpointCount},{timeout:15000});
  await page.locator('#dailyTabBtn').click();
  await page.locator('#expand').click();
  if(await page.locator('#previewBtn').count()!==0)throw new Error('Manual Update PDF Preview button must not exist');
  await page.waitForFunction(()=>document.querySelectorAll('#previewContent .yeti-pdf-source-page').length===window.YETI_ACTIVE_PDF_TEMPLATE.package.document.pageCount,{timeout:20000});
  await page.locator('#list select[data-id="2.1"][data-k="status"]').selectOption('Pass');
  await page.waitForFunction(()=>{const a=window.YETI_ACTIVE_PDF_TEMPLATE,canvas=document.querySelector('#previewContent .yeti-pdf-source-page canvas:nth-child(2)'),anchors=window.YETI_PDF_COORDINATE_MAPPER.getCheckpointAnchors(a.package.template,'2.1'),sx=canvas.width/a.package.template.page.width,sy=canvas.height/a.package.template.page.height,x=Math.round((anchors.pass.x-8)*sx),y=Math.round(anchors.pass.y*sy),d=canvas.getContext('2d').getImageData(x,y,1,1).data;return d[1]>90&&d[1]>d[0]*2},{timeout:8000});
  await page.locator('#list select[data-id="2.1"][data-k="status"]').selectOption('Fail');
  await page.waitForFunction(()=>{const a=window.YETI_ACTIVE_PDF_TEMPLATE,canvas=document.querySelector('#previewContent .yeti-pdf-source-page canvas:nth-child(2)'),anchors=window.YETI_PDF_COORDINATE_MAPPER.getCheckpointAnchors(a.package.template,'2.1'),sx=canvas.width/a.package.template.page.width,sy=canvas.height/a.package.template.page.height,x=Math.round((anchors.fail.x-8)*sx),y=Math.round(anchors.fail.y*sy),d=canvas.getContext('2d').getImageData(x,y,1,1).data;return d[0]>90&&d[0]>d[1]*2},{timeout:8000});
  await page.locator('#list input[data-id="2.1"][data-k="remarks"]').fill('LIVE REMARK TEST');
  await page.waitForFunction(()=>{const a=window.YETI_ACTIVE_PDF_TEMPLATE,canvas=document.querySelector('#previewContent .yeti-pdf-source-page canvas:nth-child(2)'),anchors=window.YETI_PDF_COORDINATE_MAPPER.getCheckpointAnchors(a.package.template,'2.1'),sx=canvas.width/a.package.template.page.width,sy=canvas.height/a.package.template.page.height,x=Math.round((anchors.remarksBounds.x+3)*sx),y=Math.round(anchors.row.centerY*sy),d=canvas.getContext('2d').getImageData(x,y-5,160,10).data;return d.some((v,i)=>i%4===3&&v>0)},{timeout:8000});
  await page.locator('#trialPhase').fill('LIVE PHASE TEST');
  await page.waitForFunction(()=>{const a=window.YETI_ACTIVE_PDF_TEMPLATE,canvas=document.querySelector('#previewContent .yeti-pdf-source-page canvas:nth-child(2)'),b=a.package.template.header.trialPhase,sx=canvas.width/a.package.template.page.width,sy=canvas.height/a.package.template.page.height,x=Math.round((b.x+3)*sx),y=Math.round((b.y+(b.height||6)/2)*sy),d=canvas.getContext('2d').getImageData(x,y-5,180,10).data;return d.some((v,i)=>i%4===3&&v>0)},{timeout:8000});
  const result=await page.evaluate(async()=>{
   const loader=window.YETI_PDF_TEMPLATE_PACKAGE,renderer=window.YETI_PDF_OVERLAY_RENDERER;
   if(!loader||!renderer)throw new Error('PDF template loader or renderer is missing');
   if(!window.YETI_ACTIVE_PDF_TEMPLATE||window.YETI_ACTIVE_PDF_TEMPLATE.package.activation.status!=='approved')throw new Error('Approved master PDF did not become the active webpage template');
   if(document.querySelectorAll('#list .item').length!==window.YETI_ACTIVE_PDF_TEMPLATE.validation.checkpointCount)throw new Error('The 01B user interaction section does not display every extracted checklist checkpoint');
   if(document.querySelectorAll('#previewContent .yeti-pdf-source-page').length!==2)throw new Error('The webpage preview is not using the exact original PDF pages');
   const candidate=await loader.load(window.YETI_DAILY_AIRWORTHINESS_PDF_PACKAGE_URL);
   const pkg=candidate.package;
   if(!candidate.validation.valid)throw new Error('Candidate package did not validate');
   if(candidate.validation.checkpointCount!==window.YETI_ACTIVE_PDF_TEMPLATE.validation.checkpointCount)throw new Error('User interaction count does not match the approved PDF package');
   const [pdfjs]=await renderer.libraries();
   const original=await pdfjs.getDocument({data:candidate.pdfBytes.slice(0)}).promise;
   if(original.numPages!==2)throw new Error('Master PDF must contain exactly two original pages');
   const originalText=[];
   for(let i=1;i<=original.numPages;i++){const p=await original.getPage(i);const t=await p.getTextContent();originalText.push(t.items.map(x=>x.str).join(' '))}
   const sig=document.createElement('canvas');sig.width=600;sig.height=100;
   const sctx=sig.getContext('2d');sctx.strokeStyle='#10243b';sctx.lineWidth=7;sctx.lineCap='round';sctx.beginPath();sctx.moveTo(25,65);sctx.bezierCurveTo(120,5,180,95,260,35);sctx.bezierCurveTo(340,0,420,95,570,30);sctx.stroke();
   const signature=sig.toDataURL('image/png');
   const photos=[];
   for(let i=0;i<5;i++){const c=document.createElement('canvas');c.width=240;c.height=160;const x=c.getContext('2d');x.fillStyle=['#d22','#2a5','#26c','#da2','#927'][i];x.fillRect(0,0,240,160);x.fillStyle='#fff';x.font='bold 24px Arial';x.fillText('QA PHOTO '+(i+1),18,85);photos.push({name:'QA PHOTO '+(i+1),category:'daily',data:c.toDataURL('image/png')})}
   const mount=document.createElement('div');mount.id='pdf-e2e-mount';mount.style.width='1100px';document.body.appendChild(mount);
   await renderer.renderPreview(mount,candidate,pkg.template,signature,photos);
   const sourcePages=mount.querySelectorAll('.yeti-pdf-source-page').length;
   const photoPages=mount.querySelectorAll('.yeti-pdf-photo-page').length;
   const overlay=mount.querySelectorAll('.yeti-pdf-source-page')[1].querySelector('canvas:nth-child(2)');
   const overlayData=overlay.getContext('2d').getImageData(0,0,overlay.width,overlay.height).data;
   let overlayPixels=0,minX=overlay.width,minY=overlay.height,maxX=-1,maxY=-1;for(let y=0;y<overlay.height;y++)for(let x=0;x<overlay.width;x++){const alpha=overlayData[(y*overlay.width+x)*4+3];if(alpha>0){overlayPixels++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}}
   const signatureScale=overlay.width/pkg.template.page.width,signatureCell=pkg.template.specialFields.checkerReviewer,signatureBox={left:signatureCell.x*signatureScale,top:signatureCell.y*signatureScale,right:(signatureCell.x+signatureCell.width)*signatureScale,bottom:(signatureCell.y+signatureCell.height)*signatureScale};
   if(overlayPixels>0&&(minX<signatureBox.left-2||minY<signatureBox.top-2||maxX>signatureBox.right+2||maxY>signatureBox.bottom+2))throw new Error('Signature preview is outside the Checker + Reviewer cell: '+JSON.stringify({minX,minY,maxX,maxY,signatureBox}));
   if(sourcePages!==2||photoPages!==2)throw new Error('Preview must show 2 source pages plus 2 Photo Evidence pages; got '+sourcePages+' + '+photoPages);
   if(overlayPixels<10)throw new Error('Checker/Reviewer signature was not drawn in preview');
   const qaAnswers={'2.1':{status:'Fail',remarks:'QA REMARK EXPORT'},'4.9.1':{status:'Pass'},'6.1':{values:{hvVoltage:'600 V',minCellVoltage:'3.4 V'}},'6.2':{values:{pduSoc:'88%'}}};
   const qaTrialInfo={phase:'QA TRIAL PHASE',stage:'QA TRIAL STAGE',place:'QA FLIGHT PLACE',date:'2026-11-20'};
   const exported=await renderer.exportPdf(candidate,pkg.template,signature,photos,qaAnswers,qaTrialInfo);
   const finalPdf=await pdfjs.getDocument({data:exported}).promise;
   if(finalPdf.numPages!==4)throw new Error('Export must contain 2 original pages + 2 photo pages; got '+finalPdf.numPages);
   const finalText=[];
   for(let i=1;i<=finalPdf.numPages;i++){const p=await finalPdf.getPage(i);const t=await p.getTextContent();finalText.push(t.items.map(x=>x.str).join(' '))}
   if(!finalText[0].includes(originalText[0].slice(0,30).trim())||!finalText[1].includes(originalText[1].slice(0,30).trim()))throw new Error('Original PDF text/content was not preserved on its source pages');
   if(finalText.slice(0,2).some(t=>/QA PRIVATE STATUS MARKER|QA PRIVATE REMARK MARKER|QA TRIAL METADATA MARKER/.test(t)))throw new Error('Test-only markers leaked onto the source pages during the clean-template export');
   if(!finalText[0].includes('FAIL')||!finalText[0].includes('QA REMARK EXPORT')||!finalText[0].includes('QA TRIAL PHASE'))throw new Error('Exported status, centred remarks or trial metadata is missing from the original PDF cells');
   if(!finalText[1].includes('PASS')||!finalText[1].includes('600 V')||!finalText[1].includes('3.4 V')||!finalText[1].includes('88%'))throw new Error('Exported second-page status or battery/PDU values are missing from their mapped cells: '+finalText[1]);
   if((finalText[1].match(/600 V/g)||[]).length!==1||(finalText[1].match(/3.4 V/g)||[]).length!==1||(finalText[1].match(/88%/g)||[]).length!==1)throw new Error('Mapped special-field values were duplicated in the Remarks column');
   if(!finalText[2].includes('PHOTO EVIDENCE')||!finalText[3].includes('PHOTO EVIDENCE'))throw new Error('Exported Photo Evidence page headings are missing');
   if(!finalText[2].includes('QA PHOTO 1')||!finalText[3].includes('QA PHOTO 5'))throw new Error('Photo Evidence captions are missing or incorrectly paginated');
   const loadingPhoto={name:'QA LOADING PHOTO MUST NOT EXPORT',category:'loading',data:photos[0].data};
   const filtered=renderer.safePhotos([...photos,loadingPhoto]);
   if(filtered.length!==5||filtered.some(p=>p.category==='loading'))throw new Error('Loading/unloading photos must be excluded from Daily Airworthiness Photo Evidence');
   const candidateStatus=pkg.activation.status;
   return {templateId:pkg.document.templateId,packageStatus:candidateStatus,checksumVerified:true,checkpointCount:candidate.validation.checkpointCount,originalPdfPages:original.numPages,previewSourcePages:sourcePages,previewPhotoPages:photoPages,signaturePreviewPixels:overlayPixels,exportedPages:finalPdf.numPages,exportPhotoCaptions:[finalText[2],finalText[3]]};
  });
  if(result.packageStatus!=='approved')throw new Error('Browser test must verify the approved master PDF package');
  if(pageErrors.length||consoleErrors.length||failedRequests.length)throw new Error('Browser errors: '+JSON.stringify({pageErrors,consoleErrors,failedRequests}));
  console.log('PDF STAGING BROWSER TEST PASSED '+JSON.stringify(result));
 }catch(error){console.error('[PDF STAGING BROWSER TEST FAILED]',error.stack||error);console.error('[PAGE ERRORS]',JSON.stringify(pageErrors));console.error('[CONSOLE ERRORS]',JSON.stringify(consoleErrors));console.error('[FAILED REQUESTS]',JSON.stringify(failedRequests));if(page){try{await page.screenshot({path:'/tmp/yeti-pdf-failure.png',fullPage:true});console.error('[SCREENSHOT] /tmp/yeti-pdf-failure.png')}catch(captureError){console.error('[SCREENSHOT CAPTURE FAILED]',captureError.message)}}process.exitCode=1}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})();
