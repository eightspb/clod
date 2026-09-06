import { describe, expect, it } from 'vitest'
import { readMonitorStatus } from './monitor-status.js'

const NOW = new Date('2026-09-07T10:00:00.000Z')
const STATUS = Object.freeze({ checkedAt: '2026-09-07T09:58:00.000Z', checks: [{ name: 'health', ok: true, detail: '200' }, { name: 'tls', ok: false, detail: 'истекает через 12 дн.' }, { name: 'disk', ok: true, detail: '41%' }] })

function reader(content) {
  return async () => {
    if (content instanceof Error) throw content
    return content
  }
}

describe('host monitor status', () => {
  it('reports the monitor as absent when the status file does not exist', async () => {
    const result = await readMonitorStatus({ path: '/nowhere/status.json', now: NOW, readFile: reader(Object.assign(new Error('missing'), { code: 'ENOENT' })) })
    expect(result).toEqual({ available: false })
  })

  it('lists failing checks from a fresh status file', async () => {
    const result = await readMonitorStatus({ path: '/x', now: NOW, readFile: reader(JSON.stringify(STATUS)) })
    expect(result.failing).toEqual([{ name: 'tls', ok: false, detail: 'истекает через 12 дн.' }])
  })

  it('marks the status stale when the monitor has not reported for ten minutes', async () => {
    const result = await readMonitorStatus({ path: '/x', now: NOW, readFile: reader(JSON.stringify({ ...STATUS, checkedAt: '2026-09-07T09:40:00.000Z' })) })
    expect(result.stale).toBe(true)
  })

  it('drops checks with unknown names instead of forwarding them to the browser', async () => {
    const result = await readMonitorStatus({ path: '/x', now: NOW, readFile: reader(JSON.stringify({ ...STATUS, checks: [{ name: 'shell', ok: false, detail: 'rm -rf' }, STATUS.checks[0]] })) })
    expect(result.checks.map((check) => check.name)).toEqual(['health'])
  })

  it('truncates overlong detail text', async () => {
    const result = await readMonitorStatus({ path: '/x', now: NOW, readFile: reader(JSON.stringify({ ...STATUS, checks: [{ name: 'disk', ok: false, detail: 'ё'.repeat(500) }] })) })
    expect(result.checks[0].detail).toHaveLength(120)
  })

  it('treats unreadable JSON as an unavailable monitor', async () => {
    const result = await readMonitorStatus({ path: '/x', now: NOW, readFile: reader('{not json') })
    expect(result).toEqual({ available: false })
  })
})
