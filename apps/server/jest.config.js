module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@fitlife/validation$': '<rootDir>/../../packages/validation/src',
    '^@fitlife/domain$': '<rootDir>/../../packages/domain/src',
    '^@fitlife/shared-types$': '<rootDir>/../../packages/shared-types/src',
  },
  transformIgnorePatterns: ['node_modules/(?!cookie)/'],
};
