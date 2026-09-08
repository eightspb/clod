import { render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NashiRezultaty } from './NashiRezultaty.jsx'
import { CLINIC_SCHEMA } from '../../lib/seo.js'

describe('Clinic results', () => {
  it('links each review platform to the same clinic identified in structured data', () => {
    render(<NashiRezultaty />)
    const links = screen.getAllByRole('link', { name: /Читать на/ }).map((link) => link.href)
    expect(links.every((url) => CLINIC_SCHEMA.sameAs.includes(url))).toBe(true)
  })

  it('renders the confirmed training total before client hydration', () => {
    const markup = renderToStaticMarkup(<NashiRezultaty />)
    const document = new DOMParser().parseFromString(markup, 'text/html')
    const label = [...document.querySelectorAll('div')].find((node) => node.textContent === 'врачей из других клиник прошли обучение')
    expect(label.previousElementSibling.textContent).toBe('150+')
  })

  it('renders the procedure total before client hydration', () => {
    render(<NashiRezultaty />)
    expect(screen.getByText('процедур ВАБ выполнено').previousElementSibling).toHaveTextContent('1000+')
  })
})
