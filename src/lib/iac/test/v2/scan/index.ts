import { TestConfig } from '../types';
import * as childProcess from 'child_process';
import { CustomError } from '../../../../errors';
import { IaCErrorCodes } from '../../../../../cli/commands/test/iac/local-execution/types';
import { getErrorStringCode } from '../../../../../cli/commands/test/iac/local-execution/error-utils';
import * as newDebug from 'debug';
import {
  mapSnykIacTestOutputToTestOutput,
  SnykIacTestOutput,
  TestOutput,
} from './results';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';
import config from '../../../../config';
import { getAuthHeader } from '../../../../api-token';
import { allowAnalytics } from '../../../../analytics';
import envPaths from 'env-paths';

const debug = newDebug('snyk-iac');

export const systemCachePath = config.CACHE_PATH ?? envPaths('snyk').cache;

export async function scan(
  options: TestConfig,
  policyEnginePath: string,
  rulesBundlePath: string,
): Promise<TestOutput> {
  const configPath = createConfig(options);
  try {
    return scanWithConfig(
      options,
      policyEnginePath,
      rulesBundlePath,
      configPath,
    );
  } finally {
    deleteConfig(configPath);
  }
}

async function scanWithConfig(
  options: TestConfig,
  policyEnginePath: string,
  rulesBundlePath: string,
  configPath: string,
): Promise<TestOutput> {
  const args = processFlags(options, rulesBundlePath, configPath);

  args.push(...options.paths);

  let process;
  try {
    process = await runSnykIacTest(policyEnginePath, args);
  } catch (err) {
    throw new ScanError(`spawning process: ${err}`);
  }

  debug('policy engine standard error:\n%s', '\n' + process.stderr);

  if (process.code && process.code !== 0) {
    throw new ScanError(`invalid exit status: ${process.code}`);
  }

  let snykIacTestOutput: SnykIacTestOutput;

  try {
    snykIacTestOutput = JSON.parse(process.stdout);
  } catch (e) {
    throw new ScanError(`invalid output encoding: ${e}`);
  }

  return mapSnykIacTestOutputToTestOutput(snykIacTestOutput);
}

function processFlags(
  options: TestConfig,
  rulesBundlePath: string,
  configPath: string,
) {
  const flags = [
    '-cache-dir',
    systemCachePath,
    '-bundle',
    rulesBundlePath,
    '-config',
    configPath,
  ];

  if (options.severityThreshold) {
    flags.push('-severity-threshold', options.severityThreshold);
  }

  if (options.attributes?.criticality) {
    flags.push(
      '-project-business-criticality',
      options.attributes.criticality.join(','),
    );
  }

  if (options.attributes?.environment) {
    flags.push(
      '-project-environment',
      options.attributes.environment.join(','),
    );
  }

  if (options.attributes?.lifecycle) {
    flags.push('-project-lifecycle', options.attributes.lifecycle.join(','));
  }

  if (options.projectTags) {
    const stringifiedTags = options.projectTags
      .map((tag) => {
        return `${tag.key}=${tag.value}`;
      })
      .join(',');
    flags.push('-project-tags', stringifiedTags);
  }

  if (options.report) {
    flags.push('-report');
  }

  if (options.targetReference) {
    flags.push('-target-reference', options.targetReference);
  }

  if (options.targetName) {
    flags.push('-target-name', options.targetName);
  }

  if (options.remoteRepoUrl) {
    flags.push('-remote-repo-url', options.remoteRepoUrl);
  }

  return flags;
}

function createConfig(options: TestConfig): string {
  try {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snyk-'));
    const tempConfig = path.join(tempDir, 'config.json');

    const configData = JSON.stringify({
      org: options.orgSettings.meta.org,
      apiUrl: config.API,
      apiAuth: getAuthHeader(),
      allowAnalytics: allowAnalytics(),
    });

    fs.writeFileSync(tempConfig, configData);

    return tempConfig;
  } catch (e) {
    throw new ScanError(`unable to create config file: ${e}`);
  }
}

function deleteConfig(configPath) {
  try {
    rimraf.sync(path.dirname(configPath));
  } catch (e) {
    debug('unable to delete temporary directory', e);
  }
}

async function runSnykIacTest(
  policyEnginePath: string,
  args: string[],
): Promise<{
  signal: NodeJS.Signals | null;
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    const stdoutChunks: Uint8Array[] = [];
    const stderrChunks: Uint8Array[] = [];

    const process = childProcess.spawn(policyEnginePath, args, {
      stdio: 'pipe',
    });

    process.on('exit', (code, signal) => {
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
        stderr: Buffer.concat(stderrChunks).toString('utf-8'),
        code,
        signal,
      });
    });

    process.on('error', (e) => {
      reject(e);
    });

    process.stdout.on('data', (data) => {
      stdoutChunks.push(data);
    });

    process.stdout.on('error', (err) => {
      reject(err);
    });

    process.stderr.on('data', (data) => {
      stderrChunks.push(data);
    });
  });
}

class ScanError extends CustomError {
  constructor(message: string) {
    super(message);
    this.code = IaCErrorCodes.PolicyEngineScanError;
    this.strCode = getErrorStringCode(this.code);
    this.userMessage = 'An error occurred when running the scan';
  }
}
