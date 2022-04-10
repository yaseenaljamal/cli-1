import * as v1 from './v1';
import * as v2 from './v2';
import { IacFileInDirectory } from '../../types';

export { formatIacTestSummary } from './v2';

export function getIacDisplayErrorFileOutput(
  iacFileResult: IacFileInDirectory,
  isNewIacOutputSupported?: boolean,
): string {
  return isNewIacOutputSupported
    ? v2.getIacDisplayErrorFileOutput(iacFileResult)
    : v1.getIacDisplayErrorFileOutput(iacFileResult);
}

export {
  capitalizePackageManager,
  createSarifOutputForIac,
  shareResultsOutput,
} from './v1';
