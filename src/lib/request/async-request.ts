import * as needle from 'needle';

import { makeRequest } from './request';
import type { Payload } from './types';
import { FailedToRunTestError, InternalServerError } from '../errors';

export async function makeAsyncRequest(
  orgId: string, body: any,
): Promise<{ res: needle.NeedleResponse; body: any }> {
  // TODO: If payload is a list of results from --all-projects
  //          pMap those requests
  //          poll for one of the IDs at a time
  //          when it's complete poll for the next ID immediately

  // Begin
  const initTestPayload: Payload = {
    url: `https://api.dev.snyk.io/hidden/orgs/${orgId}/test`,
    method: 'post',
    headers: {},
    body
  };

  const id = (await makeRequest(initTestPayload))?.body?.data?.attributes?.id;
  if (!id) {
    throw new FailedToRunTestError('');
  }
  // Poll
  // TODO: add timeouts/retries
  const pollingPayload: Payload = {
    url: `https://api.dev.snyk.io/hidden/orgs/${orgId}/test/${id}`,
    method: 'get',
    headers: {},
    body: {}
  };
  await poll(pollingPayload, id); // blocked till we have results, time bounded

  // Fetch results
  const fetchResultPayload: Payload = {
    url: `https://api.dev.snyk.io/hidden/orgs/${orgId}/result/${id}`,
    method: 'get',
    headers: {},
    body: {}
  };
  const result = await makeRequest(fetchResultPayload);

  return result.body;
}

export async function poll(payload, id) {
  let state = 'pending';

  try {
    const { body: { data: { attributes }} } = await makeRequest({
        ...payload,
        method: 'get',
        url: `${payload.url}`,
      });

    state = attributes.state;
  } catch (err) {
    throw new InternalServerError('Something happened! Please try again!');
  }

  if (state === 'pending') {
      // TODO: `all-project` use-case
      await sleep(2_000);
      
      return poll(payload, id);
  }

  if (state === 'failed') {
      throw new FailedToRunTestError('Test state polling failed, please try again!');
  }

}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
