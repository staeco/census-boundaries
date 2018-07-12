'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _shp2json = require('shp2json');

var _shp2json2 = _interopRequireDefault(_shp2json);

var _urlJoin = require('url-join');

var _urlJoin2 = _interopRequireDefault(_urlJoin);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _JSONStream = require('JSONStream');

var _JSONStream2 = _interopRequireDefault(_JSONStream);

var _through2Asyncmap = require('through2-asyncmap');

var _through2Asyncmap2 = _interopRequireDefault(_through2Asyncmap);

var _plural = require('plural');

var _plural2 = _interopRequireDefault(_plural);

var _lodash = require('lodash.clone');

var _lodash2 = _interopRequireDefault(_lodash);

var _once = require('once');

var _once2 = _interopRequireDefault(_once);

var _pump = require('pump');

var _pump2 = _interopRequireDefault(_pump);

var _defaultConfig = require('./defaultConfig');

var _defaultConfig2 = _interopRequireDefault(_defaultConfig);

var _getFTP = require('./getFTP');

var _getFTP2 = _interopRequireDefault(_getFTP);

var _debug2 = require('debug');

var _debug3 = _interopRequireDefault(_debug2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug3.default)('census');

exports.default = function (_ref) {
  var objects = _ref.objects,
      onBoundary = _ref.onBoundary,
      onFinish = _ref.onFinish;

  if (!onBoundary) throw new Error('Missing onBoundary!');
  if (!onFinish) throw new Error('Missing onFinish!');
  onFinish = (0, _once2.default)(onFinish);

  var options = (0, _lodash2.default)(_defaultConfig2.default);
  if (objects) options.objects = objects;

  debug(_chalk2.default.bold('Establishing connection:'));
  debug('  -- ' + _chalk2.default.cyan('US Census Bureau @ ' + options.ftp.host));

  (0, _getFTP2.default)(options.ftp, function (err, ftp) {
    if (err) return onFinish(err);
    var context = {
      ftp: ftp,
      options: options,
      onBoundary: onBoundary
    };

    _async2.default.forEachSeries(options.objects, _async2.default.ensureAsync(processObject.bind(null, context)), onFinish);
  });
};

function processObject(context, object, cb) {
  cb = (0, _once2.default)(cb);
  fetchObjectFiles(context, object, function (err, filePaths) {
    if (err) return cb(err);
    debug(_chalk2.default.bold('Processing ' + filePaths.length + ' boundary ' + (0, _plural2.default)('file', filePaths.length) + ' for ' + object));
    _async2.default.forEachSeries(filePaths, _async2.default.ensureAsync(processFilePath.bind(null, context)), cb);
  });
}

function processFilePath(context, file, cb) {
  cb = (0, _once2.default)(cb);
  var ftp = context.ftp,
      options = context.options;

  var srcStream = _superagent2.default.get((0, _urlJoin2.default)(options.http, file.path)).buffer(false);
  var count = 0;
  (0, _pump2.default)((0, _shp2json2.default)(srcStream), _JSONStream2.default.parse('features.*'), _through2Asyncmap2.default.obj(function (feat, done) {
    ++count;
    context.onBoundary(file.type, feat, done);
  }), function (err) {
    if (err) return cb(err);
    debug('  -- ' + _chalk2.default.cyan('Parsed ' + file.path + ' and inserted ' + count + ' boundaries'));
    cb();
  });
}

function fetchObjectFiles(_ref2, object, cb) {
  var ftp = _ref2.ftp,
      options = _ref2.options;

  cb = (0, _once2.default)(cb);
  var folderName = _path2.default.join(options.base, object);
  ftp.list(folderName, function (err, list) {
    if (err) return cb(err);
    var newList = list.filter(function (i) {
      return i.type === '-';
    }).map(function (i) {
      return {
        type: object,
        path: _path2.default.join(folderName, i.name)
      };
    });
    cb(null, newList);
  });
}
module.exports = exports['default'];