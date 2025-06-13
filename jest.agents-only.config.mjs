/** @type {import('jest').Config} */
export default {
    // Test environment
    testEnvironment: 'node',

    // Only test the agents file
    testMatch: [
        '<rootDir>/tests/agents.test.ts'
    ],

    // Explicitly ignore build directory and other problematic paths
    testPathIgnorePatterns: [
        '/node_modules/',
        '/build/',
        '/coverage/',
        '/src/examples/'
    ],

    // Module resolution - avoid importing from build
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1',
        // Map .js imports to .ts files for testing
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },

    // Transform configuration for TypeScript
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            useESM: true,
            tsconfig: {
                module: 'CommonJS',
                target: 'ES2020',
                moduleResolution: 'node',
                allowSyntheticDefaultImports: true,
                esModuleInterop: true,
                skipLibCheck: true,
                allowJs: true,
                isolatedModules: false
            }
        }]
    },

    // ES modules handling
    extensionsToTreatAsEsm: ['.ts'],

    // Timeout for tests
    testTimeout: 30000,

    // Clear mocks between tests
    clearMocks: true,

    // Verbose output
    verbose: true,

    // Transform ignore patterns - ignore build directory completely
    transformIgnorePatterns: [
        'node_modules/(?!(@modelcontextprotocol|@jest)/)',
        'build/',
        'src/examples/'
    ]
};
