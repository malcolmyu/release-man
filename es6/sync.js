const fetch = require('node-fetch');
const caesar = require('./crypter');
const domain = caesar.decode('iuuq;0021/1/75/22;81130');

module.exports = function syncInnerRegistry(name) {
    return fetch(`${domain}sync/${name}`, { method: 'PUT' })
        .then((response) => { if (!response.ok) { throw new Error(response.statusText); } });
};
