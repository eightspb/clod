import { describe, expect, it } from 'vitest'
import { PROMOTIONS, LAB_DISCOUNT, HEALTH_DAY } from './promotions.js'

describe('promotions.js', () => {
  it('gives twenty percent off laboratory tests on Tuesday and Wednesday', () => {
    expect({ percent: LAB_DISCOUNT.percent, days: LAB_DISCOUNT.days }).toEqual({ percent: 20, days: ['вторник', 'среда'] })
  })
  it('prices the health day package below the sum of its parts', () => {
    expect(HEALTH_DAY.price).toBeLessThan(HEALTH_DAY.regularPrice)
  })
  it('exposes every promotion with a unique anchor id', () => {
    expect(new Set(PROMOTIONS.map((promo) => promo.id)).size).toBe(PROMOTIONS.length)
  })
})
