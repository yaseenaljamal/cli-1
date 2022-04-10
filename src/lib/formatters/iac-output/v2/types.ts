import { IacTestResponse } from '../../../snyk-test/iac-test-result';
import { PolicyMetadata } from '../../../../cli/commands/test/iac-local-execution/types';

export interface IacTestData {
  ignoreCount: number;
  results: IacTestResponse[];
}

export type FormattedIssue = {
  policyMetadata: PolicyMetadata;
  // Decide which one of them to keep
  targetFile: string;
  targetFilePath: string;
};

type FormattedResultsBySeverity = {
  low?: FormattedIssue[];
  medium?: FormattedIssue[];
  high?: FormattedIssue[];
  critical?: FormattedIssue[];
};

export type IacTestOutput = {
  results: FormattedResultsBySeverity;
  projectName: string;
  org: string;
};
