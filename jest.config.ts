import type {Config} from 'jest';

const config: Config = {
  setupFilesAfterEnv: ['./test/jest.setup.ts'],
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],
  coverageDirectory: "test/coverage",
  coverageReporters: ['text', 'text-summary', 'json-summary'],
  testMatch: ['**/test/**/*.test.{ts,tsx}'],
  silent: false,
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
        '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|less)$': 'identity-obj-proxy',
  },
};

export default config;