/**
 * Auth Controller Tests
 * Unit tests for authentication business logic
 */

const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwt');

describe('Auth Utils - Password Hashing', () => {
  it('should hash password correctly', async () => {
    const password = 'TestPassword123!';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    expect(hashedPassword).not.toBe(password);
    expect(hashedPassword.length).toBeGreaterThan(20);
  });

  it('should verify correct password', async () => {
    const password = 'TestPassword123!';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const isValid = await bcrypt.compare(password, hashedPassword);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'TestPassword123!';
    const wrongPassword = 'WrongPassword123!';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const isValid = await bcrypt.compare(wrongPassword, hashedPassword);
    expect(isValid).toBe(false);
  });
});

describe('Auth Utils - JWT Token', () => {
  it('should generate valid JWT token', () => {
    const userId = 'user-12345';
    const token = generateToken(userId);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts
  });

  it('should encode userId in token', () => {
    const userId = 'user-12345';
    const token = generateToken(userId);
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET, {
      issuer: 'skillbridge-api',
      audience: 'skillbridge-client',
    });

    expect(decoded.id).toBe(userId);
  });

  it('should include expiration in token', () => {
    const token = generateToken('user-12345');
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET, {
      issuer: 'skillbridge-api',
      audience: 'skillbridge-client',
    });

    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();
  });
});

describe('Validation - Password Strength', () => {
  const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Number');
    }
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Special character (@$!%*?&)');
    }

    return { valid: errors.length === 0, errors };
  };

  it('should accept valid password', () => {
    const result = validatePassword('ValidPass123!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject password without uppercase', () => {
    const result = validatePassword('validpass123!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Uppercase letter');
  });

  it('should reject password without lowercase', () => {
    const result = validatePassword('VALIDPASS123!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Lowercase letter');
  });

  it('should reject password without number', () => {
    const result = validatePassword('ValidPass!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Number');
  });

  it('should reject password without special character', () => {
    const result = validatePassword('ValidPass123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Special character (@$!%*?&)');
  });

  it('should reject too short password', () => {
    const result = validatePassword('Pass1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least 8 characters');
  });

  it('should return multiple errors for weak password', () => {
    const result = validatePassword('weak');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
