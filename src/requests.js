/* @flow */

function get (url: string, query: Object): void {
  const queryArray = []
  const img = document.createElement('img')
  img.onload = () => null
  img.onerror = () => null
  for (const key in query) {
    queryArray.push(`${key}=${encodeURIComponent(query[key])}`)
  }
  img.src = `${url}?${queryArray.join('&')}`
}

module.exports = {
  get
}
