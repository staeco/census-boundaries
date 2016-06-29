/*eslint no-console: 0 */

import async from 'async'
import { Buffer } from 'buffer'
import path from 'path'
import chalk from 'chalk'
import toJSON from 'shp2json'
import plural from 'plural'
import defaultsDeep from 'lodash.defaultsdeep'
import once from 'once'
import _debug from 'debug'
import config from './defaultConfig'
import getFTP from './getFTP'
const debug = _debug('census')

export default (overrides, { onBoundary, onFinish }) => {
  if (!onBoundary) throw new Error('Missing onBoundary!')
  if (!onFinish) throw new Error('Missing onFinish!')
  onFinish = once(onFinish)
  const options = defaultsDeep({}, overrides, config)

  debug(chalk.bold('Establishing connection:'))
  debug(`  -- ${chalk.cyan(`US Census Bureau @ ${options.ftp.host}`)}`)

  getFTP(options, (err, ftp) => {
    if (err) return onFinish(err)
    const context = {
      ftp,
      options,
      onBoundary
    }

    async.forEachSeries(options.objects, processObject.bind(null, context), onFinish)
  })
}

function processObject(context, object, cb) {
  cb = once(cb)
  fetchObjectFiles(context, object, (err, filePaths) => {
    if (err) return cb(err)
    debug(chalk.bold(`Processing ${filePaths.length} boundary ${plural('file', filePaths.length)} for ${object}`))
    async.forEachSeries(filePaths, processFilePath.bind(null, context), cb)
  })
}

function processFilePath(context, file, cb) {
  cb = once(cb)
  const { ftp } = context
  ftp.get(file.path, (err, stream) => {
    if (err) return cb(err)

    const srcStream = toJSON(stream)
    const chunks = []

    srcStream.on('data', (data) => {
      chunks.push(data)
    })

    srcStream.once('error', (err) => cb(err))
    srcStream.once('end', () => {
      const docs = JSON.parse(Buffer.concat(chunks)).features
      debug(`  -- ${chalk.cyan(`Parsed ${file.path}, inserting ${docs.length} boundaries now...`)}`)
      async.forEachSeries(docs, context.onBoundary.bind(null, file.type), cb)
    })

    stream.resume()
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
