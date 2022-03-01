import { fakeServer } from '../../acceptance/fake-server';
import { createProjectFromWorkspace } from '../util/createProject';
import { runSnykCLI } from '../util/runSnykCLI';

jest.setTimeout(1000 * 60);

describe('--debug', () => {
  let server: ReturnType<typeof fakeServer>;
  let env: Record<string, string>;

  beforeAll((done) => {
    const apiPath = '/api/v1';
    const apiPort = process.env.PORT || process.env.SNYK_PORT || '12345';
    env = {
      ...process.env,
      SNYK_API: 'http://localhost:' + apiPort + apiPath,
      SNYK_TOKEN: '123456789',
      SNYK_DISABLE_ANALYTICS: '1',
    };

    server = fakeServer(apiPath, env.SNYK_TOKEN);
    server.listen(apiPort, () => done());
  });

  afterEach(() => {
    server.restore();
  });

  afterAll((done) => {
    server.close(() => done());
  });

  it('outputs debug logs to stderr', async () => {
    const project = await createProjectFromWorkspace('fail-on/no-vulns');
    const { code, stderr } = await runSnykCLI('test --debug', {
      cwd: project.path(),
      env,
    });
    expect(code).toEqual(0);
    expect(stderr).toContain(
      'snyk sending request to: http://localhost:12345/api/v1/test-dep-graph',
    );
  });
});
