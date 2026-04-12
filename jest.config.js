module.exports = {
  displayName: 'Backend Tests',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    'middleware/**/*.js',
    '!**/*.d.js',
    '!**/node_modules/**',
    '!**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 10000,
  verbose: true
};
