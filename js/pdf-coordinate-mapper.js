/* Shared geometry for source-PDF checklist overlays.
 * Source coordinates use PDF points with a top-left origin, as in the reviewed package.
 */
(function(root){
 'use strict';
 function assertPoint(point,page){
  if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))throw new TypeError('A finite PDF point is required.');
  if(point.x<0||point.y<0||point.x>page.width||point.y>page.height)throw new RangeError('PDF coordinate is outside the source page.');
  return point;
 }
 function topLeftToBottomLeft(point,page){
  assertPoint(point,page);return {x:point.x,y:page.height-point.y};
 }
 function pageRows(manifest,pageNumber){
  return Object.entries(manifest?.rows||{}).map(([id,value])=>({id,page:Number(value?.[0]),top:Number(value?.[1])}))
   .filter(row=>row.page===pageNumber&&Number.isFinite(row.top)).sort((a,b)=>a.top-b.top);
 }
 function typicalRowHeight(rows){
  const gaps=[];for(let i=1;i<rows.length;i++){const d=rows[i].top-rows[i-1].top;if(d>0.5&&d<20)gaps.push(d)}
  if(!gaps.length)return 9.58;
  gaps.sort((a,b)=>a-b);return gaps[Math.floor(gaps.length/2)];
 }
 function getRowCellBounds(manifest,id){
  const row=manifest?.rows?.[id];if(!row)return null;
  const page=Number(row[0]),top=Number(row[1]),rows=pageRows(manifest,page),index=rows.findIndex(item=>item.id===id);
  if(!Number.isFinite(top)||index<0)return null;
  const typical=typicalRowHeight(rows),next=rows[index+1];
  const height=next&&next.top-top>0.5&&next.top-top<20?next.top-top:typical;
  const pageWidth=Number(manifest?.page?.width),pageHeight=Number(manifest?.page?.height);
  if(!Number.isFinite(pageWidth)||!Number.isFinite(pageHeight)||height<=0)return null;
  return {page,x:0,y:top,width:pageWidth,height,centerX:pageWidth/2,centerY:top+height/2};
 }
 function getCellCenter(bounds){
  if(!bounds||![bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite))throw new TypeError('Finite cell bounds are required.');
  return {x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
 }
 function getCheckpointAnchors(manifest,id){
  const row=getRowCellBounds(manifest,id),cols=manifest?.columns;if(!row||!cols)return null;
  const centerY=row.centerY;
  return {page:row.page,row,pass:{x:cols.passCenterX,y:centerY},fail:{x:cols.failCenterX,y:centerY},notAvailable:{x:cols.notAvailableCenterX,y:centerY},
   remarks:{x:(cols.remarksLeft+cols.remarksRight)/2,y:centerY},
   remarksBounds:{x:cols.remarksLeft,y:row.y,width:cols.remarksRight-cols.remarksLeft,height:row.height}};
 }
 function statusAnchor(manifest,id,status){
  const anchors=getCheckpointAnchors(manifest,id);if(!anchors)return null;
  const key=status==='Pass'?'pass':status==='Fail'?'fail':status==='Not Available'?'notAvailable':null;
  return key?{page:anchors.page,...anchors[key]}:null;
 }
 root.YETI_PDF_COORDINATE_MAPPER=Object.freeze({assertPoint,topLeftToBottomLeft,getRowCellBounds,getCellCenter,getCheckpointAnchors,statusAnchor});
})(window);
