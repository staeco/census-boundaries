import FTPClient from 'ftp'
import once from 'once'
import _debug from 'debug'
const debug = _debug('census')

const makeConnection = (opt, cb) => {
  cb = once(cb)
  const client = new FTPClient()
  const retry = setTimeout(() => {
    debug('Trying FTP again...')
    client.end()
    makeConnection(opt, cb)
  }, 2000)

  client.once('ready', () => {
    client.removeListener('error', cb)
    clearTimeout(retry)
    cb(null, client)
  })
  client.once('error', cb)

  client.connect(opt)
}

export default makeConnection
