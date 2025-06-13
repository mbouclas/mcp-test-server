/** @type {import('jest').Config} */
export default {
    // Try using node environment instead of custom environment
    testEnvironment: 'node',

    // Disable ES modules for TypeScript - use CommonJS compilation
    preset: 'ts-jest',
    extensionsToTreatAsEsm: [],

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

    // Transform TypeScript files to CommonJS
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            useESM: false,
            tsconfig: {
                module: 'commonjs',
                target: 'es2020'
            }
        }]
    },

    // Setup and teardown files
    setupFilesAfterEnv: ['<rootDir>/tests/setup-new.ts'],
    globalTeardown: '<rootDir>/tests/global-teardown.js',

    // Module name mapping for CommonJS
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },

    // Worker management
    maxWorkers: 1,
    runInBand: true,

    // Test timeout
    testTimeout: 15000,

    // Clear mocks between tests
    clearMocks: true,

    // Minimal output
    verbose: false,

    // Force exit to prevent hanging
    forceExit: true,

    // Enable open handles detection
    detectOpenHandles: true,

    // Memory limits
    workerIdleMemoryLimit: '1GB',

    // Coverage collection disabled for faster execution
    collectCoverage: false
};
