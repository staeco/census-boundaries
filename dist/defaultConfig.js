'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  ftp: {
    host: 'ftp2.census.gov',
    port: 21
  },
  http: 'https://www2.census.gov',
  base: '/geo/tiger/TIGER2016/',
  objects: ['STATE', 'COUNTY', 'PLACE', 'ZCTA5']
};
module.exports = exports['default'];