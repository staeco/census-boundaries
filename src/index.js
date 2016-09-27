import async from 'async'
import path from 'path'
import chalk from 'chalk'
import toJSON from 'shp2json'
import JSONStream from 'JSONStream'
import map from 'through2-asyncmap'
import plural from 'plural'
import defaultsDeep from 'lodash.defaultsdeep'
import once from 'once'
import config from './defaultConfig'
import getFTP from './getFTP'
import _debug from 'debug'
const debug = _debug('census')

export default (overrides, { onBoundary, onFinish }) => {
  if (!onBoundary) throw new Error('Missing onBoundary!')
  if (!onFinish) throw new Error('Missing onFinish!')
  onFinish = once(onFinish)
  const options = defaultsDeep({}, overrides, config)

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
  const { ftp } = context
  ftp.get(file.path, (err, srcStream) => {
    if (err) return cb(err)

    let count = 0
    toJSON(srcStream)
      .pipe(JSONStream.parse('features.*'))
      .pipe(map.obj((feat, done) => {
        ++count
        context.onBoundary(file.type, feat, done)
      }))
      .once('error', (err) => cb(err))
      .once('end', () => {
        debug(`  -- ${chalk.cyan(`Parsed ${file.path} and inserted ${count} boundaries`)}`)
        cb()
      })

    srcStream.resume()
  })
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
