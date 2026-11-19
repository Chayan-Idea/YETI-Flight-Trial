/* YETI report generation helpers — report validation and page composition. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.YetiReportGeneration=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const REQUIRED_FIELDS=Object.freeze(['motorName','escName','propellerName','testDate','testReportType']);
 function missingRequiredFields(fields){return REQUIRED_FIELDS.filter(key=>!String(fields?.[key]??'').trim());}
 function isReady(fields){return missingRequiredFields(fields).length===0;}
 function pairGraphPages(graphs){const pages=[];for(let i=0;i<(graphs||[]).length;i+=2)pages.push(graphs.slice(i,i+2));return pages;}
 return Object.freeze({REQUIRED_FIELDS,missingRequiredFields,isReady,pairGraphPages});
});