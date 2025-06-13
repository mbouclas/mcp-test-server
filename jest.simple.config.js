/** @type {import('jest').Config} */
export default {
    // Test environment
    testEnvironment: 'node',

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
            useESM: true
        }]
    },

    // Module name mapping for ES modules
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },

    // Test timeout
    testTimeout: 30000,

    // Clear mocks between tests
    clearMocks: true,

    // Verbose output for debugging
    verbose: true
};
