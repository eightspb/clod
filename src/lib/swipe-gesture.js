const IDLE = Object.freeze({ horizontal: false, step: 0 })
const HOLD = Object.freeze({ horizontal: true, step: 0 })

function lockAxis(dx, dy, axisLock) {
  if (Math.abs(dx) < axisLock && Math.abs(dy) < axisLock) return undefined
  return Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
}

/**
 * Tracks one swipe: locks the axis on the first clear movement so a horizontal
 * swipe with vertical drift stays horizontal (iOS Safari otherwise cancels it as
 * a page scroll), then reports a single step once the distance is reached.
 */
export function createSwipeGesture({ axisLock = 10, distance = 48 } = {}) {
  let origin
  let axis
  let delivered = false
  return Object.freeze({
    begin(point) {
      origin = point
      axis = undefined
      delivered = false
    },
    track(point) {
      if (!origin) return IDLE
      const dx = point.x - origin.x
      const dy = point.y - origin.y
      axis ||= lockAxis(dx, dy, axisLock)
      if (axis !== 'horizontal') return IDLE
      if (delivered || Math.abs(dx) < distance) return HOLD
      delivered = true
      return { horizontal: true, step: dx < 0 ? 1 : -1 }
    },
    end() {
      origin = undefined
    },
  })
}
