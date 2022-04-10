import { isLocalFolder } from '../../../../lib/detect';
import {
  IacFileParsed,
  IacFileParseFailure,
  IaCTestFlags,
  RulesOrigin,
  SafeAnalyticsOutput,
  TestReturnValue,
} from './types';
import { addIacAnalytics } from './analytics';
import { TestLimitReachedError } from './usage-tracking';
import { TestResult } from '../../../../lib/snyk-test/legacy';
import {
  applyCustomSeverities,
  cleanLocalCache,
  getIacOrgSettings,
  trackUsage,
} from './measurable-methods';
import { UnsupportedEntitlementError } from '../../../../lib/errors/unsupported-entitlement-error';
import config from '../../../../lib/config';
import { processResults } from './process-results';
import { generateProjectAttributes, generateTags } from '../../monitor';
import { execute } from '../../../../lib/sub-process';
import { RegulaOutput } from './regula-types';
import { formatRegulaResults } from './regula-formatters';

// this method executes the local processing engine and then formats the results to adapt with the CLI output.
// this flow is the default GA flow for IAC scanning.
export async function test(
  pathToScan: string,
  options: IaCTestFlags,
): Promise<TestReturnValue> {
  try {
    const orgPublicId = options.org ?? config.org;
    const iacOrgSettings = await getIacOrgSettings(orgPublicId);

    if (!iacOrgSettings.entitlements?.infrastructureAsCode) {
      throw new UnsupportedEntitlementError('infrastructureAsCode');
    }

    // Parse tags and attributes right now, so we can exit early if the user
    // provided invalid values.
    const tags = parseTags(options);
    const attributes = parseAttributes(options);

    // TODO: Change to real values
    const policy = undefined;
    const rulesOrigin = RulesOrigin.Internal;
    const allFailedFiles = [];

    const regulaResults = await execute('play-with-regula', [pathToScan]);

    const regulaResultsJson: RegulaOutput = JSON.parse(regulaResults);

    const scannedFiles = formatRegulaResults(regulaResultsJson);

    const resultsWithCustomSeverities = await applyCustomSeverities(
      scannedFiles,
      iacOrgSettings.customPolicies,
    );
    const { filteredIssues, ignoreCount } = await processResults(
      resultsWithCustomSeverities,
      orgPublicId,
      iacOrgSettings,
      policy,
      tags,
      attributes,
      options,
    );

    try {
      await trackUsage(filteredIssues);
    } catch (e) {
      if (e instanceof TestLimitReachedError) {
        throw e;
      }
      // If something has gone wrong, err on the side of allowing the user to
      // run their tests by squashing the error.
    }

    addIacAnalytics(filteredIssues, {
      ignoredIssuesCount: ignoreCount,
      rulesOrigin,
    });

    // TODO: add support for proper typing of old TestResult interface.
    return {
      results: (filteredIssues as unknown) as TestResult[],
      // NOTE: No file or parsed file data should leave this function.
      failures: isLocalFolder(pathToScan)
        ? allFailedFiles.map(removeFileContent)
        : undefined,
    };
  } finally {
    cleanLocalCache();
  }
}

export function removeFileContent({
  filePath,
  fileType,
  failureReason,
  projectType,
}: IacFileParsed | IacFileParseFailure): SafeAnalyticsOutput {
  return {
    filePath,
    fileType,
    failureReason,
    projectType,
  };
}

function parseTags(options: IaCTestFlags) {
  if (options.report) {
    return generateTags(options);
  }
}

function parseAttributes(options: IaCTestFlags) {
  if (options.report) {
    return generateProjectAttributes(options);
  }
}
