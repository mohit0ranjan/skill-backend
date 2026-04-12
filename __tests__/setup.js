/**
 * Global test setup file
 * Runs before all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-12345678901234567890';
process.env.JWT_RESET_SECRET = 'test-reset-secret-12345678901234567890';
process.env.JWT_VERIFY_EMAIL_SECRET = 'test-verify-secret-12345678901234567890';

// Mock console to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Close any open connections
  await new Promise(resolve => setTimeout(resolve, 500));
});
