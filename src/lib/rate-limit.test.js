import { describe, expect, it, vi } from 'vitest'
import { checkRateLimit } from './rate-limit.js'

const STORE_CAPACITY = 2_048
const CAP_OPTIONS = Object.freeze({ namespace: 'bounded-lru-κ', maxRequests: 1, windowMs: 60_000 })
const COUNT_OPTIONS = Object.freeze({ namespace: 'existing-buckets-λ', maxRequests: 2, windowMs: 60_000 })
const EXPIRY_OPTIONS = Object.freeze({ namespace: 'expiry-boundary-μ', maxRequests: 1, windowMs: 1_000 })

describe('rate limit storage', () => {
  it('bounds a namespace while retaining the recently used bucket', () => {
    checkRateLimit('oldest-α', CAP_OPTIONS)
    checkRateLimit('active-β', CAP_OPTIONS)
    for (let index = 0; index < STORE_CAPACITY - 2; index += 1) checkRateLimit(`filler-${index}`, CAP_OPTIONS)
    const activeBeforeOverflow = checkRateLimit('active-β', CAP_OPTIONS).allowed
    checkRateLimit('overflow-γ', CAP_OPTIONS)
    const oldestAfterOverflow = checkRateLimit('oldest-α', CAP_OPTIONS).allowed
    const activeAfterOverflow = checkRateLimit('active-β', CAP_OPTIONS).allowed
    expect({ activeBeforeOverflow, oldestAfterOverflow, activeAfterOverflow }).toEqual({ activeBeforeOverflow: false, oldestAfterOverflow: true, activeAfterOverflow: false })
  })

  it('preserves the count of an existing bucket among other keys', () => {
    const first = checkRateLimit('пациент-дельта', COUNT_OPTIONS)
    checkRateLimit('соседний-эпсилон', COUNT_OPTIONS)
    const second = checkRateLimit('пациент-дельта', COUNT_OPTIONS)
    const third = checkRateLimit('пациент-дельта', COUNT_OPTIONS)
    expect([first.allowed, second.allowed, third.allowed]).toEqual([true, true, false])
  })

  it('starts a fresh bucket exactly when the previous window expires', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(8_000)
    checkRateLimit('граница-дзета', EXPIRY_OPTIONS)
    now.mockReturnValue(9_000)
    const result = checkRateLimit('граница-дзета', EXPIRY_OPTIONS)
    now.mockRestore()
    expect(result).toEqual({ allowed: true })
  })
})
