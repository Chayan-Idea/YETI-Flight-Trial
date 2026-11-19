const assert=require('node:assert/strict');
const csv=require('../js/yeti-csv-processing.js');
const mapping=require('../js/yeti-parameter-mapping.js');
const graph=require('../js/yeti-graph-analysis.js');
const report=require('../js/yeti-report-generation.js');
const session=require('../js/yeti-session-storage.js');

const source='Time;Actual RPM;Thrust\r\n00:00;1000;10\r\n00:01;0;9\r\n00:02;900;8';
assert.deepEqual(csv.parse(source,csv.chooseDelimiter(source)),[['Time','Actual RPM','Thrust'],['00:00','1000','10'],['00:01','0','9'],['00:02','900','8']]);
assert.equal(csv.normalizeHeader('\uFEFF Actual RPM '),'actual_rpm');
assert.deepEqual(csv.filterRowsWithReturnTail([['RPM'],['100'],['0'],['-1'],['90']],0,1),[['RPM'],['100'],['0'],['90']]);

const specs=[{aliases:['actual_rpm','actual rpm']},{aliases:['thrust']}];
const score=(value,aliases)=>mapping.scoreHeader(value,aliases,csv.normalizeHeader);
assert.equal(mapping.findHeader([['metadata'],['Actual RPM','Thrust']],specs,score),1);
assert.deepEqual(mapping.validateSelection({rpm:{selected:0},thrust:{selected:1}},['rpm','thrust']),{valid:true,errors:[]});
assert.equal(mapping.validateSelection({rpm:{selected:0},thrust:{selected:0}},['rpm','thrust']).valid,false);

assert.deepEqual(graph.recordHighXPoints([['x'],['1'],['3'],['2'],['4']],0),[{index:1,x:1},{index:2,x:3},{index:4,x:4}]);
assert.deepEqual(graph.fullXRange([{x:2},{x:9}]),{min:2,max:9});
assert.equal(graph.parseCsvNumber('1,250'),1250);
assert.equal(graph.parseCsvNumber(''),NaN);
assert.equal(graph.validateRange(1,3,0,4),true);
assert.equal(graph.validateRange(4,1,0,4),false);

assert.deepEqual(report.missingRequiredFields({motorName:'M',escName:'E'}),['propellerName','testDate','testReportType']);
assert.equal(report.isReady({motorName:'M',escName:'E',propellerName:'P',testDate:'2026-01-01',testReportType:'Thrust Log Report'}),true);
assert.deepEqual(report.pairGraphPages([1,2,3,4,5]),[[1,2],[3,4],[5]]);
assert.equal(session.DB_NAME,'yeti-flight-trial-state');
assert.equal(typeof session.read,'function');
assert.equal(typeof session.write,'function');
assert.equal(typeof session.clear,'function');
console.log('YETI modular responsibility tests passed.');
