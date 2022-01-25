const fetch = require('node-fetch');

async function getFlexConfig(username, password) {
  try {
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
    };
    const response = await fetch('https://flex-api.twilio.com/v1/Configuration', options);
    const responseJSON = await response.json();
    if (responseJSON.status >= 400) {
      return Promise.reject(new Error(`${responseJSON.message}. Are you sure this is a Flex Project?`));
    }
    return responseJSON;
  } catch (error) {
    throw Promise.reject(new Error(`Error fetching Flex Configuration.\n${error}`));
  }
}

module.exports = { getFlexConfig };
