/** @type {import('jest').Config} */
module.exports = {
    // Enable ES module support
    preset: 'ts-jest/presets/default-esm',
    extensionsToTreatAsEsm: ['.ts'],

    // Test environment
    testEnvironment: 'node',

    // Test files to run - include all TypeScript test files
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

    // TypeScript transformation with ES module support
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            useESM: true
        }]
    },

    // Module resolution
    moduleNameMapping: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },

    // Ignore transforms for these patterns - let ts-jest handle everything
    transformIgnorePatterns: [
        // Don't transform node_modules except MCP SDK
        'node_modules/(?!(@modelcontextprotocol)/)'
    ],

    // Test timeout
    testTimeout: 30000,

    // Clear mocks between tests
    clearMocks: true,

    // Verbose output for debugging
    verbose: true
};
