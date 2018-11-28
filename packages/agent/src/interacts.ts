import * as objectAssign from 'object-assign'

import { EventEmitter } from 'events'
import { UIEventObserver } from 'ui-event-observer'

import { getOffset } from './browser'
import {
  INTERACTION_TYPE_ACTION,
  INTERACTION_TYPE_LOOK,
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

  private observer: UIEventObserver
  private sequentialNumber: number
  private latestLookPosition?: InteractionData
  private latestActionPosition?: InteractionData

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
  }

  public bind () {
    const eventHandlerMap: { [eventName: string]: { listener: string, handler: (event: Event) => void } } = {
      'touchstart': {
        listener: 'ontouchstart',
        handler: (event: Event) => (this.handleTouchStart(event as TouchEvent))
      },
      'touchmove': {
        listener: 'ontouchmove',
        handler: (event: Event) => (this.handleTouchMove(event as TouchEvent))
      },
      'touchend': {
        listener: 'ontouchend',
        handler: (event: Event) => (this.handleTouchEnd(event as TouchEvent))
      }
    }

    if (!this.bound) {
      const target = window.addEventListener ? window : document.body
      for (const eventName in eventHandlerMap) {
        if (eventHandlerMap.hasOwnProperty(eventName)) {
          const { listener, handler } = eventHandlerMap[eventName]
          listener in target && this.observer.subscribe(target, eventName, (event: Event) => {
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
