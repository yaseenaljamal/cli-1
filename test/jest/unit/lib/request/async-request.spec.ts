import * as nock from 'nock';
import * as syncRequest from '../../../../../src/lib/request/request';
import { makeAsyncRequest } from '../../../../../src/lib/request/async-request';

describe('makeAsyncRequest happy flow', () => {
  let makeRequestSpy;

  beforeEach(() => {
    makeRequestSpy = jest.spyOn(syncRequest, 'makeRequest');
  });

  afterEach(() => {
    makeRequestSpy.mockClear();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it.each`
    pollingAttempts | expectedRequestCount
    ${1}            | ${4}
    ${5}            | ${8}
    ${10}           | ${13}
  `(
    'Number of requests should be $expectedRequestCount given $pollingAttempts attempts made',
    async ({ pollingAttempts, expectedRequestCount }) => {
      // start a mocker
      const testId = '3fa85f64-5717-4562-b3fc-2c963f66afa6t';
      const orgId = 'AAAA-BBBB-CCCC';
      nock('https://api.dev.snyk.io')
        .post(`/hidden/orgs/${orgId}/test`)
        .reply(200, {
          data: {
            attributes: {
              id: testId,
            },
            id: 'd5b640e5-d88c-4c17-9bf0-93597b7a1ce2',
            type: 'resource',
          },
          jsonapi: {
            version: '1.0',
          },
          links: {
            first:
              'https://example.com/api/resource?ending_before=v1.eyJpZCI6IjExIn0K',
            last:
              'https://example.com/api/resource?starting_after=v1.eyJpZCI6IjMwIn0K',
            next:
              'https://example.com/api/resource?starting_after=v1.eyJpZCI6IjEwIn0K',
          },
        })
        .get(`/hidden/orgs/${orgId}/test/${testId}`)
        .times(pollingAttempts)
        .reply(200, {
          data: {
            attributes: {
              state: 'pending',
            },
            id: 'd5b640e5-d88c-4c17-9bf0-93597b7a1ce2',
            type: 'resource',
          },
          jsonapi: {
            version: '1.0',
          },
          links: {
            first:
              'https://example.com/api/resource?ending_before=v1.eyJpZCI6IjExIn0K',
            last:
              'https://example.com/api/resource?starting_after=v1.eyJpZCI6IjMwIn0K',
            next:
              'https://example.com/api/resource?starting_after=v1.eyJpZCI6IjEwIn0K',
          },
        })
        .get(`/hidden/orgs/${orgId}/test/${testId}`)
        .reply(200, {
          data: {
            attributes: {
              state: 'completed',
            },
            id: 'd5b640e5-d88c-4c17-9bf0-93597b7a1ce2',
            type: 'resource',
          },
          jsonapi: {
            version: '1.0',
          },
          links: {
            first:
              'https://example.com/api/resource?ending_before=v1.eyJpZCI6IjExIn0K',
            last:
              'https://example.com/api/resource?starting_after=v1.eyJpZCI6IjMwIn0K',
            next:
              'https://example.com/api/resource?starting_after=v1.eyJpZCI6IjEwIn0K',
          },
        })
        .get(`/hidden/orgs/${orgId}/result/${testId}`)
        .reply(200, {
          data: {
            attributes: {
              results: {},
            },
            id: 'd5b640e5-d88c-4c17-9bf0-93597b7a1ce2',
            type: 'resource',
          },
          jsonapi: {
            version: '1.0',
          },
          links: {
            first:
              'https://example.com/api/resource?ending_before=v1.eyJpZCI6IjExIn0K',
            last:
              'https://example.com/api/resource?starting_after=v1.eyJpZCI6IjMwIn0K',
            next:
              'https://example.com/api/resource?starting_after=v1.eyJpZCI6IjEwIn0K',
          },
        });

      const result = await makeAsyncRequest(orgId, {});

      expect(makeRequestSpy).toHaveBeenCalledTimes(expectedRequestCount);
      expect(result).toEqual({
        data: {
          attributes: {
            results: {},
          },
          id: 'd5b640e5-d88c-4c17-9bf0-93597b7a1ce2',
          type: 'resource',
        },
        jsonapi: {
          version: '1.0',
        },
        links: {
          first:
            'https://example.com/api/resource?ending_before=v1.eyJpZCI6IjExIn0K',
          last:
            'https://example.com/api/resource?starting_after=v1.eyJpZCI6IjMwIn0K',
          next:
            'https://example.com/api/resource?starting_after=v1.eyJpZCI6IjEwIn0K',
        },
      });
    },
    120000,
  );
});

describe('makeAsyncRequest error flows', () => {
  it('should return an exception with a proper message when the test service reports a failure while triggering a test', async () => {
    const orgId = 'AAAA-BBBB-CCCC';
    nock('https://api.dev.snyk.io')
      .post(`/hidden/orgs/${orgId}/test`)
      .reply(500, {
        errors: [
          {
            detail: 'I am a teapot',
            status: '500',
          },
        ],
        jsonapi: {
          version: '1.0',
        },
      });

    const t = async () => {
      await makeAsyncRequest(orgId, {});
    };

    await expect(t).rejects.toThrow('test');
  });
});
