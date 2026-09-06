import { describe, expect, it } from 'vitest'
import { scheduleRetention } from './retention-schedule.js'

describe('scheduleRetention', () => {
  it('registers the run on a daily interval that does not keep the process alive', () => {
    const timers = []
    scheduleRetention({ jobs: [async () => undefined], setTimer: (fn, ms) => { timers.push(ms); return { unref() { timers.push('unref') } } } })
    expect(timers).toEqual([86_400_000, 'unref'])
  })

  it('keeps running later jobs when an earlier one throws', async () => {
    const executed = []
    const { run } = scheduleRetention({ jobs: [async () => { throw new Error('boom') }, async () => { executed.push('second') }], setTimer: () => undefined, log: () => undefined })
    await run()
    expect(executed).toEqual(['second'])
  })

  it('rejects a job list with non-functions', () => {
    expect(() => scheduleRetention({ jobs: ['prune'], setTimer: () => undefined })).toThrow(TypeError)
  })
})
