import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Media } from './Media.jsx'

const MEDIA_STAT_LABELS = [
  'телевизионных выступлений',
  'научных публикаций',
  /(?:год|года|лет) в медиапространстве/,
]

describe('Media page', () => {
  it.each(MEDIA_STAT_LABELS)('renders the %s statistic once', (label) => {
    render(<Media />)
    expect(screen.getAllByText(label)).toHaveLength(1)
  })
})
