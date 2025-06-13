/** @type {import('jest').Config} */
export default {
    // Use Node.js environment directly
    testEnvironment: 'node',

    // Enable ES modules support
    preset: 'ts-jest/presets/default-esm',
    extensionsToTreatAsEsm: ['.ts'],

    // Run TypeScript test files
    testMatch: ['<rootDir>/tests/**/*.test.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/build/', '/coverage/'],

    // TypeScript transformation for ES modules
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            useESM: true,
            tsconfig: {
                module: 'esnext',
                target: 'es2020',
                moduleResolution: 'node'
            }
        }]
    },

    // Transform ignore patterns for ES modules
    transformIgnorePatterns: [
        'node_modules/(?!(@modelcontextprotocol|@jest)/)'
    ],

    // Module resolution
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },

    // CRITICAL: Minimal workers and run in band for clean exit
    maxWorkers: 1,
    runInBand: true,

    // CRITICAL: Force exit enabled with reasonable timeout
    forceExit: true,
    detectOpenHandles: false,

    // Test configuration
    testTimeout: 10000,
    openHandlesTimeout: 1000,

    // Cleanup settings
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,

    // Minimal output
    verbose: true,
    silent: false,

    // Memory management
    workerIdleMemoryLimit: '512MB',

    // Cache disabled for clean runs
    cache: false,

    // Disable coverage to reduce overhead
    collectCoverage: false,

    // Fast bail on failures
    bail: false,

    // Global teardown for final cleanup
    globalTeardown: '<rootDir>/tests/global-teardown.js'
};
