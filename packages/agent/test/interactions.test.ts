import * as assert from 'assert'
import * as sinon from 'sinon'

import {
  INTERACTION_TYPE_ACTION,
  INTERACTION_TYPE_LOOK
} from '../src/constants'
import InteractionEventEmitter from '../src/interactions'

describe('interacts', () => {
  it('init', () => {
    const instance: InteractionEventEmitter = new InteractionEventEmitter()
    assert(typeof instance.bind === 'function')
    assert(typeof instance.unbind === 'function')
    assert(typeof instance.init === 'function')
  })

  it('emit look when touch start', () => {
    const spy = sinon.spy()
    const instance: InteractionEventEmitter = new InteractionEventEmitter()
    const target = window.addEventListener ? window : document.body
    const touchstartEvent = new TouchEvent('touchstart', {
      touches: [
        new Touch({
          identifier: 1,
          target: new EventTarget(),
          pageY: 1,
          pageX: 1
        }),
        new Touch({
          identifier: 2,
          target: new EventTarget(),
          pageY: 2,
          pageX: 2
        })
      ]
    })

    instance.on(INTERACTION_TYPE_LOOK, spy)
    target.dispatchEvent(touchstartEvent)
    sinon.assert.calledOnce(spy)
  })
})
