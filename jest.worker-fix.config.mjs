/** @type {import('jest').Config} */
export default {
    // Use standard node environment
    testEnvironment: 'node',

    // Keep ES modules but use different ts-jest settings
    preset: 'ts-jest/presets/default-esm',
    extensionsToTreatAsEsm: ['.ts'],

    // Run TypeScript test files
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
                target: 'es2020',
                moduleResolution: 'node'
            }
        }]
    },

    // Module name mapping for ES modules
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },

    // Aggressive worker management to address the core issue
    maxWorkers: 1,
    runInBand: true,

    // Critical: Try different worker management approach
    workerIdleMemoryLimit: '500MB',

    // Setup and teardown files
    setupFilesAfterEnv: ['<rootDir>/tests/setup-new.ts'],
    globalTeardown: '<rootDir>/tests/global-teardown.js',

    // Test timeout
    testTimeout: 10000,

    // Clear mocks between tests
    clearMocks: true,

    // Minimal output
    verbose: false,

    // Key change: Try disabling forceExit and see if we can get graceful shutdown
    forceExit: false,

    // Disable open handles detection 
    detectOpenHandles: false,

    // Coverage collection disabled
    collectCoverage: false,

    // Try to isolate modules between tests
    resetModules: true,
    restoreMocks: true
};
