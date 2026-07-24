const test = require('node:test');
const assert = require('node:assert/strict');
const { getEffectiveSessionMethod, shouldFallbackToQr, resolvePairingNumber } = require('../lib/sessionUtils');

test('defaults to qr when no session method is provided', () => {
  assert.equal(getEffectiveSessionMethod(undefined), 'qr');
});

test('falls back to qr for pairing connection errors', () => {
  assert.equal(shouldFallbackToQr(new Error('Connection Closed')), true);
});

test('prefers configured bot number instead of prompting', () => {
  assert.equal(resolvePairingNumber('6281234567890', '6289999999999'), '6281234567890');
  assert.equal(resolvePairingNumber('', '6289999999999'), '6289999999999');
});
