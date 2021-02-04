/**
 * makes a post request
 * @param url   the url to post to
 * @param requestInfo  the request info
 * @param options the options
 * @param options.noJson if set, response is not parsed
 * @return {Promise<any>}
 */
const _post = async (url, requestInfo, options) => {
  options = options || {};
  requestInfo.method = 'POST';

  return fetch(url, requestInfo).then((resp) => {
    if (options.noJson) {
      return resp;
    }
    return resp.json();
  });
};
/**
 * makes a post request
 * @param url   the url to post to
 * @param data  the data
 * @param options the options
 * @param options.noJson if set, response is not parsed
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
