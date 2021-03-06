/* global FileReader */
// var debug = require('debug')
// var debugPrefix = 'blob-stream:effects'

module.exports = {
  // asynchronous functions that emit an action when done
  // Signature of (data, state, send, done)

  'user selected files': (data, state, send, done) => {
    function readFile (file) {
      var reader = new FileReader()
      reader.onload = () => {
        var dataUrl = reader.result
        send('create torrent', {
          file,
          dataUrl
        }, err => err && done(err))
      }
      reader.readAsDataURL(file)
    }

    var fileList = data.fileList
    for (let prop in fileList) {
      if (isNaN(prop)) continue
      let file = fileList.item(prop)
      readFile(file)
    }
  },

  'create log entry': (data, state, send, done) => {
    // var d = debug(debugPrefix + ':create-log-entry')
    var magnetLink = data.magnetLink
    var dateNow = Date.now()

    let entry = {magnetLink, dateNow}
    state.log.add(null, JSON.stringify(entry), (err, node) => !err || done(err))
  },

  'create torrent': (data, state, send, done) => {
    // var d = debug(debugPrefix + ':create-torrent')
    var file = data.file
    state.swarm.seed(file, {}, torrent => {
      send('create log entry', Object.assign(data, {
        magnetLink: torrent.magnetURI
      }), err => err && done(err))
    })
  },

  'fetch_related_torrent': (data, state, send, done) => {
    //  var d = debug(debugPrefix + ':get-torrent')
    var magnetLink = data.magnetLink
    var torrent = state.swarm.get(magnetLink)

    function handleTorrent (torrent) {
      send('handle_torrent', Object.assign(data, {
        torrent
      }), err => err && done(err))
    }

    if (torrent) {
      handleTorrent(torrent)
      return
    }
    state.swarm.add(magnetLink, {}, torrent => handleTorrent(torrent))
  },

  'handle_torrent': (data, state, send, done) => {
    data.torrent.files[0].getBlobURL((err, dataUrl) => {
      if (err) done(err)
      send('append log entry to state', Object.assign(data, {
        dataUrl
      }), err => err && done(err))
    })
  },

  'sync with peer': (data, state, send, done) => {
    var peer = data.peer

    peer.on('error', err => done(err))
    peer.on('close', () => done('simple-peer closed'))

    var rs = state.log.createReplicationStream({live: true})
    rs.on('end', () => done(new Error('replication stream ended')))

    rs.pipe(peer).pipe(rs)
  }
}
