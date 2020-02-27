/*
 * GET users listing.
 */

const JSEncrypt = require('node-jsencrypt');

exports.list = function(req, res) {
    res.send("respond with a resource");
};

exports.encrypt = function(req, res) {
    let param = req.body;
    try {
        let data = _encrypt(param.data, param.publicKey);
        res.json({
            Data: data,
            Error: null
        });
    } catch (error) {
        res.json({
            Data: null,
            Error: error
        });
    }

};

function _encrypt(data, publicKey) {
    let encrypt = new JSEncrypt();
    encrypt.setPublicKey(publicKey);
    return encrypt.encrypt(data);
};