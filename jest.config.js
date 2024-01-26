import { createJestConfig } from './test/createJestConfig';

export default createJestConfig({
  displayName: 'snyk',
  projects: ['<rootDir>', '<rootDir>/packages/*'],
  globalSetup: './test/setup.js',
});
