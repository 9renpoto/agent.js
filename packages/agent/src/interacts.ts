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
  EventData,
  EventPosition,
  EventType,
  InteractionEvent,
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

  private latestLookPosition: EventData | undefined
  private latestActionPosition: EventData | undefined
  private sequentialNumber: number
  private intervals: number[]

  private observer: UIEventObserver
  private touchedElement: EventTarget | undefined
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
      this.bindEvent('ontouchstart', 'touchstart', this.handleTouchStart)
      this.bindEvent('ontouchmove', 'touchmove', this.handleTouchMove)
      this.bindEvent('ontouchend', 'touchend', this.handleTouchEnd)
      this.bound = true
      this.emitInteract()
    }
  }

  public unbind () {
    if (this.bound) {
      this.observer.unsubscribeAll()
      // TODO Unbind DOM events
      this.bound = false
    }
  }

  protected bindEvent (
    listener: string,
    eventName: EventType,
    handler: (event: MouseEvent | TouchEvent | PointerEvent) => void
  ) {
    const target = window.addEventListener ? window : document.body
    if (listener in target) {
      this.observer.subscribe(target, eventName, (event: MouseEvent | TouchEvent | PointerEvent) => {
        try {
          handler(event)
        } catch (error) {
          throw error
        }
      })
    }
  }

  protected updateLatestPosition (
    interactionType: InteractionType,
    position: EventPosition
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
    if (event !== undefined) {
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

  protected handleTouchEnd (event: TouchEvent) {
    const touchedElement = getTargetElementFromEvent(event)
    if (
      event !== undefined &&
      this.touchedElement !== undefined &&
      !this.touchMoved &&
      this.touchedElement === touchedElement
    ) {
      const touch = getFirstTouch(event)
      if (touch) {
        this.updateLatestPosition(
          INTERACTION_TYPE_ACTION,
          {
            y: touch.pageY,
            x: touch.pageX
          }
        )
      }
      this.latestActionPosition = undefined
    }
    this.touchedElement = undefined
  }

  protected emitInteractByType (
    interactionType: InteractionType,
    interactionEvent: EventData | undefined
  ) {
    if (interactionEvent !== undefined) {
      this.emit(
        interactionType,
        objectAssign({}, interactionEvent, {
          id: this.sequentialNumber,
          type: interactionType
        })
      )
    }
  }

  protected emitInteract () {
    if (this.sequentialNumber > MAX_INTERACTION_SEQ) {
      this.emitInteractByType(INTERACTION_TYPE_LOOK, this.latestLookPosition)
      this.emitInteractByType(INTERACTION_TYPE_ACTION, this.latestActionPosition)
      this.latestActionPosition = undefined
    }
    this.sequentialNumber++

    if (this.bound) {
      const delayMilliseconds = this.intervals.shift()

      if (delayMilliseconds !== undefined && delayMilliseconds >= 0) {
        setTimeout(this.emitInteract.bind(this), delayMilliseconds * 1000)
      }
    }
  }
}
