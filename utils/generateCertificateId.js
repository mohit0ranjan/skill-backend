const crypto = require('crypto');

/**
 * Generate a cryptographically random certificate ID.
 * Format: SB-YYYY-XXXXXX (e.g., SB-2026-A3F9K2)
 * Uses crypto.randomBytes instead of Math.random for unpredictability.
 */
const generateCertificateId = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const year = new Date().getFullYear();
  const randomBytes = crypto.randomBytes(6);
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += characters[randomBytes[i] % characters.length];
  }
  return `SB-${year}-${suffix}`;
};

module.exports = {
  generateCertificateId,
};
