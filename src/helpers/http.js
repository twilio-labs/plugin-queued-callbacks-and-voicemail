import { logger } from '.';

/**
 * makes a post request
 * @param url   the url to post to
 * @param requestInfo  the request info
 * @param options the options
 * @param options.noJson if set, response is not parsed
 * @param options.verbose   if set, will wrap the response in a verbose log
 * @param options.title     if title to use with the verbose
 * @return {Promise<any>}
 */
const _post = async (url, requestInfo, options) => {
  options = options || {};
  requestInfo.method = 'POST';

  const promise = fetch(url, requestInfo).then((resp) => {
    if (options.noJson) {
      return resp;
    }
    return resp.json();
  });
  if (options.verbose && options.title) {
    promise
      .then(() => {
        logger.info(`==== ${options.title} was successful ====`);
      })
      .catch((error) => {
        logger.error(`${options.title} failed:`, error);
      });
  }

  return promise;
};
/**
 * makes a post request
 * @param url   the url to post to
 * @param data  the data
 * @param options the options
 * @param options.noJson if set, response is not parsed
 * @param options.verbose   if set, will wrap the response in a verbose log
 * @param options.title     if title to use with the verbose
 * @return {Promise<any>}
 */
export const post = async (url, data = {}, options) => {
  return _post(
    url,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    },
    options,
  );
};

/**
 * makes a post request
 * @param url   the url to post to
 * @param data  the data
 * @param options the options
 * @param options.noJson if set, response is not parsed
 * @return {Promise<any>}
 */
export const postUrlEncoded = async (url, data, options) => {
  return _post(
    url,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: JSON.stringify(data),
    },
    options,
  );
};
