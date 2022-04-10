import { FormattedResult } from '../../../../cli/commands/test/iac-local-execution/types';
import { IacTestOutput } from './types';

export function formatScanResultsNewOutput(
  oldFormattedResults: FormattedResult[],
): IacTestOutput {
  const newFormattedResults: IacTestOutput = {
    results: {},
    projectName: oldFormattedResults[0]?.projectName,
    org: oldFormattedResults[0]?.org,
  };

  oldFormattedResults.forEach((oldFormattedResult) => {
    oldFormattedResult.result.cloudConfigResults.forEach((policy) => {
      if (newFormattedResults.results[policy.severity]) {
        newFormattedResults.results[policy.severity].push({
          policyMetadata: policy,
          targetFile: oldFormattedResult.targetFile,
          targetFilePath: oldFormattedResult.targetFilePath,
        });
      } else {
        newFormattedResults.results[policy.severity] = [
          {
            policyMetadata: policy,
            targetFile: oldFormattedResult.targetFile,
            targetFilePath: oldFormattedResult.targetFilePath,
          },
        ];
      }
    });
  });

  return newFormattedResults;
}
