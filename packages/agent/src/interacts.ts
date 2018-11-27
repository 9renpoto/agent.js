import * as objectAssign from 'object-assign'

import { EventEmitter } from 'events'
import { UIEventObserver } from 'ui-event-observer'

import { getOffset } from './browser'
import {
  INTERACTION_TYPE_ACTION,
  INTERACTION_TYPE_LOOK,
  INTERVAL as INTERACTION_INTERVALS,
  MAX_INTERACTION_SEQ
} from './constants'
import {
  EventType,
  InteractionData,
  InteractionPosition,
  InteractionType
} from './types'

function getTargetElementFromEvent (event: Event): EventTarget | null {
  return event.target || event.srcElement
}

function getFirstTouch (event: TouchEvent): Touch {
  return event.changedTouches ? event.changedTouches[0] : event.touches[0]
}

export default class InteractionEventEmitter extends EventEmitter {
  private bound: boolean

  private latestLookPosition?: InteractionData
  private latestActionPosition?: InteractionData
  private sequentialNumber: number
  private observer: UIEventObserver
  private intervals: number[]

  // For touch events
  private touchedElement?: EventTarget
  private touchMoved: boolean

  constructor () {
    super()
    this.bound = false
    this.observer = new UIEventObserver() // singleton
    this.initialize()
  }

  public initialize (): void {
    // Call for each page views
    this.latestLookPosition = undefined
    this.latestActionPosition = undefined
    this.sequentialNumber = 0
    this.intervals = INTERACTION_INTERVALS.concat()
  }

  public bind () {
    if (!this.bound) {
      // TODO Bind DOM events
      this.bindEvent('touchstart')
      this.bindEvent('touchmove')
      this.bindEvent('touchend')
      this.bound = true
      this.emitInteract()
    }
  }

  public unbind () {
    if (this.bound) {
      this.observer.unsubscribeAll()
      this.bound = false
    }
  }

  protected bindEvent (
    eventName: EventType
  ) {
    const target = window.addEventListener ? window : document.body
    let listener: string | undefined
    let handler: ((event: Event) => void) | undefined
    switch (eventName) {
      case 'touchstart':
        listener = 'ontouchstart'
        handler = (event: Event) => (this.handleTouchStart(event as TouchEvent))
        break
      default:
        listener = undefined
        handler = undefined
    }
    if (listener && listener in target && handler !== undefined) {
      this.observer.subscribe(target, eventName, (handler: (event: Event) => void) => {
        try {
          if (event !== undefined) {
            handler(event)
          }
        } catch (error) {
          throw error // TODO Log error
        }
      })
    }
  }

  protected updateLatestPosition (
    interactionType: InteractionType,
    position: InteractionPosition
  ) {
    if (position.x >= 0 && position.y >= 0) {
      const { left, top } = getOffset(window)
      const eventPosition = {
        left,
        top,
        y: position.y,
        x: position.x
      }
      if (interactionType === INTERACTION_TYPE_ACTION) {
        this.latestActionPosition = eventPosition
      } else if (interactionType === INTERACTION_TYPE_LOOK) {
        this.latestLookPosition = eventPosition
      }
    }
  }

  protected handleTouchStart (event: TouchEvent): void {
    this.touchMoved = false
    if (event !== undefined) {
      const touchedElement = getTargetElementFromEvent(event)
      if (touchedElement) {
        const touch = getFirstTouch(event)
        if (touch) {
          this.updateLatestPosition(
            INTERACTION_TYPE_LOOK,
            {
              y: touch.pageY,
              x: touch.pageX
            }
          )
        }
      }
    }
  }

  protected handleTouchMove (event: TouchEvent) {
    this.touchMoved = true
    this.touchedElement = undefined
    const touch = getFirstTouch(event)
    if (touch) {
      this.updateLatestPosition(
        INTERACTION_TYPE_LOOK,
        {
          y: touch.pageY,
          x: touch.pageX
        }
      )
    }
  }

  protected handleTouchEnd (event: TouchEvent) {
    const targetElement = getTargetElementFromEvent(event)
    if (
      targetElement &&
      this.touchedElement !== undefined &&
      this.touchedElement === targetElement &&
      !this.touchMoved
    ) {
      const touch = getFirstTouch(event)
      this.latestActionPosition = undefined
      if (touch) {
        this.updateLatestPosition(
          INTERACTION_TYPE_ACTION,
          {
            y: touch.pageY,
            x: touch.pageX
          }
        )
      }
    }
  }

  protected emitInteractByType (
    interactionType: InteractionType,
    interactionData?: InteractionData
  ) {
    if (interactionData !== undefined) {
      this.emit(
        interactionType,
        objectAssign({}, interactionData, {
          id: this.sequentialNumber,
          type: interactionType
        })
      )
    }
  }

  protected emitInteract () {
    if (this.bound) {
      if (this.sequentialNumber <= MAX_INTERACTION_SEQ) {
        this.emitInteractByType(INTERACTION_TYPE_LOOK, this.latestLookPosition)
        this.emitInteractByType(INTERACTION_TYPE_ACTION, this.latestActionPosition)
        this.latestActionPosition = undefined
      }
      this.sequentialNumber++

      setTimeout(this.emitInteract.bind(this), 2 * 1000)
    }
  }
}
