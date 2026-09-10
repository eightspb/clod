import { describe, expect, it, vi } from 'vitest'
import { METRIKA_COUNTER_ID, contactGoal, installMetrika, reachGoal } from './metrika.js'

function fakeWindow() {
  const scripts = []
  const document = { createElement: () => ({ async: false, src: '' }), head: { appendChild: (node) => scripts.push(node) } }
  return { document, scripts }
}

describe('metrika', () => {
  it('uses the clinic counter that belongs to odintsovclinic.ru', () => {
    expect(METRIKA_COUNTER_ID).toBe(26618208)
  })

  it('names the phone goal for a tel link', () => {
    expect(contactGoal({ getAttribute: () => 'tel:+78127482210' })).toBe('phone_click')
  })

  it('names the MAX goal for a max.ru link', () => {
    expect(contactGoal({ getAttribute: () => 'https://max.ru/odintsovclinic?start=приём' })).toBe('max_click')
  })

  it('returns no goal for an ordinary link', () => {
    expect(contactGoal({ getAttribute: () => '/doctors/егорова' })).toBeUndefined()
  })

  it('forwards a goal to the loaded counter', () => {
    const ym = vi.fn()
    reachGoal('booking_open', { ym })
    expect(ym).toHaveBeenCalledWith(METRIKA_COUNTER_ID, 'reachGoal', 'booking_open')
  })

  it('stays silent when the counter is not loaded', () => {
    expect(() => reachGoal('booking_open', {})).not.toThrow()
  })

  it('queues the init call and loads the tag once', () => {
    const win = fakeWindow()
    installMetrika(win)
    installMetrika(win)
    expect({ scripts: win.scripts.map((node) => node.src), init: win.ym.a[0] }).toEqual({ scripts: ['https://mc.yandex.ru/metrika/tag.js'], init: [METRIKA_COUNTER_ID, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false }] })
  })
})
