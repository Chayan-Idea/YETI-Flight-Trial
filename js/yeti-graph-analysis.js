/* YETI graph analysis module — deterministic data-domain selection. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.YetiGraphAnalysis=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function parseCsvNumber(value){const text=String(value??'').trim();if(text==='')return NaN;const number=Number(text.replace(/,/g,''));return Number.isFinite(number)?number:NaN;}
 function recordHighXPoints(rows,index,convert=value=>value){const retained=[];let highestX=-Infinity;(rows||[]).forEach((row,rowIndex)=>{const raw=String(row?.[index]??'').trim();if(raw==='')return;const parsed=Number(raw),x=convert(parsed);if(!Number.isFinite(x)||x<highestX)return;highestX=x;retained.push({index:rowIndex,x});});return retained;}
 function fullXRange(points){if(!points?.length)return null;let min=Infinity,max=-Infinity;points.forEach(point=>{min=Math.min(min,point.x);max=Math.max(max,point.x);});return {min,max};}
 function validateRange(start,end,min,max,allowEqual=false){return Number.isFinite(start)&&Number.isFinite(end)&&start<=end&&(allowEqual||start<end)&&start>=min&&end<=max;}
 return Object.freeze({parseCsvNumber,recordHighXPoints,fullXRange,validateRange});
});