import * as assert from 'assert'
import * as sinon from 'sinon'

import {
  INTERACTION_TYPE_LOOK
} from '../src/constants'
import InteractionEventEmitter from '../src/interactions'

describe('interacts', () => {
  it('init', () => {
    const target = window.addEventListener ? window : document.body
    const instance: InteractionEventEmitter = new InteractionEventEmitter(target)
    assert(typeof instance.bind === 'function')
    assert(typeof instance.unbind === 'function')
    assert(typeof instance.init === 'function')
  })

  it('emit look when touchstart', () => {
    const spy = sinon.spy()
    const clock = sinon.useFakeTimers()
    const target = window.addEventListener ? window : document.body
    const instance: InteractionEventEmitter = new InteractionEventEmitter(target)
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
    sinon.assert.notCalled(spy)
    clock.tick(3000)
    sinon.assert.calledOnce(spy)

    clock.restore()
  })
})
