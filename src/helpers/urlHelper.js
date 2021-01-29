import urlJoin from 'url-join';
export const buildUrl = (...uris) => {
    const baseUrl = process.env.REACT_APP_SERVICE_BASE_URL;
    return urlJoin(baseUrl, ...uris);
}
