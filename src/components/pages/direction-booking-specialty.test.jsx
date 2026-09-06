import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Endocrinology } from './Endocrinology.jsx'
import { Gynecology } from './Gynecology.jsx'
import { Mammology } from './Mammology.jsx'
import { Nutrition } from './Nutrition.jsx'

const DIRECTIONS = [
  ['Mammology', Mammology, 'mammology'],
  ['Gynecology', Gynecology, 'gynecology'],
  ['Endocrinology', Endocrinology, 'endocrinology'],
  ['Nutrition', Nutrition, 'nutrition'],
]

describe('direction page useful sections', () => {
  it.each(DIRECTIONS)('%s limits the useful-sections booking trigger to its own doctors', (_name, Page, specialty) => {
    render(<Page />)
    const trigger = screen.getByRole('heading', { name: 'Полезные разделы' }).parentElement.querySelector('[data-booking-btn]')
    expect(trigger.getAttribute('data-booking-specialty')).toBe(specialty)
  })
})
