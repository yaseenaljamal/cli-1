import { MethodArgs } from '../args';
import { promises, Stats } from 'fs';
import * as crypto from 'crypto';
import * as AdmZip from 'adm-zip';
import * as ora from 'ora';
import { vulnerableHashes } from './log4shell-hashes';

const readFile = promises.readFile;
const readDir = promises.readdir;
const stat = promises.stat;
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 - 1;

type Signature = {
  hash: string;
  path: string;
};
type Path = string;
type FileContent = Buffer;
type Digest = string;

interface FileHandler {
  (filePath: string, stats: Stats): void;
}

const errors: any[] = [];

async function startSpinner(): Promise<ora.Ora> {
  const spinner: ora.Ora = ora({ isSilent: false, stream: process.stdout });
  spinner.text = `Looking for Log4Shell...`;
  spinner.start();

  return spinner;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function log4shell(...args: MethodArgs): Promise<void> {
  console.log(
    'Please note this command is for already built artifacts. To test source code please use `snyk test`.',
  );

  const signatures: Array<Signature> = new Array<Signature>();
  const paths: Path[] = await find('.');
  const spinner = await startSpinner();

  const entries = EntriesFromPaths(paths);
  await handleEntries(entries, signatures);

  spinner.stop();

  const results: Set<string> = new Set();
  signatures.forEach((signature) => {
    const path = signature.path.replace(
      /(.*org\/apache\/logging\/log4j\/core).*/,
      '$1',
    );
    results.add(path);
  });

  console.log('\nResults:');
  if (results.size != 0) {
    console.log('A vulnerable version of log4j was detected:');
    results.forEach((path) => {
      console.log(`\t ${path}`);
    });
    console.log(`\n We highly recommend fixing this vulnerability. If it cannot be fixed by upgrading, see mitigation information here:
      \t- https://security.snyk.io/vuln/SNYK-JAVA-ORGAPACHELOGGINGLOG4J-2314720
      \t- https://snyk.io/blog/log4shell-remediation-cheat-sheet/`);

    exitWithError();
  }
  console.log('No known vulnerable version of log4j was detected');
}

interface Entry {
  getData: () => Promise<Buffer>;
  getPath: () => Promise<string>;
}

function EntriesFromPaths(paths: string[]): Entry[] {
  const entries: Entry[] = paths.map((path) => {
    return {
      getData: async () => await readFile(path),
      getPath: async () => path,
    };
  })

  return entries
}

function EntriesFromZipEntries(parent: string, entries: any[]): Entry[] {
  return entries.map((entry) => {
    return {
      getData: async () => entry.getData(),
      getPath: async () => parent + '/' + entry.entryName,
    };
  })
}

async function handleEntries(entries: Entry[], accumulator: Array<Signature>): Promise<void> {
  for(const entry of entries) {
    const path = await entry.getPath();
    const content = await entry.getData();

    if (isJvmFile(path) || isJavaArchive(path)) {
      const hash = await computeDigest(content);

      if (vulnerableHashes.includes(hash)) {
        accumulator.push({
          hash,
          path,
        });
        continue;
      }
    }

    if (!isJavaArchive(path)) {
      continue;
    }

    try {
      const zip = new AdmZip(content);
      const files = zip.getEntries().filter((e) => !e.isDirectory)
      const entries = EntriesFromZipEntries(path, files);

      await handleEntries(entries, accumulator);
    } catch (error) {
      errors.push(error);
    }
  }
}

async function computeDigest(content: FileContent): Promise<Digest> {
  const hash = crypto.createHash('md5').update(content);
  return hash.digest('base64').replace(/=/g, '');
}

async function find(path: Path): Promise<Path[]> {
  const result: Path[] = [];

  await traverse(path, (filePath: string, stats: Stats) => {
    if (!stats.isFile() || stats.size > MAX_FILE_SIZE) {
      return;
    }
    result.push(filePath);
  });

  return result;
}

async function traverse(path: Path, handle: FileHandler) {
  try {
    const stats = await stat(path);

    if (!stats.isDirectory()) {
      handle(path, stats);
      return;
    }

    const entries = await readDir(path);
    for (const entry of entries) {
      const absolute = path + '/' + entry;
      await traverse(absolute, handle);
    }
  } catch (error) {
    errors.push(error);
  }
}

function isJavaArchive(path: Path) {
  return path.endsWith('.jar') || path.endsWith('.war') || path.endsWith('ear');
}

function isJvmFile(path: Path) {
  return path.endsWith('.java') || path.endsWith('.class');
}

function exitWithError() {
  const err = new Error() as any;
  err.code = 'VULNS';

  throw err;
}
