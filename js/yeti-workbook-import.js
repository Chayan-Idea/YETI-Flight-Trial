/* YETI propulsion log file import adapter.
 * Excel worksheets are normalized to CSV text so existing analysis paths remain unchanged.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.YetiWorkbookImport=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const EXCEL_EXTENSIONS=/\.(xlsx|xls)$/i;
 function isExcelFile(file){return !!file&&EXCEL_EXTENSIONS.test(String(file.name||''));}
 function isCsvFile(file){return !!file&&/\.csv$/i.test(String(file.name||''));}
 function assertXlsx(){
  if(!window.XLSX||!window.XLSX.read||!window.XLSX.utils)throw new Error('Excel support could not load. Connect to the internet, refresh YETI, and try the .xlsx or .xls file again.');
  return window.XLSX;
 }
 async function loadWorkbook(file){
  if(!isExcelFile(file))throw new TypeError('Select an Excel .xlsx or .xls workbook.');
  if(!file||!file.size)throw new Error('The selected Excel workbook is empty.');
  const XLSX=assertXlsx();
  const buffer=await file.arrayBuffer();
  const workbook=XLSX.read(buffer,{type:'array',cellDates:true,dense:false});
  const sheetNames=Array.isArray(workbook.SheetNames)?workbook.SheetNames.slice():[];
  if(!sheetNames.length)throw new Error('No worksheets were found in the selected Excel workbook.');
  return {workbook,sheetNames,fileName:file.name};
 }
 function csvEscape(value){
  if(value===null||value===undefined)return '';
  const text=value instanceof Date?value.toISOString():String(value);
  return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
 }
 function readWorksheet(workbookState,sheetName){
  if(!workbookState||!workbookState.workbook)throw new TypeError('Load an Excel workbook before selecting a worksheet.');
  if(!workbookState.sheetNames.includes(sheetName))throw new Error('Select a valid worksheet from this workbook.');
  const XLSX=assertXlsx(),sheet=workbookState.workbook.Sheets[sheetName];
  if(!sheet)throw new Error('The selected worksheet could not be read.');
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true,dateNF:'yyyy-mm-dd hh:mm:ss',blankrows:true});
  const normalized=rows.map(row=>Array.isArray(row)?row.map(value=>value instanceof Date?value.toISOString():value):[]);
  const nonEmpty=normalized.filter(row=>row.some(value=>String(value??'').trim()!==''));
  if(nonEmpty.length<2)throw new Error('The selected worksheet must contain a header and at least one data row.');
  const csvText=normalized.map(row=>row.map(csvEscape).join(',')).join('\r\n');
  return {sheetName,rows:normalized,csvText};
 }
 return Object.freeze({isExcelFile,isCsvFile,loadWorkbook,readWorksheet});
});
