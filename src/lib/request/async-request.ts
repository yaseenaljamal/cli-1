import * as needle from 'needle';
import config from '../config';

import { makeRequestRest } from '../request/promise';
import { TestExecutionResponse } from './types';
import { FailedToRunTestError, InternalServerError } from '../errors';

//TODO: ${config.API_REST_URL} is just placeholder, we need to add a config in to handle hidden endpoints.
export async function makeAsyncRequest(
  orgId: string,
  body: any,
): Promise<{ res: needle.NeedleResponse; body: any }> {
  const { data: { id } = {} } = await makeRequestRest<TestExecutionResponse>({
    url: `${config.API_REST_URL}/hidden/orgs/${orgId}/tests?version=2022-09-06~experimental`,
    method: 'post',
    body: {
      data: {
        attributes: {
          issue_generation_input: body,
          component_type: 'oss',
        },
        type: 'resource',
      },
    },
  });

  if (!id) {
    throw new FailedToRunTestError('');
  }

  const location = await pollTestStatus(
    {
      url: `${config.API_REST_URL}/hidden/orgs/${orgId}/tests/${id}?version=2022-09-06~experimental`,
      method: 'get',
    },
    id,
  ); // blocked till we have results, time bounded

  const result = await makeRequestRest<any>({
    url: `${config.API_REST_URL}/${location}`,
    method: 'get',
  });

  return result.body;
}

export async function pollTestStatus(payload, id) {
  try {
    const {
      data: {
        attributes: { state = '' },
      },
      links: { related },
    } = await makeRequestRest<TestExecutionResponse>({ ...payload });

    if (state === 'pending') {
      // TODO: `all-project` use-case
      await sleep(2_000);

      return pollTestStatus(payload, id);
    }

    if (state === 'failed') {
      throw new FailedToRunTestError(
        'Test state polling failed, please try again!',
      );
    }

    return related;
  } catch (err) {
    throw new InternalServerError('Something happened! Please try again!');
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
