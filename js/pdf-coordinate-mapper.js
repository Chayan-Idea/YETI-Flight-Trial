/* Converts source PDF coordinates into preview and PDF overlay coordinates. */
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
 function getCheckpointAnchors(manifest,id){
  const row=manifest?.rows?.[id];if(!row)return null;
  const [page,y]=row,cols=manifest.columns;
  return {page,pass:{x:cols.passCenterX,y},fail:{x:cols.failCenterX,y},notAvailable:{x:cols.notAvailableCenterX,y},remarks:{x:cols.remarksLeft+2,y}};
 }
 function statusAnchor(manifest,id,status){
  const anchors=getCheckpointAnchors(manifest,id);if(!anchors)return null;
  const key=status==='Pass'?'pass':status==='Fail'?'fail':status==='Not Available'?'notAvailable':null;
  return key?{page:anchors.page,...anchors[key]}:null;
 }
 root.YETI_PDF_COORDINATE_MAPPER=Object.freeze({assertPoint,topLeftToBottomLeft,getCheckpointAnchors,statusAnchor});
})(window);
