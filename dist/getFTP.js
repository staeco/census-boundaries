'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ftp = require('ftp');

var _ftp2 = _interopRequireDefault(_ftp);

var _once = require('once');

var _once2 = _interopRequireDefault(_once);

var _debug2 = require('debug');

var _debug3 = _interopRequireDefault(_debug2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug3.default)('census');

var makeConnection = function makeConnection(opt, cb) {
  cb = (0, _once2.default)(cb);
  var client = new _ftp2.default();
  var retry = setTimeout(function () {
    debug('Trying FTP again...');
    client.end();
    makeConnection(opt, cb);
  }, 2000);

  client.once('ready', function () {
    client.removeListener('error', cb);
    clearTimeout(retry);
    cb(null, client);
  });
  client.once('error', cb);

  client.connect(opt);
};

exports.default = makeConnection;
module.exports = exports['default'];