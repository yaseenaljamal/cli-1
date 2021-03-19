import { CustomError } from '../lib/errors/custom-error';
import { EntityToFix } from '../types';
import { FailedToFix } from './types';

export function generateFailed(
  projectsToFix: EntityToFix[],
  error: CustomError,
): FailedToFix[] {
  const failed: FailedToFix[] = [];
  for (const project of projectsToFix) {
    failed.push({ original: project, error: error });
  }
  return failed;
}
