/* @flow */
import { describe, it } from 'mocha'
import { random, internet } from 'faker'
import { stub } from 'sinon'
import assert from 'assert'

describe('agent', () => {
  const AgentCore = require('../src/core').default
  const Agent = require('../src/agent').default
  const agent = new Agent()

  it('create', () => {
    assert(agent.create(random.uuid(), { baseUrl: internet.url() }))
  })

  it('send', () => {
    const listen = stub(AgentCore.prototype, 'listen')

    const get = stub(require('../src/requests'), 'get')
    get.callsFake((url, query, onload, onerror) => {
      onload()
    })

    let core = agent.send('pageview')
    assert(core.active)

    core = agent.send('pageview')
    assert(core.active, 'take2')

    listen.restore()
    get.restore()
  })

  it('set', () => {
    assert(agent.set('key', 'value'))
    assert(agent.set({ key: 'value' }))
  })
})
