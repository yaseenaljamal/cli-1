import * as path from 'path';
import * as fs from 'fs';

import { PROVENANCE_TYPE, resolveVersion } from '../../../../../src/plugins/maven/update-dependencies';

describe('resolveVersion', () => {
  it('Correctly finds and classifies dependency', () => {
    const pomXml = `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
      <modelVersion>4.0.0</modelVersion>
      <groupId>org.example.fixtures</groupId>
      <artifactId>application</artifactId>
      <version>1.0.0-SNAPSHOT</version>
      <packaging>pom</packaging>

      <dependencies>
        <dependency>
          <groupId>org.springframework</groupId>
          <artifactId>spring-core</artifactId>
          <version>5.0.5.RELEASE</version>
        </dependency>
      </dependencies>

    </project>`;
    const dependency = {
      version: '1.0.0-SNAPSHOT',
      groupId: 'org.springframework',
      artifactId: 'spring-core',
    };
    expect(resolveVersion(dependency, pomXml)).toEqual({
      dependency,
      type: PROVENANCE_TYPE.DEPENDENCY,
    });
  });
  it('Correctly finds and classifies dependency as a property', () => {
    const pomXml = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../acceptance/plugins/maven/workspaces',
        'single-pom',
        'app-with-properties',
        'pom.xml',
      ),
      'utf8',
    );;
    // this is extracted form the POM earlier in the process
    const dependency = {
      version: '${spring.core.version}',
      groupId: 'org.springframework',
      artifactId: 'spring-core',
    };
    expect(resolveVersion(dependency, pomXml)).toEqual({
      dependency,
      type: PROVENANCE_TYPE.PROPERTY,
    });
  });
  it('Correctly finds and classifies dependency as a dependency in dependencyManagement', () => {
    const pomXml = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../acceptance/plugins/maven/workspaces',
        'single-pom',
        'app-with-dependency-management',
        'pom.xml',
      ),
      'utf8',
    );;
    // this is extracted form the POM earlier in the process
    const dependency = {
      version: '',
      groupId: 'org.springframework',
      artifactId: 'spring-core',
    };
    expect(resolveVersion(dependency, pomXml)).toEqual({
      dependency,
      type: PROVENANCE_TYPE.DEPENDENCY_MANAGEMENT,
    });
  });
  it('Correctly finds and classifies dependency as a property on a dependencyManagement', () => {
    const pomXml = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../acceptance/plugins/maven/workspaces',
        'single-pom',
        'app-with-dependency-management',
        'pom.xml',
      ),
      'utf8',
    );;
    // this is extracted form the POM earlier in the process
    const dependency = {
      version: '${spring.core.version}',
      groupId: 'org.springframework',
      artifactId: 'spring-core',
    };
    expect(resolveVersion(dependency, pomXml)).toEqual({
      dependency,
      type: PROVENANCE_TYPE.PROPERTY,
    });
  });
});
