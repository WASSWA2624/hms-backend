module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/tests/**/*.test.js'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
    '^@logs/(.*)$': '<rootDir>/logs/$1',
    '^@websockets/(.*)$': '<rootDir>/src/websockets/$1',
    '^@prisma/client$': '<rootDir>/src/prisma/client.js',
    '^@controllers/([^/]+)/(.*)$': '<rootDir>/src/modules/$1/controllers/$2',
    '^@services/([^/]+)/(.*)$': '<rootDir>/src/modules/$1/services/$2',
    '^@repositories/([^/]+)/(.*)$': '<rootDir>/src/modules/$1/repositories/$2',
    '^@validations/([^/]+)/(.*)$': '<rootDir>/src/modules/$1/schemas/$2'
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/server.js',
    '!src/app/index.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};

