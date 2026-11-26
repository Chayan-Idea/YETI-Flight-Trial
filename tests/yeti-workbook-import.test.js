const assert=require('node:assert/strict');
const importer=require('../js/yeti-workbook-import.js');
assert.equal(importer.isExcelFile({name:'propulsion.xlsx'}),true);
assert.equal(importer.isExcelFile({name:'propulsion.xls'}),true);
assert.equal(importer.isExcelFile({name:'propulsion.csv'}),false);
assert.equal(importer.isCsvFile({name:'PROPULSION.CSV'}),true);
assert.equal(importer.isCsvFile({name:'propulsion.xlsx'}),false);

global.window={XLSX:{
 read:()=>({SheetNames:['Summary','Thrust Data'],Sheets:{'Summary':{},'Thrust Data':{}}}),
 utils:{sheet_to_json:()=>[['Time','Actual RPM','Thrust (N)'],['10:00:00',1000,125.5],['10:00:01',1200,130]]}
}};
(async()=>{
 const workbook=await importer.loadWorkbook({name:'test.xlsx',size:123,arrayBuffer:async()=>new ArrayBuffer(8)});
 assert.deepEqual(workbook.sheetNames,['Summary','Thrust Data']);
 const selected=importer.readWorksheet(workbook,'Thrust Data');
 assert.equal(selected.rows.length,3);
 assert.equal(selected.rows[1][1],1000);
 assert.match(selected.csvText,/Actual RPM/);
 assert.match(selected.csvText,/125\.5/);
 assert.throws(()=>importer.readWorksheet(workbook,'Missing'),/valid worksheet/);
 console.log('YETI workbook import tests passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
