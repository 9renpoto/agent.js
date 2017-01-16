/* @flow */
import { describe, it, beforeEach } from 'mocha'
import assert from 'assert'
import { random, internet } from 'faker'
import Raven from 'raven-js'

describe('core', () => {
  const Agent = require('../src/core').default
  const Base = require('../src/events').default

  let agent
  beforeEach(() => {
    class Events extends Base {
      bind () {
        super.bind(window, 'click', e => { console.log(e) })
      }
    }

    agent = new Agent(
      random.alphaNumeric(),
      [
        Events
      ],
      {
        baseUrl: internet.url(),
        cookieName: random.alphaNumeric(),
        cookieDomain: random.alphaNumeric(),
        cookieExpires: 0,
        Raven: Raven
      }
    )
  })

  it('instance', () => {
    assert(agent)
  })

  it('send', () => {
    agent.send('pageview', location.pathname)
  })

  it('destroy', () => {
    agent.destroy()
  })

  it('listen', () => {
    agent.listen()
  })
})
