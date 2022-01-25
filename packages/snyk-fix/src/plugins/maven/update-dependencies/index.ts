import * as debugLib from 'debug';
import * as poke from 'xmlpoke';
import { XMLParser, X2jOptionsOptional, XMLBuilder } from 'fast-xml-parser';

import { validateRequiredData } from '../../python/handlers/validate-required-data';
import {
  EntityToFix,
  FixChangesSummary,
  FixOptions,
  UpgradeRemediation,
  Workspace,
} from '../../../types';
import { PluginFixResponse } from '../../types';

const debug = debugLib('snyk-fix:maven');

enum PROVENANCE_TYPE {
  DEPENDENCY_MANAGEMENT = 'dependencyManagement',
  DEPENDENCY = 'dependency',
  PROPERTY = 'property',
}

export async function updateDependencies(
  entity: EntityToFix,
  options: FixOptions,
): Promise<PluginFixResponse> {
  const handlerResult: PluginFixResponse = {
    succeeded: [],
    failed: [],
    skipped: [],
  };

  const allChanges: FixChangesSummary[] = [];
  try {
    const { remediation, targetFile, workspace } = validateRequiredData(entity);
    debug(`remediation=${JSON.stringify(remediation)}`);
    debug(`targetFile=${JSON.stringify(targetFile)}`);
    debug(`workspace=${JSON.stringify(workspace)}`);
    // DO SOMETHING WITH REMEDIATION DATA & UPDATE FILE

    const pomXml = await workspace.readFile(targetFile);
    debug(`pomXml=${pomXml}`);
    // parse it
    const parseOptions: X2jOptionsOptional = {
      // To allow attributes without value.
      // By default boolean attributes are ignored
      allowBooleanAttributes: true,
      // trim string values of an attribute or node
      trimValues: true,
      // ignore attributes to be parsed
      // ignoreAttributes: true,
      alwaysCreateTextNode: true,
    };
    const parser = new XMLParser({});
    const pomJson = parser.parse(pomXml, parseOptions);
    debug(`pomJson=${JSON.stringify(pomJson)}`);

    for (const [upgradeFrom, upgradeData] of Object.entries(
      remediation.upgrade,
    )) {
      debug(`Applying upgrade for ${upgradeFrom}`);

      const { changes } = await applyUpgrade(
        options,
        pomJson,
        pomXml,
        upgradeFrom,
        upgradeData,
        workspace,
        targetFile,
      );
      allChanges.push(...changes);
    }

    // for each upgrade =>  apply it
    // find the dep & swap the versions for each remediation
    // if successful generate successful change

    // const changes = generateSuccessfulChanges(remediation.upgrade);
    handlerResult.succeeded.push({
      original: entity,
      changes: allChanges,
    });
  } catch (error) {
    debug(
      `Failed to fix ${entity.scanResult.identity.targetFile}.\nERROR: ${error}`,
    );
    handlerResult.failed.push({
      original: entity,
      error,
      tip: `TODO: add some tip to try here`,
    });
  }
  return handlerResult;
}

// The XML parser returns either an object when a section in XML has a single entry,
// or an array of object when the section has multiple entries.
// This function works around this weird API design by ensuring we always have an array.
function ensureArray<T>(value?: T | T[]): T[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((v) => v !== null && v !== undefined);
  }

  return [value];
}

/**
 *
 * @param pomJson
 * @param pomXml
 * @param upgradeFrom
 * @param upgradeData
 * @param workspace
 * @param targetFile
 * @returns  Promise<{ changes: FixChangesSummary[] }>
 *
 * All fixes are based on the fact that we do not have full provenance information
 * aka information on what other parent poms are in the chain as we are fixing 1 pom at a time
 * and currently have no way to collect provenance info via CLI
 *
 * All fixes because of the restriction above are "inline" to force the package version.
 */
async function applyUpgrade(
  options: FixOptions,
  pomJson: any,
  pomXml: string,
  upgradeFrom: string,
  upgradeData: UpgradeRemediation,
  workspace: Workspace,
  targetFile: string,
): Promise<{ changes: FixChangesSummary[] }> {
  const changes: FixChangesSummary[] = [];
  const { upgradeTo, vulns } = upgradeData;
  const newVersion = upgradeTo.split('@')[1];
  const [pkgName, version] = upgradeFrom.split('@');

  try {
    let foundDependency = false;
    let newFileContents;
    // only apply upgrades to version inline, ignore everything else
    const dependencies = ensureArray(
      pomJson?.project?.dependencies?.dependency,
    );

    for (const dep of dependencies) {
      if (pkgName === `${dep?.groupId}:${dep?.artifactId}`) {
        // Apply a fix based on fix type
        const { dependency: dependencyWithVersion, type } = resolveVersion(
          dep,
          pomJson,
        );
        newFileContents = upgradeDependency(
          dependencyWithVersion,
          newVersion,
          pomXml,
          type,
        );
        foundDependency = true;
        break;
      }
    }
    if (!foundDependency || !newFileContents) {
      throw new Error(`Could not find dependency ${upgradeFrom}`);
    }

    if (!options.dryRun) {
      debug('Writing changes to file');
      await workspace.writeFile(targetFile, newFileContents);
    } else {
      debug('Skipping writing changes to file in --dry-run mode');
    }

    changes.push({
      success: true,
      userMessage: `Upgraded ${pkgName} from ${version} to ${newVersion}`,
      issueIds: vulns,
      from: upgradeFrom,
      to: upgradeTo, //`${pkgName}@${newVersion}`,
    });
  } catch (e) {
    debug(e);
    changes.push({
      success: false,
      reason: e.message,
      userMessage: `Failed to upgrade ${pkgName} from ${version} to ${newVersion}`,
      tip: 'Apply the changes manually',
      issueIds: vulns,
    });
  }
  return { changes };
}

function resolveVersion(
  dependency: MavenDependency,
  pomJson: any,
): {
  type: PROVENANCE_TYPE;
  dependency: MavenDependency;
} {
  const { version, groupId, artifactId } = dependency;

  // version defined inline
  if (version) {
    const provenanceType = isPropertyVersion(version)
      ? PROVENANCE_TYPE.PROPERTY
      : PROVENANCE_TYPE.DEPENDENCY;

    return { type: provenanceType, dependency };
  }

  // find where the version is defined
  // (dependencyManagement or dependencyManagement with property)
  const dependencyManagementDependencies = ensureArray(
    pomJson?.project?.dependencyManagement?.dependencies?.dependency,
  );

  for (const x of dependencyManagementDependencies) {
    if (`${groupId}:${artifactId}` === `${x.groupId}:${x.artifactId}`) {
      if (x.version) {
        const provenanceType = isPropertyVersion(x.version)
          ? PROVENANCE_TYPE.PROPERTY
          : PROVENANCE_TYPE.DEPENDENCY_MANAGEMENT;
        return {
          type: provenanceType,
          dependency: { ...dependency, version: x.version },
        };
      }
      break;
    }
  }

  debug(
    'Could not determine where the dependency version is set, defaulting to add it inline',
  );
  return { type: PROVENANCE_TYPE.DEPENDENCY, dependency };
}

function applyDependencyUpgrade(
  pomXml: string,
  upgradedVersion: string,
  groupId: string,
  artifactId: string,
) {
  const { simpleXML, restore } = simplifyXml(pomXml);
  try {
    const fixedXML = poke(simpleXML, (xml) => {
      const selector = `groupId="${groupId}" and artifactId="${artifactId}"`;
      xml.errorOnNoMatches();
      xml.set(`//dependency[${selector}]/version`, upgradedVersion);
    });
    return restore(fixedXML);
  } catch {
    throw new Error('Failed to apply dependency upgrade');
  }
}

/**
 * Extracts package information from a package name.
 * Returns pomXML file with the fix applied.
 */
function applyPropertyUpgrade(
  pomXml: string,
  upgradedVersion: string,
  propertyName: string,
): string {
  debug(
    `Applying property upgrade upgradedVersion=${upgradedVersion}, propertyName=${propertyName}`,
  );
  const { simpleXML, restore } = simplifyXml(pomXml);
  try {
    if (propertyName === 'project.parent.version') {
      const fixedXML = poke(simpleXML, (xml) => {
        xml.errorOnNoMatches();
        xml.set(`//parent/version`, upgradedVersion);
      });
      return restore(fixedXML);
    }
    const fixedXML = poke(simpleXML, (xml) => {
      xml.errorOnNoMatches();
      xml.set(`//properties/${propertyName}`, upgradedVersion);
    });
    return restore(fixedXML);
  } catch (e) {
    throw new Error('Failed to apply property upgrade');
  }
}

function simplifyXml(pomXml: string) {
  const SIMPLE_PROJECT = '<project>';
  const PROJECT_TAG_RE = /(<project[\s\S]*?>)/;
  // XML namespaces are a pain! Let's side-step that!
  // besides: xmlpoke reformats them, and we don't want that!
  const projectTag = pomXml.match(PROJECT_TAG_RE)![1];
  const simpleXML = pomXml.replace(projectTag, SIMPLE_PROJECT);
  const restore = (xml: string) => xml.replace(SIMPLE_PROJECT, projectTag);

  return {
    simpleXML,
    restore,
  };
}

interface MavenDependency {
  version: string;
  groupId: string;
  artifactId: string;
}

function upgradeDependency(
  dependency: MavenDependency,
  newVersion: string,
  pomXml: string,
  versionProvenance: PROVENANCE_TYPE,
): string {
  let updatedPomXml;
  if (
    versionProvenance === PROVENANCE_TYPE.DEPENDENCY ||
    versionProvenance === PROVENANCE_TYPE.DEPENDENCY_MANAGEMENT
  ) {
    updatedPomXml = applyDependencyUpgrade(
      pomXml,
      newVersion,
      dependency.groupId,
      dependency.artifactId,
    );
  } else if (versionProvenance === PROVENANCE_TYPE.PROPERTY) {
    const { version } = dependency;
    if (version) {
      const propertyName = getPropertyVersionName(dependency.version);
      updatedPomXml = applyPropertyUpgrade(pomXml, newVersion, propertyName);
    }
  } else {
    throw new Error(`Unsupported fix type: ${versionProvenance}`);
  }

  return updatedPomXml;
}

function isPropertyVersion(version: string): boolean {
  return version.startsWith('$');
}

function getPropertyVersionName(version: string): string {
  const regex = /{(.*)}/g;
  const result = regex.exec(version);

  if (Array.isArray(result)) {
    return result[1];
  }
  return version;
}
