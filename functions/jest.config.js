module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: './src',
    testMatch: ['<rootDir>/tests/**/*.test.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    setupFiles: ['<rootDir>/tests/setup.ts'],
    collectCoverageFrom: [
        '**/*.ts',
        '!**/*.d.ts',
        '!tests/**',
        '!**/node_modules/**',
    ],
    coverageDirectory: '../coverage',
    testTimeout: 60000,
    verbose: true
};
