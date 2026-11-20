/* Original-PDF renderer with a strict export whitelist:
 * source PDF + signature + daily photo evidence only.
 * Checklist marks, remarks, metadata and all other answers are never rendered.
 */
(function(root){
 'use strict';
 let pdfJsPromise=null,pdfLibPromise=null;
 function loadScript(url,test){
  if(test())return Promise.resolve();
  return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=url;script.async=true;script.onload=()=>test()?resolve():reject(new Error('PDF library API unavailable.'));script.onerror=()=>reject(new Error('PDF library failed to load.'));document.head.appendChild(script)});
 }
 async function libraries(){
  if(!pdfJsPromise)pdfJsPromise=loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',()=>!!root.pdfjsLib).then(()=>{root.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';return root.pdfjsLib});
  if(!pdfLibPromise)pdfLibPromise=loadScript('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',()=>!!root.PDFLib).then(()=>root.PDFLib);
  return Promise.all([pdfJsPromise,pdfLibPromise]);
 }
 function dataBytes(data){const raw=String(data||'').split(',')[1];if(!raw)throw new Error('Invalid image data.');const binary=atob(raw),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes}
 function mimeOf(data){return /^data:image\/jpe?g/i.test(data)?'jpg':/^data:image\/png/i.test(data)?'png':null}
 function safePhotos(photos){return (Array.isArray(photos)?photos:[]).filter(p=>p&&typeof p.data==='string'&&mimeOf(p.data)&&((p.category||'daily')==='daily'))}
 function signatureBox(manifest){return manifest?.specialFields?.checkerReviewer||null}
 function drawSignaturePreview(ctx,signature,manifest,pageIndex,scale){
  const box=signatureBox(manifest);if(!signature||!box||box.page!==pageIndex)return Promise.resolve();
  return new Promise(resolve=>{const img=new Image();img.onload=()=>{const maxW=box.width*scale,maxH=box.height*scale,fit=Math.min(maxW/img.width,maxH/img.height),w=img.width*fit,h=img.height*fit;ctx.drawImage(img,(box.x*scale)+(maxW-w)/2,(box.y*scale)+(maxH-h)/2,w,h);resolve()};img.onerror=resolve;img.src=signature});
 }
 function photoPage(container,photos,width,height){
  const page=document.createElement('section');page.className='yeti-pdf-photo-page';
  page.style.cssText='position:relative;box-sizing:border-box;width:'+width+'px;height:'+height+'px;max-width:100%;margin:0 auto 18px;padding:3.5%;background:#fff;border:1px solid #bbb;box-shadow:0 2px 12px #0002;color:#111;font-family:Arial,sans-serif';
  const title=document.createElement('div');title.textContent='PHOTO EVIDENCE';title.style.cssText='font-size:18px;font-weight:700;text-align:center;margin:0 0 2.5%';
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:2%;height:88%';
  photos.forEach((photo,index)=>{const cell=document.createElement('div');cell.style.cssText='border:1px solid #777;min-width:0;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1%;overflow:hidden';const img=document.createElement('img');img.src=photo.data;img.alt=photo.name||'Photo evidence '+(index+1);img.style.cssText='width:100%;height:85%;object-fit:contain';const caption=document.createElement('div');caption.textContent=photo.name||('Photo '+(index+1));caption.style.cssText='font-size:10px;text-align:center;max-width:100%;overflow-wrap:anywhere;padding-top:4px';cell.append(img,caption);grid.appendChild(cell)});
  page.append(title,grid);container.appendChild(page);
 }
 function appendSignaturePreview(container,signature,width,height){
  const page=document.createElement('section');page.className='yeti-pdf-signature-page';
  page.style.cssText='box-sizing:border-box;width:'+width+'px;height:'+height+'px;max-width:100%;margin:0 auto 18px;padding:5%;background:#fff;border:1px solid #bbb;box-shadow:0 2px 12px #0002;color:#111;font-family:Arial,sans-serif;display:flex;flex-direction:column';
  const title=document.createElement('h2');title.textContent='CHECKER / REVIEWER SIGNATURE';title.style.cssText='text-align:center;font-size:18px;margin:0 0 8%';
  const slot=document.createElement('div');slot.style.cssText='flex:1;border:1px solid #777;display:flex;align-items:center;justify-content:center;padding:4%';
  const image=document.createElement('img');image.src=signature;image.alt='Saved Checker / Reviewer signature';image.style.cssText='max-width:90%;max-height:90%;object-fit:contain';slot.appendChild(image);
  const note=document.createElement('p');note.textContent='Signature record appended because this PDF has no reviewed signature-cell mapping.';note.style.cssText='font-size:10px;text-align:center;color:#555;margin:3% 0 0';
  page.append(title,slot,note);container.appendChild(page);
 }
 async function renderPreview(container,candidate,manifest,signature,photos){
  const [pdfjs]=await libraries();container.innerHTML='';
  const pdf=await pdfjs.getDocument({data:candidate.pdfBytes.slice(0)}).promise;
  let pageWidth=0,pageHeight=0;
  for(let index=1;index<=pdf.numPages;index++){
   const page=await pdf.getPage(index),base=page.getViewport({scale:1});
   const width=Math.max(600,container.clientWidth||1000),scale=width/base.width,viewport=page.getViewport({scale});pageWidth=viewport.width;pageHeight=viewport.height;
   const wrap=document.createElement('div');wrap.className='yeti-pdf-source-page';wrap.style.cssText='position:relative;width:100%;max-width:'+viewport.width+'px;margin:0 auto 18px;background:#fff;box-shadow:0 2px 12px #0002';
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.style.cssText='display:block;width:100%;height:auto';
   const overlay=document.createElement('canvas');overlay.width=canvas.width;overlay.height=canvas.height;overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
   wrap.append(canvas,overlay);container.appendChild(wrap);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   if(signature&&signatureBox(manifest)?.page===index)await drawSignaturePreview(overlay.getContext('2d'),signature,manifest,index,scale);
  }
  if(signature&&!signatureBox(manifest)&&manifest?.signatureMode==='append-signature-page')appendSignaturePreview(container,signature,pageWidth,pageHeight);
  const cleanPhotos=safePhotos(photos);
  for(let i=0;i<cleanPhotos.length;i+=4)photoPage(container,cleanPhotos.slice(i,i+4),pageWidth,pageHeight);
 }
 async function exportPdf(candidate,manifest,signature,photos){
  const [,PDFLib]=await libraries(),doc=await PDFLib.PDFDocument.load(candidate.pdfBytes.slice(0)),pages=doc.getPages();
  if(signature){
   const box=signatureBox(manifest);
   if(box&&pages[box.page-1]){
    const image=await doc.embedPng(dataBytes(signature)),fit=Math.min(box.width/image.width,box.height/image.height);
    const width=image.width*fit,height=image.height*fit;
    pages[box.page-1].drawImage(image,{x:box.x+(box.width-width)/2,y:manifest.page.height-box.y-box.height+(box.height-height)/2,width,height});
   }
  }
  if(signature&&!signatureBox(manifest)&&manifest?.signatureMode==='append-signature-page'){
   const page=doc.addPage([manifest.page.width,manifest.page.height]);
   const font=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold),regular=await doc.embedFont(PDFLib.StandardFonts.Helvetica);
   page.drawText('CHECKER / REVIEWER SIGNATURE',{x:28,y:manifest.page.height-42,size:14,font});
   page.drawRectangle({x:28,y:manifest.page.height*.25,width:manifest.page.width-56,height:manifest.page.height*.55,borderWidth:.8,borderColor:PDFLib.rgb(.35,.35,.35)});
   const image=await doc.embedPng(dataBytes(signature)),maxW=manifest.page.width-100,maxH=manifest.page.height*.45,fit=Math.min(maxW/image.width,maxH/image.height),width=image.width*fit,height=image.height*fit;
   page.drawImage(image,{x:(manifest.page.width-width)/2,y:(manifest.page.height-height)/2,width,height});
   page.drawText('Appended signature record — no source-PDF signature cell was mapped.',{x:28,y:18,size:7,font:regular});
  }
  const cleanPhotos=safePhotos(photos);
  for(let i=0;i<cleanPhotos.length;i+=4){
   const page=doc.addPage([manifest.page.width,manifest.page.height]),group=cleanPhotos.slice(i,i+4),margin=28,gap=14,titleY=manifest.page.height-34;
   const font=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold),regular=await doc.embedFont(PDFLib.StandardFonts.Helvetica);
   page.drawText('PHOTO EVIDENCE',{x:margin,y:titleY,size:14,font});
   const cellW=(manifest.page.width-2*margin-gap)/2,cellH=(manifest.page.height-2*margin-42-gap)/2;
   for(let k=0;k<group.length;k++){
    const photo=group[k],col=k%2,row=Math.floor(k/2),x=margin+col*(cellW+gap),top=manifest.page.height-62-row*(cellH+gap),y=top-cellH;
    page.drawRectangle({x,y,width:cellW,height:cellH,borderWidth:.7,borderColor:PDFLib.rgb(.35,.35,.35)});
    const bytes=dataBytes(photo.data),mime=mimeOf(photo.data),image=mime==='png'?await doc.embedPng(bytes):await doc.embedJpg(bytes);
    const maxW=cellW-16,maxH=cellH-36,fit=Math.min(maxW/image.width,maxH/image.height),w=image.width*fit,h=image.height*fit;
    page.drawImage(image,{x:x+(cellW-w)/2,y:y+24+(maxH-h)/2,width:w,height:h});
    const caption=String(photo.name||('Photo '+(i+k+1))).slice(0,90);
    page.drawText(caption,{x:x+6,y:y+9,size:7,font:regular,maxWidth:cellW-12});
   }
  }
  return await doc.save();
 }
 root.YETI_PDF_OVERLAY_RENDERER=Object.freeze({libraries,renderPreview,exportPdf,safePhotos});
})(window);
