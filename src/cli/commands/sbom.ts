import { MethodArgs } from '../args';
import { processCommandArgs } from './process-command-args';
import { DescribeRequiredArgumentError } from '../../lib/errors/describe-required-argument-error';
import help from './help';
import { runSBOM } from '../../lib/sbom/sbom';

export default async (...args: MethodArgs): Promise<any> => {
  const { options, paths } = processCommandArgs(...args);

  try {
    const sbomExecutionResult = await runSBOM({
      options: { ...options, paths: paths },
    });
    process.exitCode = sbomExecutionResult.code;
    process.stdout.write(sbomExecutionResult.stdout);

  } catch (e) {
    if (e instanceof DescribeRequiredArgumentError) {
      // when missing a required arg we will display help to explain
      const helpMsg = await help('iac', 'describe');
      console.log(helpMsg);
    }
    return Promise.reject(e);
  }
};
