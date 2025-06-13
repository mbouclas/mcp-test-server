/** @type {import('jest').Config} */
export default {
    // Use node environment
    testEnvironment: 'node',

    // Use babel instead of ts-jest to avoid ES module worker issues
    preset: null,

    // Handle TypeScript files
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

    // Use babel-jest for transformation instead of ts-jest
    transform: {
        '^.+\\.(ts|tsx)$': ['babel-jest', {
            presets: [
                ['@babel/preset-env', { targets: { node: 'current' } }],
                ['@babel/preset-typescript', { allowNamespaces: true }]
            ]
        }]
    },

    // Module name mapping
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },

    // Setup and teardown files
    setupFilesAfterEnv: ['<rootDir>/tests/setup-new.ts'],
    globalTeardown: '<rootDir>/tests/global-teardown.js',

    // Worker management
    maxWorkers: 1,
    runInBand: true,
    workerIdleMemoryLimit: '512MB',

    // Test timeout
    testTimeout: 10000,

    // Clear mocks between tests
    clearMocks: true,

    // Minimal output
    verbose: false,

    // Force exit
    forceExit: true,

    // Disable open handles detection
    detectOpenHandles: false,

    // Coverage collection disabled
    collectCoverage: false,

    // Module isolation
    resetModules: true,
    restoreMocks: true
};
