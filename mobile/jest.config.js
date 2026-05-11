// jest.config.js — Kibuka mobile Jest configuration
// Uses jest-expo preset but overrides transformIgnorePatterns for pnpm on Windows

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/*.test.{ts,tsx}',
  ],
  // On Windows with pnpm, node_modules live under .pnpm — we must allow transforming
  // all React Native / Expo packages regardless of the pnpm virtual store path.
  transformIgnorePatterns: [
    // Ignore everything EXCEPT these packages that need Babel transform
    'node_modules[\\\\/](?!\\.pnpm[\\\\/]|react-native|@react-native|expo|@expo|react-navigation|@react-navigation|nativewind|@omarsapp)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'src/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
