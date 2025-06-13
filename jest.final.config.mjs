/** @type {import('jest').Config} */
export default {
    // Use node environment - most stable
    testEnvironment: 'node',

    // Use ts-jest with ESM but simplified settings
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

    // Simplified TypeScript transformation
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            useESM: true,
            tsconfig: {
                module: 'esnext',
                target: 'es2020',
                moduleResolution: 'node',
                allowSyntheticDefaultImports: true,
                esModuleInterop: true
            }
        }]
    },

    // Module name mapping
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup-new.ts'],

    // CRITICAL: Accept the worker exit issue as a known limitation
    // Focus on making tests run reliably despite the warning
    maxWorkers: 1,
    runInBand: true,

    // Force exit to ensure tests complete despite worker issues
    forceExit: true,

    // Disable open handles detection to reduce noise
    detectOpenHandles: false,

    // Test timeout
    testTimeout: 15000,

    // Clear mocks between tests
    clearMocks: true,

    // Enable verbose output to show test progress
    verbose: true,

    // Coverage collection disabled for performance
    collectCoverage: false,

    // Module isolation
    resetModules: true,
    restoreMocks: true,

    // Memory management
    workerIdleMemoryLimit: '1GB'
};
