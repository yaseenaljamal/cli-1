const { createJestConfig } = require('snyk/test/createJestConfig');

module.exports = createJestConfig({
  displayName: 'snyk',
  projects: ['<rootDir>', '<rootDir>/packages/*'],
});
