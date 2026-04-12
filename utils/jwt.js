const jwt = require('jsonwebtoken');

const JWT_ISSUER = 'skillbridge-api';
const JWT_AUDIENCE = 'skillbridge-client';

/**
 * Get a secret by name. Each token type MUST have its own dedicated secret.
 * No fallback to JWT_SECRET — this prevents token cross-use attacks.
 */
const getSecret = (secretName = 'JWT_SECRET') => {
  const secret = process.env[secretName];
  if (!secret) {
    throw new Error(`${secretName} environment variable is required. Add it to your .env file.`);
  }
  return secret;
};

/**
 * Generate a signed JWT with issuer/audience claims.
 * Default expiry: 7 days (reduced from 30d for security).
 */
const generateToken = (userId, expiresIn = '7d', secretName = 'JWT_SECRET') => {
  return jwt.sign(
    { id: userId },
    getSecret(secretName),
    {
      expiresIn,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
};

const generateResetToken = (userId) => {
  return generateToken(userId, '1h', 'JWT_RESET_SECRET');
};

const generateVerificationToken = (userId) => {
  return generateToken(userId, '24h', 'JWT_VERIFY_EMAIL_SECRET');
};

/**
 * Verify a JWT. Validates issuer/audience claims.
 */
const verifyToken = (token, secretName = 'JWT_SECRET') => {
  return jwt.verify(token, getSecret(secretName), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
};

module.exports = {
  generateToken,
  generateResetToken,
  generateVerificationToken,
  verifyToken,
};
