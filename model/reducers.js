module.exports = {
  // synchronous functions that modify state
  // Signature of (data, state)

  'append-log-entry-to-state': (data, state) => {
    let entry = JSON.parse(data.value.toString())
    let dataUrl = entry.dataUrl
    let date = entry.dateNow
    let newState = Object.assign({}, state)

    newState.blobs.unshift({date, dataUrl})
    return newState
  }
}
