import * as debugLib from 'debug';
import * as poke from 'xmlpoke';
import { XMLParser, X2jOptionsOptional,  XMLBuilder} from 'fast-xml-parser';

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

export async function updateDependencies(
  entity: EntityToFix,
  _options: FixOptions,
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
      alwaysCreateTextNode: true
    };
    const parser = new XMLParser({});
    const pomJson = parser.parse(pomXml, parseOptions);
    debug(`pomJson=${JSON.stringify(pomJson)}`);

    for (const [upgradeFrom, upgradeData] of Object.entries(
      remediation.upgrade,
    )) {
      debug(`Applying upgrade for ${upgradeFrom}`);

      const { changes } = await applyUpgrade(
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

async function applyUpgrade(
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
    debug(`dependencies=${JSON.stringify(dependencies)}`);
    for (const dependency of dependencies) {
      debug(
        `${pkgName} does this equal ${dependency?.groupId}:${dependency?.artifactId}`,
      );
        debug('applyPropertyUpgrade', {newFileContents})

        newFileContents = applyDependencyUpgrade(pomXml, newVersion, dependency.groupId, dependency.artifactId)
        if (pkgName === `${dependency?.groupId}:${dependency?.artifactId}`) {
        // dependency.version = newVersion;
        foundDependency = true;
        break;
      }
    }
    debug(`foundDependency ${pkgName} = ${foundDependency}`);

    if (!foundDependency || !newFileContents) {
      throw new Error('Could not find dependency ' + upgradeFrom);
    }

    await workspace.writeFile(targetFile, newFileContents);
    changes.push({
      success: true,
      userMessage: `Upgraded ${pkgName} from ${version} to ${newVersion}`,
      issueIds: vulns,
      from: upgradeFrom,
      to: upgradeTo, //`${pkgName}@${newVersion}`,
    });
  } catch (e) {
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
