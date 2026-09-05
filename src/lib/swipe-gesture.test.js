import { describe, expect, it } from 'vitest'
import { createSwipeGesture } from './swipe-gesture.js'

describe('createSwipeGesture', () => {
  it('reports one backward step once a horizontal swipe passes the distance', () => {
    const gesture = createSwipeGesture({ axisLock: 10, distance: 48 })
    gesture.begin({ x: 260, y: 140 })
    gesture.track({ x: 230, y: 143 })
    expect(gesture.track({ x: 200, y: 146 })).toEqual({ horizontal: true, step: 1 })
  })

  it('reports a forward step for a rightward swipe', () => {
    const gesture = createSwipeGesture({ axisLock: 10, distance: 48 })
    gesture.begin({ x: 100, y: 140 })
    expect(gesture.track({ x: 160, y: 138 })).toEqual({ horizontal: true, step: -1 })
  })

  it('locks to the vertical axis when the first clear movement is vertical', () => {
    const gesture = createSwipeGesture({ axisLock: 10, distance: 48 })
    gesture.begin({ x: 260, y: 140 })
    gesture.track({ x: 262, y: 160 })
    expect(gesture.track({ x: 200, y: 165 })).toEqual({ horizontal: false, step: 0 })
  })

  it('keeps a locked horizontal swipe horizontal even after vertical drift', () => {
    const gesture = createSwipeGesture({ axisLock: 10, distance: 48 })
    gesture.begin({ x: 260, y: 140 })
    gesture.track({ x: 240, y: 142 })
    expect(gesture.track({ x: 236, y: 170 })).toEqual({ horizontal: true, step: 0 })
  })

  it('delivers at most one step per gesture', () => {
    const gesture = createSwipeGesture({ axisLock: 10, distance: 48 })
    gesture.begin({ x: 260, y: 140 })
    gesture.track({ x: 160, y: 145 })
    expect(gesture.track({ x: 40, y: 150 })).toEqual({ horizontal: true, step: 0 })
  })

  it('stays idle before any movement passes the axis lock', () => {
    const gesture = createSwipeGesture({ axisLock: 10, distance: 48 })
    gesture.begin({ x: 260, y: 140 })
    expect(gesture.track({ x: 255, y: 144 })).toEqual({ horizontal: false, step: 0 })
  })

  it('ignores tracking after the gesture ended', () => {
    const gesture = createSwipeGesture({ axisLock: 10, distance: 48 })
    gesture.begin({ x: 260, y: 140 })
    gesture.end()
    expect(gesture.track({ x: 100, y: 140 })).toEqual({ horizontal: false, step: 0 })
  })
})
