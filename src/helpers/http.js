/**
 * makes a post request
 * @param url   the url to post to
 * @param data  the data
 * @return {Promise<any>}
 */
export const post = async (url, data = {}) => {
  return (
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  ).json();
};

/**
 * makes a post request
 * @param url   the url to post to
 * @param data  the data
 * @return {Promise<any>}
 */
export const postUrlEncoded = async (url, data = {}) => {
  return (
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: JSON.stringify(data),
    })
  ).json();
};
