const assert = require('node:assert/strict');
const engine = require('../js/propulsion-analysis-engine.js');

const session = engine.createSession(2, 'thrust');
assert.equal(session.logs.length, 2);
assert.notEqual(session.logs[0].mapping, session.logs[1].mapping);

engine.setLogData(session.logs[0], {
  fileName: 'run-a.csv',
  headers: ['Thrust', 'RPM', 'Voltage', 'Current'],
  rows: [['Thrust', 'RPM', 'Voltage', 'Current'], [100, 1000, 50, 10], [90, 0, 50, 10], [80, -5, 50, 10]]
});
engine.setLogData(session.logs[1], {
  fileName: 'run-b.csv',
  headers: ['Thrust', 'RPM', 'Voltage', 'Current'],
  rows: [['Thrust', 'RPM', 'Voltage', 'Current'], [200, 2000, 60, 10], [190, 0, 60, 10]]
});
engine.setMapping(session.logs[0], { thrust: 0, actualRpm: 1, voltage: 2, current: 3 });
engine.setMapping(session.logs[1], { thrust: 0, actualRpm: 1, voltage: 2, current: 3 });

assert.equal(engine.filterLog(session.logs[0]).length, 2, 'RPM zero and negative samples are removed');
assert.equal(engine.filterLog(session.logs[1]).length, 2);
const a = engine.calculateLog(session.logs[0], 'thrust', ['electricalPower', 'specificThrust']);
const b = engine.calculateLog(session.logs[1], 'thrust', ['electricalPower', 'specificThrust']);
assert.equal(a[1].derived.electricalPower, 500);
assert.equal(a[1].derived.specificThrust, 0.2);
assert.equal(b[1].derived.electricalPower, 600);
assert.equal(session.logs[0].filteredRows.length, 2);
assert.equal(session.logs[1].filteredRows.length, 2);
assert.throws(() => engine.createSession(5, 'thrust'), /between 1 and 4/);
assert.throws(() => engine.createSession(1, 'unknown'), /thrust.*torque/);

const torque = engine.createSession(1, 'torque');
engine.setLogData(torque.logs[0], {
  fileName: 'torque.csv',
  headers: ['Torque', 'RPM', 'Voltage', 'Current'],
  rows: [['Torque', 'RPM', 'Voltage', 'Current'], [2, 3000, 48, 5]]
});
engine.setMapping(torque.logs[0], { torque: 0, actualRpm: 1, voltage: 2, current: 3 });
engine.filterLog(torque.logs[0]);
const torqueRows = engine.calculateLog(torque.logs[0], 'torque', ['mechanicalPower', 'electricalPower']);
assert.ok(Math.abs(torqueRows[1].derived.mechanicalPower - (2 * 3000 * 2 * Math.PI / 60)) < 1e-10);
assert.equal(torqueRows[1].derived.electricalPower, 240);

const sortable = engine.createSession(1, 'thrust').logs[0];
engine.setLogData(sortable, {
  fileName: 'sort.csv',
  headers: ['Thrust', 'RPM', 'Voltage', 'Current'],
  rows: [['Thrust', 'RPM', 'Voltage', 'Current'], [30, 300, 48, 5], [10, 100, 48, 5], [20, 200, 48, 5], [5, 0, 48, 5]]
});
engine.setMapping(sortable, { thrust: 0, actualRpm: 1, voltage: 2, current: 3 });
const sortedRows = engine.filterLog(sortable, { sortIndex: 0, sortDirection: 'asc' });
assert.deepEqual(sortedRows.slice(1).map(row => row[0]), [10, 20, 30], 'filtering removes RPM <= 0 and sorting is independent');
assert.equal(sortable.sortOptions.sortDirection, 'asc');


assert.deepEqual(engine.validateSession(session), { valid: true, errors: [] }, 'session validates only after each log has its own data and RPM mapping');
const independentA = session.logs[0].filteredRows.map(row => row.slice());
const independentB = session.logs[1].filteredRows.map(row => row.slice());
assert.notDeepEqual(independentA, independentB, 'per-log filtered rows remain isolated');
const descendingRows = engine.filterLog(sortable, { sortIndex: 0, sortDirection: 'desc' });
assert.deepEqual(descendingRows.slice(1).map(row => row[0]), [30, 20, 10], 'descending sorting is supported');
assert.equal(engine.calculateLog(sortable, 'thrust', ['electricalPower']).length, 4, 'derived columns are calculated for each retained row including the header-aligned record');

// Additional edge-case and isolation checks for the pure calculation layer.
const edgeLog = engine.createSession(1, 'thrust').logs[0];
const edgeSource = [
  ['Thrust', 'RPM', 'Voltage', 'Current'],
  ['1,250', '1,500', '48', '5'],
  ['not-a-number', '900', '48', '5'],
  ['100', '', '48', '5'],
  ['200', '0', '48', '5'],
  ['300', '-1', '48', '5']
];
engine.setLogData(edgeLog, { fileName: 'edge.csv', headers: edgeSource[0], rows: edgeSource });
engine.setMapping(edgeLog, { thrust: 0, actualRpm: 1, voltage: 2, current: 3 });
const originalEdgeSource = edgeLog.sourceRows.map(row => row.slice());
const edgeFiltered = engine.filterLog(edgeLog);
assert.equal(edgeFiltered.length, 4, 'header, valid RPM rows, and rows with unparseable RPM are retained; RPM <= 0 is removed');
assert.deepEqual(edgeLog.sourceRows, originalEdgeSource, 'filtering never mutates uploaded source rows');
const edgeCalculated = engine.calculateLog(edgeLog, 'thrust', ['electricalPower', 'specificThrust']);
assert.equal(edgeCalculated[1].derived.electricalPower, 240);
assert.equal(edgeCalculated[1].derived.specificThrust, 1250 / 240, 'comma-formatted numeric CSV cells are parsed');
assert.ok(Number.isNaN(edgeCalculated[2].derived.specificThrust), 'invalid numeric source values produce NaN rather than fabricated results');
assert.equal(edgeCalculated[3].derived.specificThrust, 100 / 240, 'a blank RPM does not corrupt a calculation that does not depend on RPM');
assert.throws(() => engine.calculateLog(edgeLog, 'thrust', ['mechanicalPower']), /not available for thrust/);
assert.throws(() => engine.calculateLog(edgeLog, 'thrust', ['unsupportedParameter']), /not available for thrust/);

const incomplete = engine.createSession(1, 'thrust');
assert.deepEqual(engine.validateSession(incomplete), {
  valid: false,
  errors: ['Log 1 has no uploaded CSV data.', 'Log 1 has no Actual RPM mapping.']
}, 'incomplete sessions report actionable validation errors');
const invalidSession = engine.validateSession({ testType: 'unknown', logs: [edgeLog] });
assert.equal(invalidSession.valid, false, 'invalid test types are rejected by session validation');
assert.match(invalidSession.errors[0], /thrust.*torque/);

const remapped = edgeLog.mapping;
engine.setMapping(edgeLog, { thrust: 0, actualRpm: 1 });
assert.deepEqual(edgeLog.calculatedRows, [], 'changing a mapping invalidates stale derived calculations');
assert.deepEqual(edgeLog.calculatedParameterKeys, [], 'changing a mapping clears derived-parameter selections');
assert.notEqual(edgeLog.mapping, remapped, 'mapping updates replace rather than mutate the previous mapping object');

console.log('Propulsion common analysis engine tests passed.');
