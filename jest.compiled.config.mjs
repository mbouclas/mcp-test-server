/** @type {import('jest').Config} */
export default {
    // Use standard node environment for JavaScript execution
    testEnvironment: 'node',

    // No TypeScript processing - pure JavaScript
    preset: null,
    extensionsToTreatAsEsm: [],

    // Run compiled JavaScript test files
    testMatch: [
        '<rootDir>/build/tests/**/*.test.js'
    ],

    // Ignore directories that cause conflicts
    testPathIgnorePatterns: [
        '/node_modules/',
        '/coverage/',
        '/src/',
        '/tests/' // Ignore source TypeScript tests
    ],

    // No transformation needed - pure JavaScript
    transform: {},

    // Setup and teardown files (also compiled)
    setupFilesAfterEnv: ['<rootDir>/build/tests/setup.js'],
    globalTeardown: '<rootDir>/tests/global-teardown.js',

    // Worker management
    maxWorkers: 1,
    runInBand: true,

    // Test timeout
    testTimeout: 10000,

    // Clear mocks between tests
    clearMocks: true,

    // Minimal output
    verbose: false,

    // Force exit to prevent hanging
    forceExit: true,

    // Enable open handles detection
    detectOpenHandles: false,

    // Coverage collection disabled
    collectCoverage: false
};
