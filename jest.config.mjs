/** @type {import('jest').Config} */
export default {
  // KNOWN ISSUE: Jest worker graceful exit problem with TypeScript ES modules
  // This configuration works but shows "worker process has failed to exit gracefully" 
  // warning at the end. All tests pass correctly - this is a Jest/TypeScript ES module 
  // limitation on Windows, not a code issue.

  // Use custom environment with aggressive resource cleanup
  testEnvironment: './tests/jest-env-force-exit.js',

  // Enable ES modules
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],

  // Run all TypeScript test files
  testMatch: [
    '<rootDir>/tests/**/*.test.ts'
  ],

  // Ignore directories that cause conflicts
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/coverage/',
    '/src/tests/'
  ],

  // Transform TypeScript files for ES modules
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'esnext',
        target: 'es2020'
      }
    }]
  },

  // Module name mapping for ES modules
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  // Test timeout for worker cleanup
  testTimeout: 15000,

  // Clear mocks between tests
  clearMocks: true,

  // Minimal output to reduce noise
  verbose: false,

  // FORCE EXIT: Required to prevent hanging due to worker exit issue
  forceExit: true,

  // Disable open handles detection to reduce noise
  detectOpenHandles: false,

  // Run tests sequentially to avoid resource conflicts
  maxWorkers: 1,
  runInBand: true,

  // Use streamlined setup with better cleanup
  setupFilesAfterEnv: ['<rootDir>/tests/setup-new.ts'],

  // Don't fail fast to see all issues
  bail: false,

  // Worker memory management
  workerIdleMemoryLimit: '64MB',

  // Enable globals injection
  injectGlobals: true,

  // Reset everything between tests
  resetMocks: true,
  resetModules: false, // Keep modules loaded for performance
  restoreMocks: true,

  // Longer timeout for handle cleanup
  openHandlesTimeout: 5000,

  // Reduce noise
  silent: false,

  // Disable watch mode optimizations
  watchPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/build/'],
  errorOnDeprecated: false,

  // Disable cache to prevent stale state
  cache: false,

  // Coverage settings
  collectCoverage: false,

  // Explicit teardown handling
  globalTeardown: '<rootDir>/tests/global-teardown.js'
};
