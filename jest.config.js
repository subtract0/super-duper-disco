// Jest configuration for Node.js + Next.js + OpenAI/LangChain compatibility
module.exports = {
  setupFiles: ["<rootDir>/tests/e2e/jest.setup.js"],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.polyfills.js'
  ],
  moduleNameMapper: {
    // Support Next.js absolute imports (Windows/Unix compatible)
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/'
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};
