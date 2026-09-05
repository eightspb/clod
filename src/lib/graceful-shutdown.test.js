import { describe, expect, it, vi } from 'vitest'
import { createGracefulShutdown } from './graceful-shutdown.js'

function fakeServer() {
  const server = { closeCallbacks: [], closeCalls: 0 }
  server.close = (callback) => {
    server.closeCalls += 1
    server.closeCallbacks.push(callback)
  }
  return server
}

function fakeTimer() {
  const timer = { delay: undefined, callback: undefined }
  timer.set = (callback, delay) => {
    timer.callback = callback
    timer.delay = delay
    return { unref: () => {} }
  }
  return timer
}

describe('createGracefulShutdown', () => {
  it('stops accepting connections on the first signal', () => {
    const server = fakeServer()
    const drain = createGracefulShutdown(server, { timeoutMs: 100, exit: () => {}, setTimer: fakeTimer().set })
    drain()
    expect(server.closeCalls).toBe(1)
  })

  it('exits with zero once in-flight requests finish', () => {
    const server = fakeServer()
    const exit = vi.fn()
    createGracefulShutdown(server, { timeoutMs: 100, exit, setTimer: fakeTimer().set })()
    server.closeCallbacks[0]()
    expect(exit).toHaveBeenCalledWith(0)
  })

  it('arms the deadline with the configured timeout', () => {
    const timer = fakeTimer()
    createGracefulShutdown(fakeServer(), { timeoutMs: 90_000, exit: () => {}, setTimer: timer.set })()
    expect(timer.delay).toBe(90_000)
  })

  it('exits with one when the deadline passes before the server closes', () => {
    const timer = fakeTimer()
    const exit = vi.fn()
    createGracefulShutdown(fakeServer(), { timeoutMs: 100, exit, setTimer: timer.set })()
    timer.callback()
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('closes the server only once even when both signals arrive', () => {
    const server = fakeServer()
    const drain = createGracefulShutdown(server, { timeoutMs: 100, exit: () => {}, setTimer: fakeTimer().set })
    drain()
    drain()
    expect(server.closeCalls).toBe(1)
  })

  it('rejects a non-positive timeout', () => {
    expect(() => createGracefulShutdown(fakeServer(), { timeoutMs: 0, exit: () => {}, setTimer: fakeTimer().set })).toThrow()
  })
})
