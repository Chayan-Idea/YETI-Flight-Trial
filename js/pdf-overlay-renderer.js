/* Original-PDF overlay renderer. The source PDF is never reconstructed or restyled. */
(function(root){
 'use strict';
 let pdfJsPromise=null,pdfLibPromise=null;
 function loadScript(url,test){
  if(test())return Promise.resolve();
  return new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=url;script.async=true;
   script.onload=()=>test()?resolve():reject(new Error('Library loaded without expected API.'));
   script.onerror=()=>reject(new Error('Could not load PDF rendering library.'));
   document.head.appendChild(script);
  });
 }
 async function libraries(){
  if(!pdfJsPromise)pdfJsPromise=loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',()=>!!root.pdfjsLib).then(()=>{root.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';return root.pdfjsLib});
  if(!pdfLibPromise)pdfLibPromise=loadScript('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',()=>!!root.PDFLib).then(()=>root.PDFLib);
  return Promise.all([pdfJsPromise,pdfLibPromise]);
 }
 function drawMark(ctx,x,y,scale){
  ctx.beginPath();ctx.lineWidth=Math.max(1,1.15*scale);ctx.lineCap='round';ctx.strokeStyle='#111';
  ctx.moveTo((x-2.2)*scale,(y+.2)*scale);ctx.lineTo((x-.5)*scale,(y+2)*scale);ctx.lineTo((x+2.7)*scale,(y-2.3)*scale);ctx.stroke();
 }
 async function renderPreview(container,candidate,manifest,answers,trialInfo){
  const [pdfjs]=await libraries();container.innerHTML='';
  const pdf=await pdfjs.getDocument({data:candidate.pdfBytes.slice(0)}).promise;
  for(let index=1;index<=pdf.numPages;index++){
   const page=await pdf.getPage(index),base=page.getViewport({scale:1});
   const width=Math.max(600,container.clientWidth||1000),scale=width/base.width,viewport=page.getViewport({scale});
   const wrap=document.createElement('div');wrap.className='yeti-pdf-source-page';wrap.style.cssText='position:relative;width:100%;max-width:'+viewport.width+'px;margin:0 auto 18px;background:#fff;box-shadow:0 2px 12px #0002';
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.style.cssText='display:block;width:100%;height:auto';
   const overlay=document.createElement('canvas');overlay.width=canvas.width;overlay.height=canvas.height;overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
   wrap.append(canvas,overlay);container.appendChild(wrap);
   await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   const ctx=overlay.getContext('2d'),m=scale;
   Object.entries(answers||{}).forEach(([id,answer])=>{
    const anchor=root.YETI_PDF_COORDINATE_MAPPER.getCheckpointAnchors(manifest,id);if(!anchor||anchor.page!==index)return;
    const key=answer.status==='Pass'?'pass':answer.status==='Fail'?'fail':answer.status==='Not Available'?'notAvailable':null;
    if(key){const point=anchor[key];drawMark(ctx,point.x,point.y,m)}
    if(answer.remarks){ctx.fillStyle='#111';ctx.font=(5.2*m)+'px Arial';ctx.fillText(String(answer.remarks).slice(0,90),manifest.columns.remarksLeft*m,(anchor.pass.y+1.8)*m, (manifest.columns.remarksRight-manifest.columns.remarksLeft-3)*m)}
   });
   const header=manifest.header||{};
   [['trialPhase',trialInfo?.phase],['trialStage',trialInfo?.stage],['flightPlace',trialInfo?.place],['flightDate',trialInfo?.date]].forEach(([key,value])=>{const p=header[key];if(value&&p?.page===index){ctx.fillStyle='#111';ctx.font=6.2*m+'px Arial';ctx.fillText(String(value),p.x*m,p.y*m)}});
  }
 }
 async function exportPdf(candidate,manifest,answers,trialInfo,signature){
  const [,PDFLib]=await libraries(),doc=await PDFLib.PDFDocument.load(candidate.pdfBytes.slice(0)),font=await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const pages=doc.getPages();
  const drawText=(page,text,x,y,size=6)=>{if(text!==undefined&&text!==null&&String(text).trim())page.drawText(String(text).slice(0,180),{x,y,size,font,color:PDFLib.rgb(0.05,0.05,0.05),maxWidth:190})};
  for(const [id,answer] of Object.entries(answers||{})){
   const anchor=root.YETI_PDF_COORDINATE_MAPPER.getCheckpointAnchors(manifest,id);if(!anchor)continue;
   const page=pages[anchor.page-1],h=manifest.page.height;
   const key=answer.status==='Pass'?'pass':answer.status==='Fail'?'fail':answer.status==='Not Available'?'notAvailable':null;
   if(key){const p=anchor[key],x=p.x,y=h-p.y;page.drawLine({start:{x:x-2,y:y-1},end:{x:x-.5,y:y-2.5},thickness:1.1,color:PDFLib.rgb(0,0,0)});page.drawLine({start:{x:x-.5,y:y-2.5},end:{x:x+2.8,y:y+2.1},thickness:1.1,color:PDFLib.rgb(0,0,0)})}
   if(answer.remarks){const p=anchor.remarks;drawText(page,answer.remarks,p.x,h-p.y-2,5.3)}
  }
  const header=manifest.header||{},fields=[['trialPhase',trialInfo?.phase],['trialStage',trialInfo?.stage],['flightPlace',trialInfo?.place],['flightDate',trialInfo?.date]];
  for(const [key,value] of fields){const p=header[key];if(value&&p){drawText(pages[p.page-1],value,p.x,manifest.page.height-p.y-5,6.2)}}
  if(signature){const image=await doc.embedPng(signature),box=manifest.specialFields?.checkerReviewer;if(box){pages[box.page-1].drawImage(image,{x:box.x,y:manifest.page.height-box.y-box.height,width:Math.min(box.width,image.width/3),height:Math.min(box.height,image.height/3)})}}
  return await doc.save();
 }
 root.YETI_PDF_OVERLAY_RENDERER=Object.freeze({libraries,renderPreview,exportPdf});
})(window);
