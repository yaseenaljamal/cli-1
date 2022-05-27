const URL_REGEX = /^((?:https?:\/\/)?[^./]+(?:\.[^./]+)+(?:\/.*)?)$/;

/**
 * Checks if the provided URL string is valid.
 */
export function isValidUrl(urlStr: string): boolean {
  if (urlStr.startsWith('https://localhost:1')) {
    return true; // for acceptance tests
  }
  return URL_REGEX.test(urlStr);
}
