import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PrivacyPolicy } from './PrivacyPolicy.jsx'

describe('PrivacyPolicy integration disclosure', () => {
  it('describes appointment and call metadata processing without claiming call recording', () => {
    render(<PrivacyPolicy />)
    const section = screen.getByRole('heading', { name: '8. Записи на приём и обращения по телефону' }).closest('article')
    expect(section).toHaveTextContent('локальном журнале пациентов и записей')
    expect(section).toHaveTextContent('MANGO OFFICE')
    expect(section).toHaveTextContent('номер звонящего')
    expect(section).toHaveTextContent(/содержание телефонных разговоров не записывается/i)
    expect(section).toHaveTextContent('уничтожении персональных данных')
  })
})

describe('PrivacyPolicy operator disclosure', () => {
  it('names the operator with its registration numbers', () => {
    render(<PrivacyPolicy />)
    expect(document.body).toHaveTextContent(/ОГРН 1137847430412/)
  })
  it('states the response period for requests of data subjects', () => {
    render(<PrivacyPolicy />)
    expect(document.body).toHaveTextContent(/10 рабочих дней/)
  })
  it('declares that personal data are stored on servers in the Russian Federation', () => {
    render(<PrivacyPolicy />)
    expect(document.body).toHaveTextContent(/на территории Российской Федерации/)
  })
})

describe('PrivacyPolicy registry claim', () => {
  it('does not claim registration in the Roskomnadzor operator registry', () => {
    render(<PrivacyPolicy />)
    expect(document.body.textContent).not.toMatch(/реестр операторов/)
  })
})
