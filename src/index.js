import async from 'async'
import path from 'path'
import chalk from 'chalk'
import toJSON from 'shp2json'
import join from 'url-join'
import request from 'superagent'
import JSONStream from 'JSONStream'
import map from 'through2-asyncmap'
import plural from 'plural'
import clone from 'lodash.clone'
import once from 'once'
import pump from 'pump'
import config from './defaultConfig'
import getFTP from './getFTP'
import _debug from 'debug'
const debug = _debug('census')

export default ({ objects, onBoundary, onFinish }) => {
  if (!onBoundary) throw new Error('Missing onBoundary!')
  if (!onFinish) throw new Error('Missing onFinish!')
  onFinish = once(onFinish)

  const options = clone(config)
  if (objects) options.objects = objects

  debug(chalk.bold('Establishing connection:'))
  debug(`  -- ${chalk.cyan(`US Census Bureau @ ${options.ftp.host}`)}`)

  getFTP(options.ftp, (err, ftp) => {
    if (err) return onFinish(err)
    const context = {
      ftp,
      options,
      onBoundary
    }

    async.forEachSeries(options.objects, async.ensureAsync(processObject.bind(null, context)), onFinish)
  })
}

function processObject(context, object, cb) {
  cb = once(cb)
  fetchObjectFiles(context, object, (err, filePaths) => {
    if (err) return cb(err)
    debug(chalk.bold(`Processing ${filePaths.length} boundary ${plural('file', filePaths.length)} for ${object}`))
    async.forEachSeries(filePaths, async.ensureAsync(processFilePath.bind(null, context)), cb)
  })
}

function processFilePath(context, file, cb) {
  cb = once(cb)
  const { ftp, options } = context
  const srcStream = request.get(join(options.http, file.path)).buffer(false)
  let count = 0
  pump(
    toJSON(srcStream),
    JSONStream.parse('features.*'),
    map.obj((feat, done) => {
      ++count
      context.onBoundary(file.type, feat, done)
    }),
    (err) => {
      if (err) return cb(err)
      debug(`  -- ${chalk.cyan(`Parsed ${file.path} and inserted ${count} boundaries`)}`)
      cb()
    }
  )
}

function fetchObjectFiles({ ftp, options }, object, cb) {
  cb = once(cb)
  const folderName = path.join(options.base, object)
  ftp.list(folderName, (err, list) => {
    if (err) return cb(err)
    const newList = list
      .filter((i) => i.type === '-')
      .map((i) => ({
        type: object,
        path: path.join(folderName, i.name)
      }))
    cb(null, newList)
  })
}
