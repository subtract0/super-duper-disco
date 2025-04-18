module.exports = {
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(openai|@langchain/openai)/)'
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],

  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleDirectories: ['node_modules', '<rootDir>', '<rootDir>/src'],

};
