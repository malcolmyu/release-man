const fetch = require('whatwg-fetch');
const caesar = require('./crypter');
const domain = caesar.decode('iuuq;0021/1/75/22;81130');

export const syncInnerRegistry = (name) => {
    return fetch(`${domain}/sync`, { method: 'PUT' })
        .then((response) => { if (!response.ok) { throw new Error('response-error'); } });
};
