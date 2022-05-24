import { IacTestResponse } from '../../../snyk-test/iac-test-result';
import { IacScanFailure } from '../../../../cli/commands/test/iac/local-execution/types';

export interface IacTestData {
  ignoreCount: number;
  results: IacTestResponse[];
  failures?: IacScanFailure[];
}

// TODO replace with IacScanFailure
export type IaCTestFailure = {
  filePath: string;
  failureReason: string | undefined;
};
