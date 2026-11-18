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

console.log('Propulsion common analysis engine tests passed.');
