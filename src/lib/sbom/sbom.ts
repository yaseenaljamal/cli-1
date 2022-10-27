import * as debugLib from 'debug';
import * as child_process from 'child_process';
import { StdioOptions } from 'child_process';
import { SBOMExecutionResult, SBOMOptions } from './types';
import { DCTL_EXIT_CODES } from '../iac/drift/driftctl';
import { EXIT_CODES } from '../../cli/exit-codes';
import { isExe } from '../iac/file-utils';
import config from '../config';


const debug = debugLib('sbom');


export async function generateArgs(
  options: SBOMOptions,
): Promise<string[]> {

  if (!options.paths || options.paths.length == 0) {
    throw 'Pass a valid container image ref';
  }

  const res: string[] = options.paths.slice(0, 1);
  if (options.args != null) {
    res.push(options.args);
  }
  return res;
}

export const runSBOM = async ({
                                options, input, stdio,
                              }: {
  options: SBOMOptions;

  input?: string;
  stdio?: StdioOptions;
}): Promise<SBOMExecutionResult> => {
  const path = await findDriftCtl();

  const args: string[] = await generateArgs(options);

  if (!stdio) {
    stdio = ['pipe', 'inherit'];
  }

  debug('running sbom %s ', args.join(' '));

  const sbom_env: NodeJS.ProcessEnv = { ...process.env };

  // WARN: We are restoring system en proxy because snyk cli override them but the proxy uses untrusted certs
  if (process.env.SNYK_SYSTEM_HTTP_PROXY != undefined) {
    sbom_env.HTTP_PROXY = process.env.SNYK_SYSTEM_HTTP_PROXY;
  }
  if (process.env.SNYK_SYSTEM_HTTPS_PROXY != undefined) {
    sbom_env.HTTPS_PROXY = process.env.SNYK_SYSTEM_HTTPS_PROXY;
  }
  if (process.env.SNYK_NO_PROXY != undefined) {
    sbom_env.NO_PROXY = process.env.SNYK_SYSTEM_NO_PROXY;
  }

  const p = child_process.spawn(path, args, {
    stdio,
    env: sbom_env,
  });

  let stdout = '';
  return new Promise<SBOMExecutionResult>((resolve, reject) => {
    if (input) {
      p.stdin?.write(input);
      p.stdin?.end();
    }
    p.on('error', (error) => {
      reject(error);
    });

    p.stdout?.on('data', (data) => {
      stdout += data;
    });

    p.on('exit', (code) => {
      resolve({ code: translateExitCode(code), stdout });
    });
  });
};

export function translateExitCode(exitCode: number | null): number {
  switch (exitCode) {
    case DCTL_EXIT_CODES.EXIT_IN_SYNC:
      return 0;
    case DCTL_EXIT_CODES.EXIT_NOT_IN_SYNC:
      return EXIT_CODES.VULNS_FOUND;
    case DCTL_EXIT_CODES.EXIT_ERROR:
      return EXIT_CODES.ERROR;
    default:
      debug('sbom returned %d', exitCode);
      return EXIT_CODES.ERROR;
  }
}


async function findDriftCtl(): Promise<string> {
  // lookup in custom path contained in env var SBOM_PATH
  const sbomPath = config.SBOM_PATH;
  if (sbomPath != null) {
    const exists = await isExe(sbomPath);
    if (exists) {
      debug('Found driftctl in SBOM_PATH: %s', sbomPath);
      return sbomPath;
    }
  }

  debug('sbom not found');
  return '';
}
