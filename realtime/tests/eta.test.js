import test from 'node:test';
import assert from 'node:assert/strict';
import { etaSeconds } from '../src/services/eta.js';

test('el ETA es finito aunque el micro esté detenido', () => {
  assert.ok(Number.isFinite(etaSeconds(1000, [0, 0, 0])));
});

test('a 10 m/s, 1000 m toman 100 s', () => {
  assert.equal(etaSeconds(1000, [10, 10, 10]), 100);
});
