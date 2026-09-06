import { describe, expect, it } from 'vitest'
import { MangoCallEventError, normalizeMangoLiveEvent, normalizeMangoSummaryEvent } from './mango-call-event.js'

const LINES = Object.freeze(['78127482210'])
const NOW = new Date(1_770_000_000_000 + 60_000)

function live(overrides = {}) {
  return { entry_id: 'entry:clinic:1', call_id: 'call:leg:1', timestamp: 1_770_000_000, seq: 1, call_state: 'Appeared', location: 'ivr', from: { number: '8 (921) 555-01-29' }, to: { line_number: '78127482210' }, ...overrides }
}

function summary(overrides = {}) {
  return { entry_id: 'entry:clinic:1', call_direction: 1, from: { number: '8 (921) 555-01-29' }, to: { extension: '123' }, line_number: '78127482210', create_time: 1_770_000_000, forward_time: 1_770_000_005, talk_time: 1_770_000_010, end_time: 1_770_000_070, entry_result: 1, disconnect_reason: 1100, ...overrides }
}

function captured(operation) {
  try {
    return { value: operation() }
  } catch (error) {
    return { name: error.name, code: error.code, message: error.message }
  }
}

describe('MANGO call event normalization', () => {
  it('normalizes an inbound live event without retaining provider extras', () => {
    const command = normalizeMangoLiveEvent({ event: live({ sip_call_id: 'must-not-survive' }), inboundLines: LINES, now: NOW })
    expect(command).toEqual({ kind: 'apply_live', entryId: 'entry:clinic:1', callId: 'call:leg:1', seq: 1, state: 'ringing', location: 'ivr', eventAt: '2026-02-02T02:40:00.000Z', callerPhone: '79215550129', lineNumber: '78127482210', operatorExtension: null, disconnectReason: null })
    expect(command).not.toHaveProperty('sip_call_id')
  })

  it('maps documented live states and locations to the local provisional states', () => {
    expect([
      normalizeMangoLiveEvent({ event: live({ call_state: 'Appeared', location: 'queue', seq: '2' }), inboundLines: LINES, now: NOW }).state,
      normalizeMangoLiveEvent({ event: live({ call_state: 'Connected', location: 'abonent', seq: 3 }), inboundLines: LINES, now: NOW }).state,
      normalizeMangoLiveEvent({ event: live({ call_state: 'OnHold', location: 'abonent', seq: 4 }), inboundLines: LINES, now: NOW }).state,
      normalizeMangoLiveEvent({ event: live({ call_state: 'Disconnected', location: 'abonent', seq: 5, disconnect_reason: '1120' }), inboundLines: LINES, now: NOW }).state,
    ]).toEqual(['queued', 'connected', 'on_hold', 'finalizing'])
  })

  it('extracts the operator from the called party and accepts a Russian caller alias', () => {
    const command = normalizeMangoLiveEvent({ event: live({ to: { extension: 29, line_number: '+7 (812) 748-22-10' } }), inboundLines: LINES, now: NOW })
    expect({ caller: command.callerPhone, line: command.lineNumber, operator: command.operatorExtension }).toEqual({ caller: '79215550129', line: '78127482210', operator: '29' })
  })

  it('acknowledges a valid live event for an unlisted or absent line without persistence', () => {
    expect(normalizeMangoLiveEvent({ event: live({ to: { line_number: '78125550100' } }), inboundLines: LINES, now: NOW })).toEqual({ kind: 'ignore', reason: 'LINE_NOT_ALLOWED', entryId: 'entry:clinic:1' })
    expect(normalizeMangoLiveEvent({ event: live({ to: {} }), inboundLines: LINES, now: NOW }).lineNumber).toBeNull()
  })

  it('rejects ambiguous identifiers, sequence numbers, states, locations, and timestamps', () => {
    const fixtures = [
      live({ entry_id: '' }),
      live({ call_id: 'x'.repeat(129) }),
      live({ seq: -1 }),
      live({ seq: '01' }),
      live({ call_state: 'Dialing' }),
      live({ location: 'robot' }),
      live({ timestamp: 1.5 }),
    ]
    expect(fixtures.map((event) => captured(() => normalizeMangoLiveEvent({ event, inboundLines: LINES, now: NOW })).code)).toEqual(Array(7).fill('INVALID_LIVE_EVENT'))
  })

  it('skips live events from an anonymous caller instead of rejecting the webhook', () => {
    expect(normalizeMangoLiveEvent({ event: live({ from: {} }), inboundLines: LINES, now: NOW })).toEqual({ kind: 'ignore', reason: 'CALLER_UNKNOWN', entryId: 'entry:clinic:1' })
  })

  it('accepts a national caller number delivered without a plus sign', () => {
    expect(normalizeMangoLiveEvent({ event: live({ from: { number: '4930123456789' } }), inboundLines: LINES, now: NOW }).callerPhone).toBe('4930123456789')
  })

  it('rejects a live event dated outside the accepted time window', () => {
    expect(captured(() => normalizeMangoLiveEvent({ event: live({ timestamp: 253_402_300_000 }), inboundLines: LINES, now: NOW }))).toMatchObject({ code: 'INVALID_LIVE_EVENT' })
  })

  it('keeps a live event without a line so the stored aggregate can supply it', () => {
    expect(normalizeMangoLiveEvent({ event: live({ to: {} }), inboundLines: LINES, now: NOW })).toMatchObject({ kind: 'apply_live', lineNumber: null })
  })

  it('normalizes an answered inbound summary and derives bounded durations', () => {
    const command = normalizeMangoSummaryEvent({ event: summary(), inboundLines: LINES, now: NOW })
    expect(command).toEqual({ kind: 'finalize', entryId: 'entry:clinic:1', status: 'answered', callerPhone: '79215550129', lineNumber: '78127482210', operatorExtension: '123', startedAt: '2026-02-02T02:40:00.000Z', forwardedAt: '2026-02-02T02:40:05.000Z', answeredAt: '2026-02-02T02:40:10.000Z', endedAt: '2026-02-02T02:41:10.000Z', waitSeconds: 10, talkSeconds: 60, disconnectReason: '1100', finalizedAt: '2026-02-02T02:41:10.000Z' })
  })

  it('uses talk_time rather than contradictory entry_result as answer truth', () => {
    const missed = normalizeMangoSummaryEvent({ event: summary({ talk_time: 0, entry_result: 1, forward_time: 0 }), inboundLines: LINES, now: NOW })
    const answered = normalizeMangoSummaryEvent({ event: summary({ talk_time: 1_770_000_010, entry_result: 0 }), inboundLines: LINES, now: NOW })
    expect({ missed: { status: missed.status, wait: missed.waitSeconds, talk: missed.talkSeconds, answeredAt: missed.answeredAt }, answered: answered.status }).toEqual({ missed: { status: 'missed', wait: 70, talk: 0, answeredAt: null }, answered: 'answered' })
  })

  it('accepts an international E.164 caller and a missing operator', () => {
    const command = normalizeMangoSummaryEvent({ event: summary({ from: { number: '+44 20 7946 0958' }, to: {} }), inboundLines: LINES, now: NOW })
    expect({ caller: command.callerPhone, operator: command.operatorExtension }).toEqual({ caller: '442079460958', operator: null })
  })

  it('returns cleanup instructions for internal and outgoing summaries', () => {
    expect(normalizeMangoSummaryEvent({ event: summary({ call_direction: 0 }), inboundLines: LINES, now: NOW })).toEqual({ kind: 'remove_non_inbound', entryId: 'entry:clinic:1' })
    expect(normalizeMangoSummaryEvent({ event: summary({ call_direction: '2' }), inboundLines: LINES, now: NOW })).toEqual({ kind: 'remove_non_inbound', entryId: 'entry:clinic:1' })
  })

  it('acknowledges a signed inbound summary for a line outside the allowlist', () => {
    expect(normalizeMangoSummaryEvent({ event: summary({ line_number: '78125550100' }), inboundLines: LINES, now: NOW })).toEqual({ kind: 'ignore', reason: 'LINE_NOT_ALLOWED', entryId: 'entry:clinic:1' })
  })

  it('rejects impossible summary time ordering and overflowing durations', () => {
    const fixtures = [
      summary({ end_time: 1_769_999_999 }),
      summary({ forward_time: 1_770_000_020, talk_time: 1_770_000_010 }),
      summary({ talk_time: 1_770_000_080 }),
      summary({ end_time: 2_000_000_000, talk_time: 1_770_000_010 }),
    ]
    expect(fixtures.map((event) => captured(() => normalizeMangoSummaryEvent({ event, inboundLines: LINES, now: NOW })).code)).toEqual(Array(4).fill('INVALID_SUMMARY_EVENT'))
  })

  it('rejects unknown direction, invalid line, and unbounded technical text', () => {
    const fixtures = [summary({ call_direction: 3 }), summary({ line_number: 'not-phone' }), summary({ disconnect_reason: 'x'.repeat(129) })]
    expect(fixtures.map((event) => captured(() => normalizeMangoSummaryEvent({ event, inboundLines: LINES, now: NOW })).code)).toEqual(Array(3).fill('INVALID_SUMMARY_EVENT'))
  })

  it('skips a summary from an anonymous caller instead of rejecting the webhook', () => {
    expect(normalizeMangoSummaryEvent({ event: summary({ from: {} }), inboundLines: LINES, now: NOW })).toEqual({ kind: 'ignore', reason: 'CALLER_UNKNOWN', entryId: 'entry:clinic:1' })
  })

  it('rejects a summary whose end time lies outside the accepted window', () => {
    expect(captured(() => normalizeMangoSummaryEvent({ event: summary({ end_time: 253_402_300_000 }), inboundLines: LINES, now: NOW })).code).toBe('INVALID_SUMMARY_EVENT')
  })

  it('returns frozen safe typed failures', () => {
    const error = new MangoCallEventError('other')
    expect({ name: error.name, code: error.code, message: error.message, frozen: Object.isFrozen(error) }).toEqual({ name: 'MangoCallEventError', code: 'INVALID_LIVE_EVENT', message: 'MANGO live call event is invalid', frozen: true })
  })
})
