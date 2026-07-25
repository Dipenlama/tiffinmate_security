module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/coverage/'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/coverage/'],
};
