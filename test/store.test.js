import assert from 'assert'
import { throws } from 'assert-exception'
import { internet, random } from 'faker'

describe('store', () => {
  const Store = require('../src/store').default

  it('throw', () => {
    assert(throws(() => { return new Store() }).message === 'need id & baseurl & cookieName')
  })

  it('env', () => {
    const store = new Store(
      random.alphaNumeric(),
      internet.url(),
      random.alphaNumeric()
    )
    const v = random.number()
    assert(store.merge('env', {v}).env.v === v)
    assert(store.merge('env', {}).env.v === v)
    assert(store.baseUrl)
  })
})
