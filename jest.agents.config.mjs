/** @type {import('jest').Config} */
export default {
    // Test environment
    testEnvironment: 'node',

    // Only test the agents test file
    testMatch: ['<rootDir>/tests/agents.test.ts'],

    // Module resolution
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1',
        // Map relative .js imports to .ts files for testing
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },

    // Simplified transform configuration
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            useESM: true,
            isolatedModules: true,
            tsconfig: {
                module: 'ESNext',
                target: 'ES2020',
                moduleResolution: 'node',
                allowSyntheticDefaultImports: true,
                esModuleInterop: true,
                skipLibCheck: true,
                allowJs: true,
                noEmit: true
            }
        }]
    },

    // ES modules handling
    extensionsToTreatAsEsm: ['.ts'],

    // Preset for TypeScript with ESM
    preset: 'ts-jest/presets/default-esm',

    // Timeout for tests
    testTimeout: 30000,

    // Clear mocks between tests
    clearMocks: true,

    // Verbose output
    verbose: true,

    // Transform ignore patterns
    transformIgnorePatterns: [
        'node_modules/(?!(@modelcontextprotocol|@jest)/)'
    ],

    // Globals for ts-jest
    globals: {
        'ts-jest': {
            useESM: true,
            isolatedModules: true
        }
    }
};
