import { describe, expect, it } from 'vitest'
import {
  FULL_PRICE_CATEGORIES,
  OFFICIAL_PRICE_LIST_UPDATED_AT,
  SHORT_PRICE_CATEGORIES,
  formatPriceLabel,
  getFullPriceCategoryBySlug,
  getShortPriceCategoryBySlug,
} from './price-list.js'

describe('price-list.js', () => {
  it('stores the official clinic price list update date', () => {
    expect(OFFICIAL_PRICE_LIST_UPDATED_AT).toBe('2 февраля 2026')
  })

  it('excludes official positions marked as unused', () => {
    const mammology = getFullPriceCategoryBySlug('mammology')

    expect(mammology).toBeDefined()
    expect(mammology.items).toHaveLength(49)
    expect(mammology.items.some((item) => item.code === 'ММ1')).toBe(false)
  })

  it('keeps the short mammology list aligned with official prices', () => {
    const mammology = getShortPriceCategoryBySlug('mammology')

    expect(mammology.fullPriceHref).toBe('/prices/full#mammology')
    expect(mammology.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Первичный приём онколога-маммолога', price: 5000 }),
        expect.objectContaining({ name: 'УЗИ молочных желёз', price: 2500 }),
        expect.objectContaining({ name: 'ВАБ', price: 87000 }),
      ])
    )
  })

  it('keeps the short gynecology and endocrinology lists aligned with official prices', () => {
    const gynecology = getShortPriceCategoryBySlug('gynecology')
    const endocrinology = getShortPriceCategoryBySlug('endocrinology')

    expect(gynecology.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Первичный приём гинеколога', price: 3200 }),
        expect.objectContaining({ name: 'Кольпоскопия', price: 2500 }),
      ])
    )

    expect(endocrinology.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Первичный приём эндокринолога', price: 4500 }),
        expect.objectContaining({ name: 'УЗИ щитовидной железы', price: 2000 }),
      ])
    )
  })

  it('formats ruble amounts for display', () => {
    expect(formatPriceLabel(0)).toBe('Бесплатно')
    expect(formatPriceLabel(87000)).toBe('87 000 ₽')
    expect(formatPriceLabel(87000, true)).toBe('от 87 000 ₽')
  })

  it('exports the public short and full categories', () => {
    expect(FULL_PRICE_CATEGORIES.length).toBeGreaterThanOrEqual(6)
    expect(SHORT_PRICE_CATEGORIES.length).toBeGreaterThanOrEqual(4)
  })
})
