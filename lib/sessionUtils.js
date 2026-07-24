function getEffectiveSessionMethod(requestedMethod) {
  const method = (requestedMethod || '').toString().trim().toLowerCase();
  if (method === 'qr' || method === 'pairing') return method;
  return 'qr';
}

function resolvePairingNumber(inputNumber, configuredBotNumber) {
  const candidate = (inputNumber || '').toString().trim();
  if (candidate) return candidate;
  const configured = (configuredBotNumber || '').toString().trim();
  return configured;
}

function shouldFallbackToQr(err) {
  if (!err) return false;
  const message = (err.message || err.toString() || '').toLowerCase();
  return message.includes('connection closed') || message.includes('pairing') || message.includes('linking') || message.includes('failed to request pairing code');
}

module.exports = { getEffectiveSessionMethod, resolvePairingNumber, shouldFallbackToQr };
