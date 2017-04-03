/* @flow */
import EventEmitter from 'events'
import { UIEventObserver } from 'ui-event-observer'
import { find, save } from 'auto-cookie'
import cookies from 'js-cookie'
import { v4 as uuid } from 'uuid'

import { get, obj2query } from './requests'
import { getEnv } from './browser'
import { setup, raise, warning } from './logger'
import {
  INTERVAL as INTERVAL_DEFAULT_SETTING,
  INTERACT as MAX_INTERACT
} from './constants'
import Store from './store'

import type {
  EventType,
  Interact,
  SendType,
  Settings,
  State
} from './types'

const EMIT_NAME = 'POINT'

function generateId () {
  return uuid().replace(/-/g, '')
}

function findOrCreateClientId (cookieName: string, cookieDomain: string, cookieExpires: ?number): string {
  const options = {domain: cookieDomain, expires: cookieExpires}
  const c = cookies.get(cookieName, options)
  if (c) {
    return c
  }
  cookies.set(cookieName, generateId(), options)
  return cookies.get(cookieName, options)
}

function findOrCreateClientIdAuto (cookieName: string, cookieExpires) {
  const c = find(cookieName, cookieExpires)
  if (c) {
    return c
  }
  return save(cookieName, generateId(), cookieExpires)
}

function cacheValidator (data: Object): boolean {
  if (data.x >= 0 && data.y >= 0 && data.type &&
    typeof data.left === 'number' && typeof data.top === 'number') {
    return true
  }
  return false
}

function toInt (n: number) {
  return parseInt(n, 10)
}

function createInteractData (d: Interact): string {
  if (!cacheValidator(d)) {
    return ''
  }
  return `${d.type},${d.id},${toInt(d.x)},${toInt(d.y)},${toInt(d.left)},${toInt(d.top)}`
}

function getInteractTypes (eventName: EventType): string[] {
  switch (eventName) {
    case 'click':
    case 'touchend':
      return ['l', 'a']
    case 'scroll':
    case 'mousemove':
      return ['l']
  }
  return []
}

export default class Agent extends Store {
  _baseUrl: string
  _cache: {a: Object, l: Object}
  _emitter: EventEmitter
  _events: any[]
  _id: number
  _interacts: Interact[]
  _interval: number[]
  _loaded: boolean
  _stop: boolean
  constructor (id: string, eventsClass: any[], {RAVEN_DSN, Raven, baseUrl, cookieDomain, cookieExpires, cookieName, auto}: Settings): void {
    super()
    setup(RAVEN_DSN, Raven)

    this._clear()
    this._events = []
    this._interacts = []
    this._interval = []
    this._id = 0
    this._emitter = new EventEmitter()

    const observer = new UIEventObserver() // singleton
    eventsClass.forEach(Class => {
      this._events.push(new Class(EMIT_NAME, this._emitter, observer))
    })
    let userId
    if (auto) {
      userId = findOrCreateClientIdAuto(cookieName, cookieExpires)
    } else {
      userId = findOrCreateClientId(cookieName, cookieDomain, cookieExpires)
    }
    if (id && userId) {
      this._baseUrl = `${baseUrl}/${id}/${userId}`
    }
  }

  _updateInteractCache (data: Object): void {
    if (cacheValidator(data) && !this._stop) {
      const types = getInteractTypes(data.type)
      types.forEach(type => {
        this._cache[type] = Object.assign({}, data, {type})
      })
    } else {
      warning(`failed ${data.type}`, data)
      this._stop = true
    }
  }

  _sendInteracts (force: ?boolean): void {
    const query: string[] = []
    this._interacts.forEach(data => {
      const q = createInteractData(data)
      if (q.length) {
        query.push(`d=${q}`)
      }
    })

    if (this._baseUrl && (query.length >= MAX_INTERACT || force)) {
      get(`${this._baseUrl}/int.gif`, query)
      this._interacts.length = 0
    }
  }
  _clear () {
    this._cache = {
      a: {},
      l: {}
    }
  }

  _sendInteractsWithUpdate (): void {
    Object.keys(this._cache).forEach(key => {
      if (cacheValidator(this._cache[key])) {
        this._interacts.push(Object.assign({}, this._cache[key], {
          id: this._id
        }))
      }
    })

    this._clear()
    this._sendInteracts()

    if (!this._stop) {
      const delay = this._interval.shift()
      if (delay >= 0) {
        setTimeout(this._sendInteractsWithUpdate.bind(this), delay * 1000)
      }
      this._id++
    }
  }

  send (type: SendType, page: string): void {
    switch (type) {
      case 'pageview':
        const env = getEnv(page)
        if (!env || !this._baseUrl) {
          return warning(`failed init`)
        }
        const state: State = this.merge({
          type: 'env',
          data: env
        })

        this._interval = INTERVAL_DEFAULT_SETTING.concat()
        this._id = 0
        const data = Object.assign({}, state.env, state.custom)
        this._baseUrl = `${this._baseUrl}/${Date.now()}`
        get(`${this._baseUrl}/env.gif`, obj2query(data))
        this._loaded = true
        this.listen()
    }
  }
  destroy (): void {
    this._sendInteracts(true)

    this._emitter.removeListener(EMIT_NAME, this._updateInteractCache.bind(this))
    this._events.forEach(e => {
      e.off()
    })
    this._loaded = false
    this._baseUrl = ''
  }
  listen (): void {
    if (!this._loaded || this._baseUrl.split('/').length !== 6) {
      raise('need send pageview')
      return
    }
    this._emitter.on(EMIT_NAME, this._updateInteractCache.bind(this))
    this._events.forEach(e => {
      e.on()
    })
    this._sendInteractsWithUpdate()
  }
}
