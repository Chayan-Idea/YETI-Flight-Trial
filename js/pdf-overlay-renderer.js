/* Original-PDF renderer with shared live overlays for preview and export. */
(function(root){
 'use strict';
 let pdfJsPromise=null,pdfLibPromise=null,previewRevision=0,previewZoom=1;
  const MIN_PREVIEW_ZOOM=.75,MAX_PREVIEW_ZOOM=3;
  function clampZoom(value){return Math.min(MAX_PREVIEW_ZOOM,Math.max(MIN_PREVIEW_ZOOM,Number(value)||1))}
  function applyPreviewZoom(container){
   const stage=container?.querySelector('.yeti-pdf-preview-stage');if(!stage)return;
   stage.style.zoom=String(previewZoom);container.dataset.previewZoom=String(previewZoom);
   const label=document.getElementById('pdfPreviewZoomLevel');if(label)label.textContent=Math.round(previewZoom*100)+'%';
  }
  function zoomAround(container,value,clientX,clientY){
   if(!container)return previewZoom;
   const rect=container.getBoundingClientRect(),old=previewZoom;
   const localX=Number.isFinite(clientX)?clientX-rect.left:container.clientWidth/2;
   const localY=Number.isFinite(clientY)?clientY-rect.top:container.clientHeight/2;
   const focalX=(container.scrollLeft+localX)/old,focalY=(container.scrollTop+localY)/old;
   previewZoom=clampZoom(value);applyPreviewZoom(container);
   container.scrollLeft=Math.max(0,focalX*previewZoom-localX);
   container.scrollTop=Math.max(0,focalY*previewZoom-localY);
   return previewZoom;
  }
  function bindTouchZoom(container){
   if(!container||container.dataset.touchZoomBound==='1')return;container.dataset.touchZoomBound='1';container.style.touchAction='none';
   const pointers=new Map();let gesture=null;
   const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
   const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
   const point=e=>({x:e.clientX,y:e.clientY});
   container.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    try{container.setPointerCapture?.(e.pointerId)}catch(_error){}
    pointers.set(e.pointerId,point(e));const pts=[...pointers.values()];
    if(pts.length===1){gesture={type:'pan',x:pts[0].x,y:pts[0].y,left:container.scrollLeft,top:container.scrollTop};container.classList.add('pdf-pan-active')}
    else if(pts.length===2){const center=mid(pts[0],pts[1]),rect=container.getBoundingClientRect();gesture={type:'pinch',distance:Math.max(1,dist(pts[0],pts[1])),zoom:previewZoom,midX:center.x,midY:center.y,focalX:(container.scrollLeft+center.x-rect.left)/previewZoom,focalY:(container.scrollTop+center.y-rect.top)/previewZoom};container.classList.remove('pdf-pan-active')}
    e.preventDefault();
   });
   container.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,point(e));const pts=[...pointers.values()];
    if(pts.length>=2&&gesture?.type==='pinch'){
     const center=mid(pts[0],pts[1]),rect=container.getBoundingClientRect();
     previewZoom=clampZoom(gesture.zoom*dist(pts[0],pts[1])/gesture.distance);applyPreviewZoom(container);
     container.scrollLeft=Math.max(0,gesture.focalX*previewZoom-(center.x-rect.left));
     container.scrollTop=Math.max(0,gesture.focalY*previewZoom-(center.y-rect.top));e.preventDefault();
    }else if(pts.length===1&&gesture?.type==='pan'){
     container.scrollLeft=gesture.left-(pts[0].x-gesture.x);container.scrollTop=gesture.top-(pts[0].y-gesture.y);e.preventDefault();
    }
   });
   const finish=e=>{pointers.delete(e.pointerId);if(pointers.size===0){gesture=null;container.classList.remove('pdf-pan-active')}else if(pointers.size===1){const p=[...pointers.values()][0];gesture={type:'pan',x:p.x,y:p.y,left:container.scrollLeft,top:container.scrollTop};}};
   container.addEventListener('pointerup',finish);container.addEventListener('pointercancel',finish);container.addEventListener('lostpointercapture',finish);
  }
  function setPreviewZoom(container,value,anchorX,anchorY){return zoomAround(container,value,anchorX,anchorY)}
  function getPreviewZoom(){return previewZoom}
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
 const STATUS_STYLE={Pass:{label:'PASS',fill:'#16834a',width:20},Fail:{label:'FAIL',fill:'#b42332',width:20},'Not Available':{label:'N/A',fill:'#737373',width:29}};
 const VALUE_LABELS={totalWeight:'UAV Weight',cgX:'CG X',cgY:'CG Y',cgZ:'CG Z',setupDescription:'Setup',lvVoltage:'LV V',hvPreInstallVoltage:'HV Pre-install V'};
 function rowValueText(a,id,m){return Object.entries(a?.values||{}).filter(([k,v])=>!m?.fieldBoxes?.[k]&&!m?.specialFields?.[k]&&!(k==='minCellVoltage'&&m?.specialFields?.minimumCellVoltage)&&v!==''&&v!==null&&v!==undefined).map(([k,v])=>(VALUE_LABELS[k]||k)+': '+String(v)).join(' | ')}
 function answerRemark(a,id,m){return [a?.remarks,rowValueText(a,id,m)].filter(Boolean).join(' | ')}
 function fitSingleLine(text,maxWidth,baseSize,measure,minSize){let value=String(text),size=baseSize;while(size>minSize&&measure(value,size)>maxWidth)size=Math.max(minSize,size-.25);if(measure(value,size)>maxWidth){const suffix='…';while(value.length&&measure(value+suffix,size)>maxWidth)value=value.slice(0,-1);value=value?value+suffix:suffix}return {text:value,size}}
 function leftTextPlacement(bounds,scaleX,scaleY){if(!bounds||![bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite)||bounds.width<=0||bounds.height<=0)return null;const padding=Math.min(3,Math.max(1.5,bounds.width*.035));return {x:(bounds.x+padding)*scaleX,y:(bounds.y+bounds.height/2)*scaleY,maxWidth:Math.max(1,(bounds.width-padding*2)*scaleX),padding};}
 function drawLivePreview(ctx,m,answers,trial,scaleX,scaleY,pageIndex){
  const c=m?.columns||{},mapper=root.YETI_PDF_COORDINATE_MAPPER;
  for(const [id,a] of Object.entries(answers||{})){
   if(!a||id==='9.0')continue;
   const anchors=mapper?.getCheckpointAnchors(m,id);if(!anchors||anchors.page!==pageIndex)continue;
   const centerY=anchors.row.centerY,st=STATUS_STYLE[a.status];
   if(st){
    const anchor=a.status==='Pass'?anchors.pass:a.status==='Fail'?anchors.fail:a.status==='Not Available'?anchors.notAvailable:null;
    if(anchor){const w=st.width*scaleX,h=6.7*scaleY,x=(anchor.x-st.width/2)*scaleX,y=(centerY-3.35)*scaleY;
     ctx.save();ctx.fillStyle=st.fill;ctx.fillRect(x,y,w,h);ctx.fillStyle='#fff';ctx.font='bold '+(a.status==='Not Available'?3.7:4.7)*scaleY+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(st.label,x+w/2,y+h/2,w-2);ctx.restore();
    }
   }
   const remark=answerRemark(a,id,m);
   if(remark&&Number.isFinite(c.remarksLeft)&&Number.isFinite(c.remarksRight)){
    const placement=leftTextPlacement(anchors.remarksBounds,scaleX,scaleY);if(!placement)continue;const fit=fitSingleLine(remark,placement.maxWidth,4.5*scaleY,(v,s)=>{ctx.font=s+'px Arial';return ctx.measureText(v).width},3.4*scaleY);
    ctx.save();ctx.font=fit.size+'px Arial';ctx.fillStyle='#111';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(fit.text,placement.x,placement.y,placement.maxWidth);ctx.restore();
   }
   for(const [key,value] of Object.entries(a.values||{})){
    const b=m?.fieldBoxes?.[key]||m?.specialFields?.[key]||(key==='minCellVoltage'?m?.specialFields?.minimumCellVoltage:null);
    if(b&&b.page===pageIndex&&value!==''&&value!==null&&value!==undefined){const placement=leftTextPlacement(b,scaleX,scaleY);if(!placement)continue;ctx.save();const fit=fitSingleLine(String(value),placement.maxWidth,5.5*scaleY,(v,s)=>{ctx.font=s+'px Arial';return ctx.measureText(v).width},3.4*scaleY);ctx.font=fit.size+'px Arial';ctx.fillStyle='#111';ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(fit.text,placement.x,placement.y,placement.maxWidth);ctx.restore();}
   }
  }
  const h=m?.header||{},meta={trialPhase:trial?.phase,trialStage:trial?.stage,flightPlace:trial?.place,flightDate:trial?.date};
  for(const [key,value] of Object.entries(meta)){const b=h[key],placement=b&&leftTextPlacement(b,scaleX,scaleY);if(b&&placement&&b.page===pageIndex&&value){ctx.save();const fit=fitSingleLine(String(value),placement.maxWidth,5.5*scaleY,(v,size)=>{ctx.font=size+'px Arial';return ctx.measureText(v).width},3.4*scaleY);ctx.font=fit.size+'px Arial';ctx.fillStyle='#111';ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(fit.text,placement.x,placement.y,placement.maxWidth);ctx.restore();}}
 }
 function drawLiveExport(doc,m,answers,trial,PDFLib,bold,regular){
  const pages=doc.getPages(),c=m?.columns||{},baseW=m?.page?.width||pages[0]?.getWidth()||1,baseH=m?.page?.height||pages[0]?.getHeight()||1,mapper=root.YETI_PDF_COORDINATE_MAPPER;
  for(const [id,a] of Object.entries(answers||{})){
   if(!a||id==='9.0')continue;
   const anchors=mapper?.getCheckpointAnchors(m,id);if(!anchors||!pages[anchors.page-1])continue;
   const page=pages[anchors.page-1],pw=page.getWidth(),ph=page.getHeight(),sx=pw/baseW,sy=ph/baseH,centerY=anchors.row.centerY*sy,st=STATUS_STYLE[a.status];
   if(st){
    const anchor=a.status==='Pass'?anchors.pass:a.status==='Fail'?anchors.fail:a.status==='Not Available'?anchors.notAvailable:null;
    if(anchor){const x=(anchor.x-st.width/2)*sx,boxHeight=6.7*sy,boxY=ph-centerY-boxHeight/2,fill=a.status==='Pass'?PDFLib.rgb(.086,.514,.29):a.status==='Fail'?PDFLib.rgb(.706,.137,.196):PDFLib.rgb(.451,.451,.451);
     page.drawRectangle({x,y:boxY,width:st.width*sx,height:boxHeight,color:fill,borderColor:fill,borderWidth:.3*sx});
     const size=(a.status==='Not Available'?3.7:4.7)*sy,textWidth=bold.widthOfTextAtSize(st.label,size),textHeight=bold.heightAtSize(size);
     page.drawText(st.label,{x:x+(st.width*sx-textWidth)/2,y:boxY+(boxHeight-textHeight)/2+textHeight*.12,size,font:bold,color:PDFLib.rgb(1,1,1)});
    }
   }
   const remark=answerRemark(a,id,m);
   if(remark&&Number.isFinite(c.remarksLeft)&&Number.isFinite(c.remarksRight)){
    const placement=leftTextPlacement(anchors.remarksBounds,sx,sy);if(!placement)continue;const fit=fitSingleLine(remark,placement.maxWidth,4.5*sy,(v,size)=>regular.widthOfTextAtSize(v,size),3.4*sy),size=fit.size;
    page.drawText(fit.text,{x:placement.x,y:ph-placement.y-regular.heightAtSize(size)/2,size,font:regular,color:PDFLib.rgb(.05,.05,.05),maxWidth:placement.maxWidth});
   }
   for(const [key,value] of Object.entries(a.values||{})){
    const b=m?.fieldBoxes?.[key]||m?.specialFields?.[key]||(key==='minCellVoltage'?m?.specialFields?.minimumCellVoltage:null);
    if(b&&b.page===anchors.page&&value!==''&&value!==null&&value!==undefined){const placement=leftTextPlacement(b,sx,sy);if(!placement)continue;const fit=fitSingleLine(String(value),placement.maxWidth,5.5*sy,(v,size)=>regular.widthOfTextAtSize(v,size),3.4*sy),size=fit.size;page.drawText(fit.text,{x:placement.x,y:ph-placement.y-regular.heightAtSize(size)/2,size,font:regular,color:PDFLib.rgb(.05,.05,.05),maxWidth:placement.maxWidth});}
   }
  }
  const h=m?.header||{},meta={trialPhase:trial?.phase,trialStage:trial?.stage,flightPlace:trial?.place,flightDate:trial?.date};
  for(const [key,value] of Object.entries(meta)){const b=h[key],page=b&&pages[b.page-1];if(b&&value&&page){const sx=page.getWidth()/baseW,sy=page.getHeight()/baseH,placement=leftTextPlacement(b,sx,sy);if(!placement)continue;const fit=fitSingleLine(String(value),placement.maxWidth,5.5*sy,(v,size)=>regular.widthOfTextAtSize(v,size),3.4*sy),size=fit.size;page.drawText(fit.text,{x:placement.x,y:page.getHeight()-placement.y-regular.heightAtSize(size)/2,size,font:regular,color:PDFLib.rgb(.05,.05,.05),maxWidth:placement.maxWidth});}}
 }
 function drawSignaturePreview(ctx,signature,manifest,pageIndex,scale){
  const box=signatureBox(manifest);if(!signature||!box||box.page!==pageIndex)return Promise.resolve();
  return new Promise(resolve=>{const img=new Image();img.onload=()=>{const maxW=box.width*scale,maxH=box.height*scale,fit=Math.min(maxW/img.width,maxH/img.height),w=img.width*fit,h=img.height*fit;ctx.drawImage(img,(box.x*scale)+(maxW-w)/2,(box.y*scale)+(maxH-h)/2,w,h);resolve()};img.onerror=resolve;img.src=signature});
 }
 function photoPage(container,photos,width,height){
  const page=document.createElement('section');page.className='yeti-pdf-photo-page';
  page.style.cssText='position:relative;box-sizing:border-box;width:'+width+'px;height:'+height+'px;max-width:100%;margin:0 auto 18px;padding:3.5%;background:#fff;border:1px solid #bbb;box-shadow:0 2px 12px #0002;color:#111;font-family:Arial,sans-serif';
  const title=document.createElement('div');title.textContent='PHOTO EVIDENCE';title.style.cssText='font-size:18px;font-weight:700;text-align:center;margin:0 0 2.5%';
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:2%;height:88%';
  photos.forEach((photo,index)=>{const cell=document.createElement('div');cell.style.cssText='border:1px solid #777;min-width:0;min-height:0;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;padding:2%;overflow:hidden';const img=document.createElement('img');img.src=photo.data;img.alt=photo.name||'Photo evidence '+(index+1);img.style.cssText='width:100%;height:64%;min-height:0;object-fit:contain;flex:0 0 64%';const remark=document.createElement('div');remark.className='yeti-photo-remarks';remark.textContent='Remarks: '+(photo.remarks||'—');remark.style.cssText='font-size:10px;line-height:1.3;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;padding:5px 2px 2px;min-height:0;flex:1';const caption=document.createElement('div');caption.textContent=photo.name||('Photo '+(index+1));caption.style.cssText='font-size:8px;text-align:center;max-width:100%;overflow-wrap:anywhere;padding-top:3px;border-top:1px solid #ddd';cell.append(img,remark,caption);grid.appendChild(cell)});
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
 async function renderPreview(container,candidate,manifest,signature,photos,answers={},trialInfo={}){
  const revision=++previewRevision;bindTouchZoom(container);const [pdfjs]=await libraries();if(revision!==previewRevision)return;const stage=document.createElement('div');stage.className='yeti-pdf-preview-stage';
  const pdf=await pdfjs.getDocument({data:candidate.pdfBytes.slice(0)}).promise;
  if(revision!==previewRevision)return;
  let pageWidth=0,pageHeight=0;
  for(let index=1;index<=pdf.numPages;index++){
   const page=await pdf.getPage(index);if(revision!==previewRevision)return;
   const base=page.getViewport({scale:1});
   const width=Math.max(600,container.clientWidth||1000),scale=width/base.width,viewport=page.getViewport({scale});
   // Render the preview canvas at 3x its CSS dimensions so pinch zoom up to 300%
   // enlarges real raster detail rather than magnifying a low-resolution bitmap.
   const renderPixelRatio=3;
   if(index===1){pageWidth=viewport.width;pageHeight=viewport.height;}
   const wrap=document.createElement('div');wrap.className='yeti-pdf-source-page';wrap.style.cssText='position:relative;width:100%;max-width:'+viewport.width+'px;margin:0 auto 18px;background:#fff;box-shadow:0 2px 12px #0002';
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width*renderPixelRatio);canvas.height=Math.ceil(viewport.height*renderPixelRatio);canvas.style.cssText='display:block;width:100%;height:auto';
   const overlay=document.createElement('canvas');overlay.width=canvas.width;overlay.height=canvas.height;overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
   wrap.append(canvas,overlay);stage.appendChild(wrap);
   await page.render({canvasContext:canvas.getContext('2d'),viewport,transform:[renderPixelRatio,0,0,renderPixelRatio,0,0]}).promise;if(revision!==previewRevision)return;
   const overlayContext=overlay.getContext('2d');overlayContext.save();overlayContext.scale(renderPixelRatio,renderPixelRatio);
   drawLivePreview(overlayContext,manifest,answers,trialInfo,viewport.width/(manifest?.page?.width||base.width),viewport.height/(manifest?.page?.height||base.height),index);
   if(signature&&signatureBox(manifest)?.page===index)await drawSignaturePreview(overlayContext,signature,manifest,index,scale);
   overlayContext.restore();
  }
  if(signature&&!signatureBox(manifest)&&manifest?.signatureMode==='append-signature-page')appendSignaturePreview(stage,signature,pageWidth,pageHeight);
  const cleanPhotos=safePhotos(photos);
  for(let i=0;i<cleanPhotos.length;i+=4)photoPage(stage,cleanPhotos.slice(i,i+4),pageWidth,pageHeight);
  if(revision===previewRevision){container.replaceChildren(stage);applyPreviewZoom(container)}
 }
 async function exportPdf(candidate,manifest,signature,photos,answers={},trialInfo={}){
  const [,PDFLib]=await libraries(),doc=await PDFLib.PDFDocument.load(candidate.pdfBytes.slice(0)),pages=doc.getPages();
  const bold=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold),regular=await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  drawLiveExport(doc,manifest,answers,trialInfo,PDFLib,bold,regular);
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
    const maxW=cellW-16,maxH=cellH-94,fit=Math.min(maxW/image.width,maxH/image.height),w=image.width*fit,h=image.height*fit;
    page.drawImage(image,{x:x+(cellW-w)/2,y:y+88+(maxH-h)/2,width:w,height:h});
    const remark=String(photo.remarks||'—').replace(/\r/g,'').slice(0,420),words=remark.split(/\s+/),lines=[];let line='';
    for(const word of words){const next=line?line+' '+word:word;if(regular.widthOfTextAtSize(next,7)>cellW-16&&line){lines.push(line);line=word}else line=next;}
    if(line)lines.push(line);if(lines.length>4){lines.length=4;lines[3]=lines[3].replace(/\s+$/,'')+'…';}
    page.drawText('Remarks: '+lines.join('\n'),{x:x+8,y:y+35,size:7,font:regular,lineHeight:8.5,maxWidth:cellW-16});
    const caption=String(photo.name||('Photo '+(i+k+1))).slice(0,90);
    page.drawText(caption,{x:x+6,y:y+9,size:6,font:regular,maxWidth:cellW-12});
   }
  }
  return await doc.save();
 }
 root.YETI_PDF_OVERLAY_RENDERER=Object.freeze({libraries,renderPreview,exportPdf,safePhotos,setPreviewZoom,getPreviewZoom});
})(window);
