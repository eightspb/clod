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
