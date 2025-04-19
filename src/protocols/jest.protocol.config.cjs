/** Jest config for protocol-level (Node) tests */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
};
