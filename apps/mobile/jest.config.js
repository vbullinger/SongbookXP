// Jest setup for the mobile app. Lock-in tests for behaviors that the
// perf overhaul (Phase 0–2 of the plan in PerfPlan.html) will refactor.
//
// jest-expo provides the RN/jsdom environment + babel transform; we add
// transformIgnorePatterns so workspace TS sources (book-model,
// expo-guided-access) and the patched expo-audio are transformed too.
// Manual __mocks__/ for the native modules our code imports directly.

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // jest-expo ships a working transformIgnorePatterns; we replicate it
  // and only add @songbook/* + fflate (workspace packages whose entries
  // are .ts and need transformation).
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@songbook|fflate))',
    '/node_modules/react-native-reanimated/plugin/',
  ],
  moduleNameMapper: {
    // book-model is a workspace package whose entry is .ts. jest-expo's
    // default resolution finds it via node_modules symlink, but the
    // package's `main` points at TS — let Jest's transformer handle it.
    '^@songbook/book-model$': '<rootDir>/../../packages/book-model/src/index.ts',
    '^@songbook/book-model/(.*)$': '<rootDir>/../../packages/book-model/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  // Don't accidentally run book-model's vitest suites under Jest.
  testPathIgnorePatterns: ['/node_modules/', '/packages/book-model/'],
};
