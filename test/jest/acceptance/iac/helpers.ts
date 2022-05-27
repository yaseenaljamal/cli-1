import { exec } from 'child_process';
import { join } from 'path';
import { fakeServer } from '../../../acceptance/fake-server';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import {getFixturePath} from "../../util/getFixturePath";

/**
 * Starts a local version of the fixture webserver and returns
 * two utilities.
 * - `run()` which will execute a terminal command with the environment
 *   variables set.
 * - `teardown()` which will shutdown the server.
 * It optionally creates a server for a mock OCI Registry, used for custom rules.
 */
export async function startMockServer(repo?: string, tag?: string) {
  const SNYK_TOKEN = '123456789';
  const BASE_API = '/api/v1';
  const server = fakeServer(BASE_API, SNYK_TOKEN);
  // Use port of 0 to find a free port.
  await new Promise((resolve) => server.listen(0, resolve));

  let ociRegistryServer;
  if (repo && tag) {
    ociRegistryServer = fakeOCIRegistryServer(repo, tag)

    // Use port of 1 to find a free port and https because @snyk/docker-registry-v2-client appends https
    await ociRegistryServer.listenWithHttps(1, {
      /**
       * key and cert were generating using the command below from https://gist.github.com/cecilemuller/9492b848eb8fe46d462abeb26656c4f8:
       * openssl req -x509 -nodes -new -sha256 -days 1024 -newkey rsa:2048 -keyout localhost.key -out RootCA.pem -subj "/C=US/CN=Example-Root-CA"
       * openssl x509 -outform pem -in RootCA.pem -out RootCA.crt
       * openssl req -new -nodes -newkey rsa:2048 -keyout localhost.key -out localhost.csr -subj "/C=US/ST=YourState/L=YourCity/O=Example-Certificates/CN=localhost.local"
       * openssl x509 -req -sha256 -days 1024 -in localhost.csr -CA RootCA.pem -CAkey RootCA.key -CAcreateserial -extfile domains.ext -out localhost.crt
       */
      key: fs.readFileSync(getFixturePath('fake-server/localhost-valid.key')),
      cert: fs.readFileSync(
          getFixturePath('fake-server/localhost-valid.cert'),
      ),
    });
  }

  const SNYK_HOST = 'http://localhost:' + server.getPort();
  const SNYK_API = SNYK_HOST + BASE_API;

  const env: Record<string, string> = {
    PATH: process.env.PATH ?? '',
    SNYK_TOKEN,
    SNYK_API,
    SNYK_HOST,
    // Override any local config set via `snyk config set`
    SNYK_CFG_API: SNYK_TOKEN,
    SNYK_CFG_ENDPOINT: SNYK_API,
  };

  return {
    server,
    run: async (
      cmd: string,
      overrides?: Record<string, string>,
      cwd?: string,
    ) => run(cmd, { ...env, ...overrides }, cwd),
    teardown: async () => new Promise((resolve) => {
      server.close(resolve);
      ociRegistryServer?.close(resolve);
    }),
    apiUrl: SNYK_API,
  };
}

/**
 * Run a command from within the test/fixtures directory.
 */
export async function run(
  cmd: string,
  env: Record<string, string> = {},
  cwd?: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const root = join(__dirname, '../../../../');
    const main = join(root, 'bin/snyk');
    const snykCommand = process.env.TEST_SNYK_COMMAND || `node ${main}`;
    const child = exec(
      cmd.trim().replace(/^snyk/, snykCommand),
      {
        env: {
          // Home and cache env vars for CLIv2 cache directory
          HOME: process.env.HOME,
          LocalAppData: process.env.LOCALAPPDATA,
          XDG_CACHE_HOME: process.env.XDG_CACHE_HOME,
          ...env,
        },
        cwd: cwd ?? join(root, 'test/fixtures'),
      },
      function(err, stdout, stderr) {
        // err.code indicates the shell exited with non-zero code
        // which is in our case a success and we resolve.
        if (err && typeof err.code !== 'number') {
          reject(err);
        } else {
          if (child.exitCode === null) throw Error();
          resolve({ stderr, stdout, exitCode: child.exitCode });
        }
      },
    );
  });
}

export function isValidJSONString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

export type FakeOCIRegistryServer = {
  listenWithHttps: (
      port: string | number,
      options: https.ServerOptions,
  ) => Promise<void>;
  close: (callback: () => void) => void;
};

export const fakeOCIRegistryServer = (repo: string, tag: string): FakeOCIRegistryServer => {
  let server: http.Server | undefined = undefined;

  const layerDigest = 'mockLayerDigest'

  const app = express();
  app.use(bodyParser.json({ limit: '50mb' }));
  // Content-Type for rest API endpoints is 'application/vnd.api+json'
  app.use(express.json({ type: 'application/vnd.api+json', strict: false }));

  app.get('/v2/' + repo + '/manifests/' + tag, (req, res) => {
    const manifest = {
      schemaVersion: 2,
      mediaType: '',
      config: {
        mediaType: 'application/vnd.oci.image.config.v1+json',
        digest: 'mockConfigDigest',
        size: 60
      },
      layers: [
        {
          mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
          digest: layerDigest,
          size: 49101,
          annotations: {
            'org.opencontainers.image.title': 'bundle.tar.gz',
          }
        }
      ],
      manifestDigest: 'mockManifestDigest'
    };

    return res.status(200).send(manifest);
  });

  app.get('/v2/' + repo + '/blobs/' + layerDigest, (req, res) => {
    const customRulesTarball = fs.readFileSync(path.join(__dirname, '../../../fixtures/iac/custom-rules/custom.tar.gz'))
    return res.status(200).send(customRulesTarball);
  });

  app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send('Something broke!')
  })

  const listenWithHttps = (
      port: string | number,
      options: https.ServerOptions,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      server = https.createServer(options, app);
      server.once('listening', () => {
        resolve();
      });
      server.once('error', (err) => {
        reject(err);
      });
      server.listen(Number(port));
    });
  };

  const close = (callback: () => void) => {
    if (!server) {
      callback();
      return;
    }
    server.close(callback);
    server = undefined;
  };

  return {
    listenWithHttps,
    close,
  };
};
