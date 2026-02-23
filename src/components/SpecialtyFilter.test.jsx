import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpecialtyFilter } from './SpecialtyFilter.jsx'

describe('SpecialtyFilter', () => {
  it('renders all specialty buttons', () => {
    render(<SpecialtyFilter />)
    expect(screen.getByRole('button', { name: 'Все' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Маммологи' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Гинекологи' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'УЗИ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Онкологи' })).toBeInTheDocument()
  })

  it('active button has active class', () => {
    render(<SpecialtyFilter active="mammologist" />)
    const btn = screen.getByRole('button', { name: 'Маммологи' })
    expect(btn.className).toContain('active')
  })

  it('non-active buttons do not have active class', () => {
    render(<SpecialtyFilter active="all" />)
    const btn = screen.getByRole('button', { name: 'Маммологи' })
    expect(btn.className).not.toContain('active')
  })

  it('calls onChange with specialty id on click', () => {
    const onChange = vi.fn()
    render(<SpecialtyFilter active="all" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Гинекологи' }))
    expect(onChange).toHaveBeenCalledWith('gynecologist')
  })

  it('does not throw when onChange is not provided', () => {
    render(<SpecialtyFilter active="all" />)
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'УЗИ' }))).not.toThrow()
  })
})
