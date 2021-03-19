import * as debugLib from 'debug';
import * as ora from 'ora';
import * as chalk from 'chalk';

const debug = debugLib('snyk-fix:maven');

import { EntityToFix, FixOptions } from '../../types';
import { FixHandlerResultByPlugin } from '../types';
import { updateDependencies } from './update-dependencies';
import { partitionByFixable } from '../is-supported';
import { CustomError } from '../../lib/errors/custom-error';
import { generateFailed } from '../generate-failed';

export async function mavenFix(
  projectsToFix: EntityToFix[],
  options: FixOptions,
): Promise<FixHandlerResultByPlugin> {
  const projectType = 'Maven';
  const spinner = ora({ isSilent: options.quiet, stream: process.stdout });
  const spinnerMessage = 'Looking for supported Maven items';
  spinner.text = spinnerMessage;
  spinner.start();

  debug(`Preparing to fix ${projectsToFix.length} Java Maven projects`);
  const handlerResult: FixHandlerResultByPlugin = {
    maven: {
      succeeded: [],
      failed: [],
      skipped: [],
    },
  };

  const results = handlerResult.maven;

  spinner.stopAndPersist({
    text: spinnerMessage,
    symbol: chalk.green('\n✔'),
  });

  const processingMessage = `Processing ${projectsToFix.length} ${projectType} items`;
  const processedMessage = `Processed ${projectsToFix.length} ${projectType} items`;

  spinner.text = processingMessage;
  spinner.render();

  try {
    // drop unsupported Maven entities early so only potentially fixable items get
    // attempted to be fixed
    const { fixable, skipped: notFixable } = await partitionByFixable(
      projectsToFix,
    );
    results.skipped.push(...notFixable);

    for (const [index, entity] of fixable.entries()) {
      const spinner = ora({ isSilent: options.quiet, stream: process.stdout });
      const spinnerMessage = `Fixing pom.xml ${index + 1}/${fixable.length}`;
      spinner.text = spinnerMessage;
      spinner.start();

      const { failed, succeeded, skipped } = await updateDependencies(
        entity,
        options,
      );
      results.succeeded.push(...succeeded);
      results.failed.push(...failed);
      results.skipped.push(...skipped);
      spinner.stop();
    }
  } catch (e) {
    debug(
      `Failed to fix ${projectsToFix.length} ${projectType} projects.\nError: ${e.message}`,
    );
    results.failed.push(...generateFailed(projectsToFix, e as CustomError));
  }
  spinner.stopAndPersist({
    text: processedMessage,
    symbol: chalk.green('✔'),
  });

  return handlerResult;
}
