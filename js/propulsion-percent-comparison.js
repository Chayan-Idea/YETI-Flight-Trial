/* YETI percentage comparison primitives — isolated from existing graph analysis. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PropulsionPercentComparison = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function numeric(value) {
    if (value === null || value === undefined || String(value).trim() === '') return NaN;
    const number = Number(String(value).trim().replace(/,/g, ''));
    return Number.isFinite(number) ? number : NaN;
  }

  function buildSeries(rows, xIndex, yIndex) {
    const points = [];
    let highestX = -Infinity;
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const x = numeric(row && row[xIndex]);
      const y = numeric(row && row[yIndex]);
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < highestX) return;
      highestX = Math.max(highestX, x);
      points.push({ x, y });
    });
    return points;
  }

  function interpolate(points, targetX) {
    const x = numeric(targetX);
    if (!Number.isFinite(x)) return { valid: false, reason: 'INVALID_X' };
    const sorted = (Array.isArray(points) ? points : [])
      .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
      .slice()
      .sort((a, b) => a.x - b.x);
    if (!sorted.length || x < sorted[0].x || x > sorted[sorted.length - 1].x) {
      return { valid: false, reason: 'OUT_OF_RANGE' };
    }
    const exact = sorted.find(point => point.x === x);
    if (exact) return { valid: true, value: exact.y, method: 'EXACT' };
    let upperIndex = sorted.findIndex(point => point.x > x);
    if (upperIndex <= 0) return { valid: false, reason: 'NO_BRACKET' };
    let lower = sorted[upperIndex - 1], upper = sorted[upperIndex];
    while (upperIndex < sorted.length && upper.x === lower.x) {
      upperIndex += 1;
      upper = sorted[upperIndex];
    }
    if (!upper || upper.x === lower.x) return { valid: false, reason: 'NO_BRACKET' };
    const value = lower.y + ((x - lower.x) / (upper.x - lower.x)) * (upper.y - lower.y);
    return Number.isFinite(value) ? { valid: true, value, method: 'INTERPOLATED' } : { valid: false, reason: 'INVALID_VALUE' };
  }

  function compare(referencePoints, comparisonPoints, xValues) {
    return (Array.isArray(xValues) ? xValues : []).map(rawX => {
      const x = numeric(rawX);
      const reference = interpolate(referencePoints, x);
      const comparison = interpolate(comparisonPoints, x);
      if (!reference.valid) return { x, valid: false, reason: 'REFERENCE_' + reference.reason };
      if (!comparison.valid) return { x, valid: false, reason: 'COMPARISON_' + comparison.reason, referenceY: reference.value };
      const absoluteDifference = comparison.value - reference.value;
      if (reference.value === 0) return { x, valid: false, reason: 'ZERO_REFERENCE', referenceY: reference.value, comparisonY: comparison.value, absoluteDifference };
      const percentage = absoluteDifference / Math.abs(reference.value) * 100;
      return {
        x, valid: Number.isFinite(percentage), referenceY: reference.value,
        comparisonY: comparison.value, absoluteDifference, percentage,
        direction: percentage > 0 ? 'HIGHER' : percentage < 0 ? 'LOWER' : 'EQUAL',
        referenceMethod: reference.method, comparisonMethod: comparison.method
      };
    });
  }

  return Object.freeze({ numeric, buildSeries, interpolate, compare });
});
