// Jest configuration for Node.js + Next.js + OpenAI/LangChain compatibility
module.exports = {
  preset: 'ts-jest',
  setupFiles: ["<rootDir>/tests/e2e/jest.setup.js"],
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.polyfills.js'
  ],
  moduleNameMapper: {
    // Support Next.js absolute imports (Windows/Unix compatible)
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testMatch: [
    '<rootDir>/__tests__/**/*.test.ts',
    '<rootDir>/__tests__/**/*.test.tsx',
    '<rootDir>/src/orchestration/**/*.test.ts',
    '<rootDir>/src/orchestration/**/*.test.tsx'
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    'pages[\\/]api'
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};
