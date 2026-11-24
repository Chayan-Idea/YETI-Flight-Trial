const assert = require('node:assert/strict');
const api = require('../js/propulsion-percent-comparison.js');

const points = [{x:1000,y:10},{x:2000,y:20},{x:3000,y:40}];
assert.deepEqual(api.interpolate(points, 2000), {valid:true,value:20,method:'EXACT'});
assert.deepEqual(api.interpolate(points, 1500), {valid:true,value:15,method:'INTERPOLATED'});
assert.equal(api.interpolate(points, 500).reason, 'OUT_OF_RANGE');
assert.equal(api.interpolate(points, 3500).reason, 'OUT_OF_RANGE');
assert.equal(api.compare(points,[{x:1000,y:12},{x:2000,y:24},{x:3000,y:48}],[1000,1500,2000])[0].percentage,20);
assert.equal(api.compare(points,[{x:1000,y:8},{x:2000,y:16},{x:3000,y:32}],[1500])[0].direction,'LOWER');
assert.equal(api.compare([{x:1,y:0},{x:2,y:0}],[{x:1,y:1},{x:2,y:2}],[1])[0].reason,'ZERO_REFERENCE');
assert.equal(api.compare(points,[{x:1000,y:12},{x:2000,y:24},{x:3000,y:48}],[4000])[0].valid,false);
assert.deepEqual(api.buildSeries([['x','y'],['1000','10'],['2000','20'],['1500','15'],['3000','40']],0,1),[{x:1000,y:10},{x:2000,y:20},{x:3000,y:40}]);
console.log('Propulsion percentage comparison tests passed.');
