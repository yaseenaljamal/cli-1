import * as fs from 'fs';
import * as pathLib from 'path';
import * as snykFix from '../../../../src';
import {
  generateEntityToFixWithFileReadWrite,
  generateTestResult,
} from '../../../helpers/generate-entity-to-fix';

describe('fix pom.xml projects', () => {
  let filesToDelete: string[] = [];
  afterEach(() => {
    filesToDelete.map((f) => fs.unlinkSync(f));
  });
  const workspacesPath = pathLib.resolve(__dirname, 'workspaces');

  it('fixes a simple project by upgrading inline', async () => {
    // Arrange
    const targetFile = 'single-pom/simple-app/pom.xml';
    filesToDelete = [pathLib.join(workspacesPath, 'single-pom/simple-app/fixed-pom.xml')];

    const testResult = {
      ...generateTestResult(),
      remediation: {
        unresolved: [],
        upgrade: {
          'org.springframework:spring-core@5.0.5.RELEASE': {
            upgradeTo: 'org.springframework:spring-core@5.0.6.RELEASE',
            vulns: ['SNYK-JAVA-ORGSPRINGFRAMEWORK-31651'],
            upgrades: ['org.springframework:spring-core'],
          },
        },
        patch: {},
        ignore: {},
        pin: {},
      },
    };

    const entityToFix = generateEntityToFixWithFileReadWrite(
      workspacesPath,
      targetFile,
      testResult,
      {
        type: 'maven',
      },
    );

    // Act
    const result = await snykFix.fix([entityToFix], {
      // quiet: true,
      // stripAnsi: true,
    });
    // Assert
    expect(result).toMatchObject({
      exceptions: {},
      results: {
        maven: {
          failed: [],
          skipped: [],
          succeeded: [
            {
              original: entityToFix,
              changes: [
                {
                  success: true,
                  userMessage:
                    'Upgraded org.springframework:spring-core from 5.0.5.RELEASE to 5.0.6.RELEASE',
                },
              ],
            },
          ],
        },
      },
    });

    const expectedPom = fs.readFileSync(
      pathLib.resolve(workspacesPath, 'single-pom/simple-app/expected-pom.xml'),
      'utf-8',
    );
    const fixedPom = fs.readFileSync(
      pathLib.resolve(workspacesPath, 'single-pom/simple-app/fixed-pom.xml'),
      'utf-8',
    );
    expect(fixedPom).toBe(expectedPom);
  });
  it('fixes a simple project with properties in the same file by upgrading the property', async () => {
    // Arrange
    const targetFile = 'single-pom/app-with-properties/pom.xml';
    filesToDelete = [pathLib.join(workspacesPath, 'single-pom/app-with-properties/fixed-pom.xml')];

    const testResult = {
      ...generateTestResult(),
      remediation: {
        unresolved: [],
        upgrade: {
          'org.springframework:spring-core@5.0.5.RELEASE': {
            upgradeTo: 'org.springframework:spring-core@5.0.6.RELEASE',
            vulns: ['SNYK-JAVA-ORGSPRINGFRAMEWORK-31651'],
            upgrades: ['org.springframework:spring-core'],
          },
        },
        patch: {},
        ignore: {},
        pin: {},
      },
    };

    const entityToFix = generateEntityToFixWithFileReadWrite(
      workspacesPath,
      targetFile,
      testResult,
      {
        type: 'maven',
      },
    );

    // Act
    const result = await snykFix.fix([entityToFix], {
      // quiet: true,
      // stripAnsi: true,
    });
    // Assert
    expect(result).toMatchObject({
      exceptions: {},
      results: {
        maven: {
          failed: [],
          skipped: [],
          succeeded: [
            {
              original: entityToFix,
              changes: [
                {
                  success: true,
                  userMessage:
                    'Upgraded org.springframework:spring-core from 5.0.5.RELEASE to 5.0.6.RELEASE',
                },
              ],
            },
          ],
        },
      },
    });

    const expectedPom = fs.readFileSync(
      pathLib.resolve(workspacesPath, 'single-pom/app-with-properties/expected-pom.xml'),
      'utf-8',
    );
    const fixedPom = fs.readFileSync(
      pathLib.resolve(workspacesPath, 'single-pom/app-with-properties/fixed-pom.xml'),
      'utf-8',
    );
    expect(fixedPom).toBe(expectedPom);
  });
  it('fixes a simple project with dependencyManagement in the same file by upgrading the dependencyManagement', async () => {
    // Arrange
    const targetFile = 'single-pom/app-with-dependency-management/pom.xml';
    filesToDelete = [pathLib.join(workspacesPath, 'single-pom/app-with-dependency-management/fixed-pom.xml')];

    const testResult = {
      ...generateTestResult(),
      remediation: {
        unresolved: [],
        upgrade: {
          'org.springframework:spring-core@5.0.5.RELEASE': {
            upgradeTo: 'org.springframework:spring-core@5.0.6.RELEASE',
            vulns: ['SNYK-JAVA-ORGSPRINGFRAMEWORK-31651'],
            upgrades: ['org.springframework:spring-core'],
          },
        },
        patch: {},
        ignore: {},
        pin: {},
      },
    };

    const entityToFix = generateEntityToFixWithFileReadWrite(
      workspacesPath,
      targetFile,
      testResult,
      {
        type: 'maven',
      },
    );

    // Act
    const result = await snykFix.fix([entityToFix], {
      // quiet: true,
      // stripAnsi: true,
    });
    // Assert
    expect(result).toMatchObject({
      exceptions: {},
      results: {
        maven: {
          failed: [],
          skipped: [],
          succeeded: [
            {
              original: entityToFix,
              changes: [
                {
                  success: true,
                  userMessage:
                    'Upgraded org.springframework:spring-core from 5.0.5.RELEASE to 5.0.6.RELEASE',
                },
              ],
            },
          ],
        },
      },
    });

    const expectedPom = fs.readFileSync(
      pathLib.resolve(workspacesPath, 'single-pom/app-with-dependency-management/expected-pom.xml'),
      'utf-8',
    );
    const fixedPom = fs.readFileSync(
      pathLib.resolve(workspacesPath, 'single-pom/app-with-dependency-management/fixed-pom.xml'),
      'utf-8',
    );
    expect(fixedPom).toBe(expectedPom);
  });

  it('fixes a simple project with dependencyManagement & properties in the same file by upgrading the properties', async () => {
    // Arrange
    const targetFile = 'single-pom/app-with-properties-and-dependency-management/pom.xml';
    filesToDelete = [pathLib.join(workspacesPath, 'single-pom/app-with-properties-and-dependency-management/fixed-pom.xml')];

    const testResult = {
      ...generateTestResult(),
      remediation: {
        unresolved: [],
        upgrade: {
          'org.springframework:spring-core@5.0.5.RELEASE': {
            upgradeTo: 'org.springframework:spring-core@5.0.6.RELEASE',
            vulns: ['SNYK-JAVA-ORGSPRINGFRAMEWORK-31651'],
            upgrades: ['org.springframework:spring-core'],
          },
        },
        patch: {},
        ignore: {},
        pin: {},
      },
    };

    const entityToFix = generateEntityToFixWithFileReadWrite(
      workspacesPath,
      targetFile,
      testResult,
      {
        type: 'maven',
      },
    );

    // Act
    const result = await snykFix.fix([entityToFix], {
      // quiet: true,
      // stripAnsi: true,
    });
    // Assert
    expect(result).toMatchObject({
      exceptions: {},
      results: {
        maven: {
          failed: [],
          skipped: [],
          succeeded: [
            {
              original: entityToFix,
              changes: [
                {
                  success: true,
                  userMessage:
                    'Upgraded org.springframework:spring-core from 5.0.5.RELEASE to 5.0.6.RELEASE',
                },
              ],
            },
          ],
        },
      },
    });

    const expectedPom = fs.readFileSync(
      pathLib.resolve(workspacesPath, 'single-pom/app-with-properties-and-dependency-management/expected-pom.xml'),
      'utf-8',
    );
    const fixedPom = fs.readFileSync(
      pathLib.resolve(workspacesPath, 'single-pom/app-with-properties-and-dependency-management/fixed-pom.xml'),
      'utf-8',
    );
    expect(fixedPom).toBe(expectedPom);
  });

  it('fixes a simple project with comments & spacing issues by upgrading inline', async () => {
    // Arrange
    const targetFile = 'single-pom/namespace-comments/pom.xml';
    filesToDelete = [pathLib.join(workspacesPath, 'single-pom/namespace-comments/fixed-pom.xml')];

    const testResult = {
      ...generateTestResult(),
      remediation: {
        unresolved: [],
        upgrade: {
          'org.springframework:spring-core@5.0.5.RELEASE': {
            upgradeTo: 'org.springframework:spring-core@5.0.6.RELEASE',
            vulns: ['SNYK-JAVA-ORGSPRINGFRAMEWORK-31651'],
            upgrades: ['org.springframework:spring-core'],
          },
        },
        patch: {},
        ignore: {},
        pin: {},
      },
    };

    const entityToFix = generateEntityToFixWithFileReadWrite(
      workspacesPath,
      targetFile,
      testResult,
      {
        type: 'maven',
      },
    );

    // Act
    const result = await snykFix.fix([entityToFix], {
      // quiet: true,
      // stripAnsi: true,
    });
    // Assert
    expect(result).toMatchObject({
      exceptions: {},
      results: {
        maven: {
          failed: [],
          skipped: [],
          succeeded: [
            {
              original: entityToFix,
              changes: [
                {
                  success: true,
                  userMessage:
                    'Upgraded org.springframework:spring-core from 5.0.5.RELEASE to 5.0.6.RELEASE',
                },
              ],
            },
          ],
        },
      },
    });

    const expectedPom = fs.readFileSync(
      pathLib.resolve(workspacesPath, 'single-pom/namespace-comments/expected-pom.xml'),
      'utf-8',
    );
    const fixedPom = fs.readFileSync(
      pathLib.resolve(workspacesPath, 'single-pom/namespace-comments/fixed-pom.xml'),
      'utf-8',
    );
    expect(fixedPom).toBe(expectedPom);
  });

  // TODO: will this apply the change correctly? Test on a project
  it('fixes a project with published parent by upgrading inline', async () => {
    // Arrange
    const targetFile = 'single-pom/pom-has-published-parent/pom.xml';
    filesToDelete = [pathLib.join(workspacesPath, 'single-pom/pom-has-published-parent/fixed-pom.xml')];

    const testResult = {
      ...generateTestResult(),
      remediation: {
        unresolved: [],
        upgrade: {
          'org.springframework:spring-core@5.0.5.RELEASE': {
            upgradeTo: 'org.springframework:spring-core@5.0.6.RELEASE',
            vulns: ['SNYK-JAVA-ORGSPRINGFRAMEWORK-31651'],
            upgrades: ['org.springframework:spring-core'],
          },
        },
        patch: {},
        ignore: {},
        pin: {},
      },
    };

    const entityToFix = generateEntityToFixWithFileReadWrite(
      workspacesPath,
      targetFile,
      testResult,
      {
        type: 'maven',
      },
    );

    // Act
    const result = await snykFix.fix([entityToFix], {
      // quiet: true,
      // stripAnsi: true,
    });
    // Assert
    expect(result).toMatchObject({
      exceptions: {},
      results: {
        maven: {
          failed: [],
          skipped: [],
          succeeded: [
            {
              original: entityToFix,
              changes: [
                {
                  success: true,
                  userMessage:
                    'Upgraded org.springframework:spring-core from 5.0.5.RELEASE to 5.0.6.RELEASE',
                },
              ],
            },
          ],
        },
      },
    });

    const expectedPom = fs.readFileSync(
      pathLib.resolve(workspacesPath, 'single-pom/pom-has-published-parent/expected-pom.xml'),
      'utf-8',
    );
    const fixedPom = fs.readFileSync(
      pathLib.resolve(workspacesPath, 'single-pom/pom-has-published-parent/fixed-pom.xml'),
      'utf-8',
    );
    expect(fixedPom).toBe(expectedPom);
  });

  it('fixes a project with parent version property by upgrading parent version', async () => {
    // Arrange
    const targetFile = 'single-pom/pom-parent-version/pom.xml';
    filesToDelete = [pathLib.join(workspacesPath, 'single-pom/pom-parent-version/fixed-pom.xml')];

    const testResult = {
      ...generateTestResult(),
      remediation: {
        unresolved: [],
        upgrade: {
          'org.springframework:spring-core@5.0.5.RELEASE': {
            upgradeTo: 'org.springframework:spring-core@5.0.6.RELEASE',
            vulns: ['SNYK-JAVA-ORGSPRINGFRAMEWORK-31651'],
            upgrades: ['org.springframework:spring-core'],
          },
        },
        patch: {},
        ignore: {},
        pin: {},
      },
    };

    const entityToFix = generateEntityToFixWithFileReadWrite(
      workspacesPath,
      targetFile,
      testResult,
      {
        type: 'maven',
      },
    );

    // Act
    const result = await snykFix.fix([entityToFix], {
      // quiet: true,
      // stripAnsi: true,
    });
    // Assert
    expect(result).toMatchObject({
      exceptions: {},
      results: {
        maven: {
          failed: [],
          skipped: [],
          succeeded: [
            {
              original: entityToFix,
              changes: [
                {
                  success: true,
                  userMessage:
                    'Upgraded org.springframework:spring-core from 5.0.5.RELEASE to 5.0.6.RELEASE',
                },
              ],
            },
          ],
        },
      },
    });

    const expectedPom = fs.readFileSync(
      pathLib.resolve(workspacesPath, 'single-pom/pom-parent-version/expected-pom.xml'),
      'utf-8',
    );
    const fixedPom = fs.readFileSync(
      pathLib.resolve(workspacesPath, 'single-pom/pom-parent-version/fixed-pom.xml'),
      'utf-8',
    );
    expect(fixedPom).toBe(expectedPom);
  });
  it.todo('dependency version is a property outside of pom');

  // remote parent = our inline versions won't apply?

  // "adding dep management section inline in this pom" the vulnerability is in a transitive, then to fix we need to add a depManagement section and override the version

  // TODO: does it actually override anything?
  it.todo('dependency version is not set as it is coming from somewhere else'); // write the version to override it

});
