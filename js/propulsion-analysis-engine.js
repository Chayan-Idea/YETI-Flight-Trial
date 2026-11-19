/* YETI Propulsion Common Analysis Engine
 * Pure, per-log analysis primitives. UI orchestration remains in propulsion-analyser.js.
 * Each log owns its source rows, mapping, filtered rows and calculated columns.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PropulsionAnalysisEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_LOGS = 4;
  const TEST_TYPES = Object.freeze(['thrust', 'torque']);
  const DERIVED_BY_TEST = Object.freeze({
    thrust: Object.freeze(['electricalPower', 'specificThrust']),
    torque: Object.freeze(['mechanicalPower', 'electricalPower'])
  });
  const REQUIRED_BY_DERIVED = Object.freeze({
    mechanicalPower: Object.freeze(['torque', 'actualRpm']),
    electricalPower: Object.freeze(['voltage', 'current']),
    specificThrust: Object.freeze(['thrust', 'voltage', 'current'])
  });

  function assertTestType(testType) {
    if (!TEST_TYPES.includes(testType)) throw new TypeError('Test type must be "thrust" or "torque".');
  }

  function createLog(id) {
    return {
      id: String(id),
      fileName: '',
      headers: [],
      sourceRows: [],
      mapping: {},
      filteredRows: [],
      calculatedParameterKeys: [],
      calculatedRows: []
    };
  }

  function createSession(logCount, testType) {
    const count = Number(logCount);
    if (!Number.isInteger(count) || count < 1 || count > MAX_LOGS) {
      throw new RangeError('A common analysis session must contain between 1 and 4 logs.');
    }
    assertTestType(testType);
    return {
      testType,
      logs: Array.from({ length: count }, (_, index) => createLog(index + 1))
    };
  }

  function cloneRows(rows) {
    return (Array.isArray(rows) ? rows : []).map(row => Array.isArray(row) ? row.slice() : []);
  }

  function setLogData(log, payload) {
    if (!log || !payload || !Array.isArray(payload.headers) || !Array.isArray(payload.rows)) {
      throw new TypeError('Log data requires headers and rows arrays.');
    }
    log.fileName = String(payload.fileName || '');
    log.headers = payload.headers.slice();
    log.sourceRows = cloneRows(payload.rows);
    log.filteredRows = [];
    log.calculatedRows = [];
    log.calculatedParameterKeys = [];
    return log;
  }

  function setMapping(log, mapping) {
    if (!log || !mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
      throw new TypeError('A log-specific parameter mapping object is required.');
    }
    const next = {};
    Object.keys(mapping).forEach(key => {
      const index = Number(mapping[key]);
      if (Number.isInteger(index) && index >= 0) next[key] = index;
    });
    log.mapping = next;
    log.filteredRows = [];
    log.calculatedRows = [];
    log.calculatedParameterKeys = [];
    return log;
  }

  function numericCell(row, index) {
    if (!Number.isInteger(index) || index < 0) return NaN;
    const raw = row && row[index];
    if (raw === null || raw === undefined || String(raw).trim() === '') return NaN;
    const value = Number(String(raw).trim().replace(/,/g, ''));
    return Number.isFinite(value) ? value : NaN;
  }

  function filterLog(log, options) {
    if (!log || !Array.isArray(log.sourceRows)) throw new TypeError('A populated log is required.');
    const opts = options || {};
    const rpmIndex = Number.isInteger(opts.actualRpmIndex) ? opts.actualRpmIndex : log.mapping.actualRpm;
    const rows = cloneRows(log.sourceRows);
    let filtered = rows;
    if (rpmIndex !== undefined) {
      filtered = [];
      rows.forEach((row, index) => {
        // Preserve the CSV header. Exclude every data row whose Actual RPM is
        // zero or negative; do not truncate or otherwise alter the return tail.
        if (index === 0) { filtered.push(row); return; }
        const rpm = numericCell(row, rpmIndex);
        if (!Number.isFinite(rpm) || rpm > 0) filtered.push(row);
      });
    }
    const sortIndex = Number.isInteger(opts.sortIndex) ? opts.sortIndex : -1;
    const direction = opts.sortDirection === 'desc' ? -1 : 1;
    if (sortIndex >= 0 && filtered.length > 2) {
      const header = filtered[0];
      const body = filtered.slice(1).map((row, index) => ({ row, index }));
      body.sort((a, b) => {
        const av = numericCell(a.row, sortIndex), bv = numericCell(b.row, sortIndex);
        const aNum = Number.isFinite(av), bNum = Number.isFinite(bv);
        let order = aNum && bNum ? av - bv : String(a.row[sortIndex] ?? '').localeCompare(String(b.row[sortIndex] ?? ''), undefined, { numeric: true });
        return order === 0 ? a.index - b.index : order * direction;
      });
      filtered = [header, ...body.map(item => item.row)];
    }
    log.filteredRows = filtered;
    log.sortOptions = { sortIndex, sortDirection: direction === 1 ? 'asc' : 'desc' };
    log.calculatedRows = [];
    log.calculatedParameterKeys = [];
    return log.filteredRows;
  }

  function calculateValue(key, row, mapping) {
    const value = field => numericCell(row, mapping[field]);
    if (key === 'mechanicalPower') {
      const torque = value('torque');
      const rpm = value('actualRpm');
      const power = torque * rpm * (2 * Math.PI / 60);
      return Number.isFinite(power) ? power : NaN;
    }
    if (key === 'electricalPower') {
      const voltage = value('voltage');
      const current = value('current');
      const power = voltage * current;
      return Number.isFinite(power) ? power : NaN;
    }
    if (key === 'specificThrust') {
      const thrust = value('thrust');
      const voltage = value('voltage');
      const current = value('current');
      const power = voltage * current;
      const specificThrust = thrust / power;
      return Number.isFinite(thrust) && Number.isFinite(power) && power > 0 && Number.isFinite(specificThrust) ? specificThrust : NaN;
    }
    throw new RangeError('Unsupported derived parameter: ' + key);
  }

  function calculateDerivedValue(key, row, mapping) {
    const supported = TEST_TYPES.some(testType => DERIVED_BY_TEST[testType].includes(key));
    if (!supported) throw new RangeError('Unsupported derived parameter: ' + key);
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
      throw new TypeError('A numeric parameter mapping object is required.');
    }
    return calculateValue(key, row, mapping);
  }

  function calculateLog(log, testType, parameterKeys) {
    assertTestType(testType);
    if (!log || !Array.isArray(log.filteredRows)) throw new TypeError('Filter the log before calculating derived parameters.');
    const allowed = DERIVED_BY_TEST[testType];
    const requested = Array.from(new Set(parameterKeys || []));
    requested.forEach(key => {
      if (!allowed.includes(key)) throw new RangeError(key + ' is not available for ' + testType + ' testing.');
      const missing = REQUIRED_BY_DERIVED[key].filter(field => !Number.isInteger(log.mapping[field]));
      if (missing.length) throw new Error('Log ' + log.id + ' is missing mappings for: ' + missing.join(', ') + '.');
    });
    log.calculatedParameterKeys = requested;
    log.calculatedRows = log.filteredRows.map(row => {
      const values = {};
      requested.forEach(key => { values[key] = calculateValue(key, row, log.mapping); });
      return { source: row.slice(), derived: values };
    });
    return log.calculatedRows;
  }

  function validateSession(session) {
    if (!session || !Array.isArray(session.logs) || session.logs.length < 1 || session.logs.length > MAX_LOGS) {
      return { valid: false, errors: ['Session must contain between 1 and 4 logs.'] };
    }
    try { assertTestType(session.testType); } catch (error) {
      return { valid: false, errors: [error.message] };
    }
    const errors = [];
    session.logs.forEach(log => {
      if (!log.fileName || !log.sourceRows.length) errors.push('Log ' + log.id + ' has no uploaded CSV data.');
      if (!Number.isInteger(log.mapping.actualRpm)) errors.push('Log ' + log.id + ' has no Actual RPM mapping.');
    });
    return { valid: errors.length === 0, errors };
  }

  return Object.freeze({
    MAX_LOGS,
    TEST_TYPES,
    DERIVED_BY_TEST,
    createSession,
    setLogData,
    setMapping,
    filterLog,
    calculateLog,
    calculateDerivedValue,
    validateSession
  });
});
