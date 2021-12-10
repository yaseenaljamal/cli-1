import {
  EngineType,
  FormattedResult,
  IaCErrorCodes,
  IacFileScanResult,
  IaCTestFlags,
  PolicyMetadata,
  TestMeta,
} from './types';
import * as path from 'path';
import { SEVERITY, SEVERITIES } from '../../../../lib/snyk-test/common';
import { IacProjectType } from '../../../../lib/iac/constants';
import { CustomError } from '../../../../lib/errors';
// import { extractLineNumber, getFileTypeForParser } from './extract-line-number';
import { getErrorStringCode } from './error-utils';
import { isLocalFolder } from '../../../../lib/detect';
import {
  // MapsDocIdToTree,
  // getTrees,
  parsePath,
} from '@snyk/cloud-config-parser';

const severitiesArray = SEVERITIES.map((s) => s.verboseName);

export async function formatScanResults(
  scanResults: IacFileScanResult[],
  options: IaCTestFlags,
  meta: TestMeta,
): Promise<FormattedResult[]> {
  try {
    const groupedByFile = await scanResults.reduce(async (memoPromise, scanResult) => {
      const memo = await memoPromise;
      const res = await formatScanResult(scanResult, meta, options);
      if (memo[scanResult.filePath]) {
        memo[scanResult.filePath].result.cloudConfigResults.push(
          ...res.result.cloudConfigResults,
        );
      } else {
        memo[scanResult.filePath] = res;
      }
      return memo;
    }, Promise.resolve({} as { [key: string]: FormattedResult }));
    return Object.values(groupedByFile);
  } catch (e) {
    throw new FailedToFormatResults();
  }
}

const engineTypeToProjectType = {
  [EngineType.Kubernetes]: IacProjectType.K8S,
  [EngineType.Terraform]: IacProjectType.TERRAFORM,
  [EngineType.CloudFormation]: IacProjectType.CLOUDFORMATION,
  [EngineType.ARM]: IacProjectType.ARM,
  [EngineType.Custom]: IacProjectType.CUSTOM,
};

const { newHCL2JSONParser } = require('./parsers/hcl2json');

async function formatScanResult(
  scanResult: IacFileScanResult,
  meta: TestMeta,
  options: IaCTestFlags,
): Promise<FormattedResult> {
  const isGeneratedByCustomRule = scanResult.engineType === EngineType.Custom;

  const formattedIssues = await Promise.all(scanResult.violatedPolicies.map(async (policy) => {
    const cloudConfigPath =
      scanResult.docId !== undefined
        ? [`[DocId: ${scanResult.docId}]`].concat(parsePath(policy.msg))
        : policy.msg.split('.');

    const hcl2JSONParser = newHCL2JSONParser(scanResult.content, policy.msg);
    const lineNumber = await hcl2JSONParser.lineNumber();

    return {
      ...policy,
      id: policy.publicId,
      name: policy.title,
      cloudConfigPath,
      isIgnored: false,
      iacDescription: {
        issue: policy.issue,
        impact: policy.impact,
        resolve: policy.resolve,
      },
      severity: policy.severity,
      lineNumber,
      documentation: !isGeneratedByCustomRule
        ? `https://snyk.io/security-rules/${policy.publicId}`
        : undefined,
      isGeneratedByCustomRule,
    };
  }));

  const { targetFilePath, projectName, targetFile } = computePaths(
    scanResult.filePath,
    options.path,
  );
  return {
    result: {
      cloudConfigResults: filterPoliciesBySeverity(
        formattedIssues,
        options.severityThreshold,
      ),
      projectType: scanResult.projectType,
    },
    meta: {
      ...meta,
      projectId: '', // we do not have a project at this stage
      policy: '', // we do not have the concept of policy
    },
    filesystemPolicy: false, // we do not have the concept of policy
    vulnerabilities: [],
    dependencyCount: 0,
    licensesPolicy: null, // we do not have the concept of license policies
    ignoreSettings: null,
    targetFile,
    projectName,
    org: meta.org,
    policy: '', // we do not have the concept of policy
    isPrivate: true,
    targetFilePath,
    packageManager: engineTypeToProjectType[scanResult.engineType],
  };
}

function computePaths(
  filePath: string,
  pathArg = '.',
): { targetFilePath: string; projectName: string; targetFile: string } {
  const targetFilePath = path.resolve(filePath, '.');

  // the absolute path is needed to compute the full project path
  const cmdPath = path.resolve(pathArg);

  let projectPath: string;
  let targetFile: string;
  if (!isLocalFolder(cmdPath)) {
    // if the provided path points to a file, then the project starts at the parent folder of that file
    // and the target file was provided as the path argument
    projectPath = path.dirname(cmdPath);
    targetFile = path.isAbsolute(pathArg)
      ? path.relative(process.cwd(), pathArg)
      : pathArg;
  } else {
    // otherwise, the project starts at the provided path
    // and the target file must be the relative path from the project path to the path of the scanned file
    projectPath = cmdPath;
    targetFile = path.relative(projectPath, targetFilePath);
  }

  return {
    targetFilePath,
    projectName: path.basename(projectPath),
    targetFile,
  };
}

export function filterPoliciesBySeverity(
  violatedPolicies: PolicyMetadata[],
  severityThreshold?: SEVERITY,
): PolicyMetadata[] {
  if (!severityThreshold || severityThreshold === SEVERITY.LOW) {
    return violatedPolicies.filter((violatedPolicy) => {
      return violatedPolicy.severity !== 'none';
    });
  }

  const severitiesToInclude = severitiesArray.slice(
    severitiesArray.indexOf(severityThreshold),
  );
  return violatedPolicies.filter((policy) => {
    return (
      policy.severity !== 'none' &&
      severitiesToInclude.includes(policy.severity)
    );
  });
}

export class FailedToFormatResults extends CustomError {
  constructor(message?: string) {
    super(message || 'Failed to format results');
    this.code = IaCErrorCodes.FailedToFormatResults;
    this.strCode = getErrorStringCode(this.code);
    this.userMessage =
      'We failed printing the results, please contact support@snyk.io';
  }
}
