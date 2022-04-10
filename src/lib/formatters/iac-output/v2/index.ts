import chalk from 'chalk';
import * as Debug from 'debug';
import * as pathLib from 'path';
import { EOL } from 'os';

import { IacFileInDirectory } from '../../../../lib/types';
import { FormattedResult } from '../../../../cli/commands/test/iac-local-execution/types';
import { FormattedIssue } from './types';
import { formatScanResultsNewOutput } from './formatters';
import { severityColor } from './color-utils';
import { capitalize } from 'lodash';

export { formatIacTestSummary } from './test-summary';

const debug = Debug('iac-output');

export function getIacDisplayedOutput(results: FormattedResult[]): string {
  const formattedResults = formatScanResultsNewOutput(results);

  let output = EOL + chalk.bold.white('Issues') + EOL;

  ['low', 'medium', 'high', 'critical'].forEach((severity) => {
    if (formattedResults.results[severity]) {
      const issues = formattedResults.results[severity];
      output +=
        EOL +
        severityColor[severity](
          chalk.bold(
            `${capitalize(severity)} Severity Issues: ${issues.length}`,
          ),
        ) +
        EOL;
      output += getIssuesOutput(issues);

      debug(
        `iac display output - ${severity} severity ${issues.length} issues`,
      );
    }
  });

  return output;
}

// CFG-1574 will continue the work on this function
function getIssuesOutput(issues: FormattedIssue[]) {
  let output = '';

  issues.forEach((issue) => {
    output += chalk.white(`${issue.policyMetadata.title}`) + EOL;
  });

  return output;
}

export function getIacDisplayErrorFileOutput(
  iacFileResult: IacFileInDirectory,
): string {
  const fileName = pathLib.basename(iacFileResult.filePath);
  return `

-------------------------------------------------------

Testing ${fileName}...

${iacFileResult.failureReason}`;
}
