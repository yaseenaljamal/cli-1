import config from '../config';
import { isCI } from '../is-ci';
import { makeRequest } from '../request/promise';
import { Options } from '../types';

import { assembleQueryString } from '../snyk-test/common';
import { getAuthHeader } from '../api-token';
import { ScanResult } from '../ecosystems/types';

import { ResolveAndTestFactsResponse } from './types';
import { delayNextStep, handleProcessingStatus } from './common';
import { TestDependenciesResult } from '../snyk-test/legacy';

export async function requestTestPollingToken(
  options: Options,
  isAsync: boolean,
  scanResult: ScanResult,
): Promise<ResolveAndTestFactsResponse> {
  const payload = {
    method: 'POST',
    url: `http://localhost:8080/rest/unmanaged-ecosystem/test-dependencies`,
    json: true,
    headers: {
      'x-is-ci': isCI(),
      authorization: getAuthHeader(),
    },
    body: {
      isAsync,
      scanResult,
    },
    qs: { version: '2022-05-23~experimental', ...assembleQueryString(options) },
  };

  const result = await makeRequest<ResolveAndTestFactsResponse>(payload);

  return JSON.parse(result.toString());
}

export async function pollingTestWithTokenUntilDone(
  token: string,
  type: string,
  options: Options,
  pollInterval: number,
  attemptsCount: number,
  maxAttempts = Infinity,
): Promise<TestDependenciesResult> {
  const payload = {
    method: 'GET',
    url: `http://localhost:8080/rest/unmanaged-ecosystem/test-dependencies/${token}`,
    json: true,
    headers: {
      'x-is-ci': isCI(),
      authorization: getAuthHeader(),
    },
    qs: {
      ...assembleQueryString(options),
      type,
      version: '2022-05-23~experimental',
    },
  };

  let response = await makeRequest<ResolveAndTestFactsResponse>(payload);

  response = JSON.parse(response.toString());

  handleProcessingStatus(response);

  if (response.result) {
    const {
      issues,
      issuesData,
      depGraphData,
      depsFilePaths,
      fileSignaturesDetails,
    } = response.result;
    return {
      issues,
      issuesData,
      depGraphData,
      depsFilePaths,
      fileSignaturesDetails,
    };
  }

  await delayNextStep(attemptsCount, maxAttempts, pollInterval);
  return await pollingTestWithTokenUntilDone(
    token,
    type,
    options,
    pollInterval,
    attemptsCount,
    maxAttempts,
  );
}
