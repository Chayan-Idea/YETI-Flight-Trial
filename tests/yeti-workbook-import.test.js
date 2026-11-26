const assert=require('node:assert/strict');
const importer=require('../js/yeti-workbook-import.js');
assert.equal(importer.isExcelFile({name:'propulsion.xlsx'}),true);
assert.equal(importer.isExcelFile({name:'propulsion.xls'}),true);
assert.equal(importer.isExcelFile({name:'propulsion.csv'}),false);
assert.equal(importer.isCsvFile({name:'PROPULSION.CSV'}),true);
assert.equal(importer.isCsvFile({name:'propulsion.xlsx'}),false);
console.log('YETI workbook import extension tests passed.');
