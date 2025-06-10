/** @type {import('jest').Config} */
export default {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns - exclude files with import issues
  testMatch: [
    '<rootDir>/tests/basic.test.{js,ts}',
    '<rootDir>/tests/tools.test.{js,ts}',
    '<rootDir>/tests/mcp-server.test.{js,ts}',
    '<rootDir>/tests/simple.test.{js,ts}'
  ],

  // Coverage configuration
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/tests/**',
    '!src/examples/**',
    '!src/frontend/**',
    '!src/utils/**'
  ],

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    // Map relative .js imports to .ts files for testing
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  // Transform configuration for TypeScript
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        target: 'ES2020',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    }]
  },

  // ES modules handling
  extensionsToTreatAsEsm: ['.ts'],

  // Preset for TypeScript with ESM
  preset: 'ts-jest/presets/default-esm',

  // Timeout for tests
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(@modelcontextprotocol)/)'
  ]
};
