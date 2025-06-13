/** @type {import('jest').Config} */
export default {
    // Use the built-in node environment (simplest)
    testEnvironment: 'node',

    // Enable ES modules
    preset: 'ts-jest/presets/default-esm',
    extensionsToTreatAsEsm: ['.ts'],

    // Only run one specific test file to isolate the issue
    testMatch: [
        '<rootDir>/tests/simple-integration.test.ts'
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

    // Shorter timeout
    testTimeout: 5000,

    // Clear mocks between tests
    clearMocks: true,

    // Minimal output
    verbose: false,

    // CRITICAL: Force exit immediately
    forceExit: true,

    // No open handles detection to reduce overhead
    detectOpenHandles: false,

    // Single worker
    maxWorkers: 1,
    runInBand: true,

    // NO setup files to eliminate any potential resource leaks
    setupFilesAfterEnv: [],

    // Don't fail fast
    bail: false,

    // Minimal memory
    workerIdleMemoryLimit: '32MB',

    // Enable globals
    injectGlobals: true,

    // Reset everything
    resetMocks: true,
    resetModules: true,
    restoreMocks: true,

    // Very short timeout
    openHandlesTimeout: 100,

    // No caching
    cache: false,

    // No coverage
    collectCoverage: false
};
