import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TaxFormRequestForm } from './TaxFormRequestForm.jsx'

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/фио пациента/i), {
    target: { value: 'Иванова Мария Сергеевна' },
  })
  fireEvent.change(screen.getByLabelText(/дата рождения пациента/i), {
    target: { value: '1990-01-01' },
  })
  fireEvent.change(screen.getByLabelText(/фио налогоплательщика/i), {
    target: { value: 'Иванов Сергей Петрович' },
  })
  fireEvent.change(screen.getByLabelText(/дата рождения налогоплательщика/i), {
    target: { value: '1985-05-10' },
  })
  fireEvent.change(screen.getByLabelText(/инн налогоплательщика/i), {
    target: { value: '123456789012' },
  })
  fireEvent.change(screen.getByLabelText(/за какой год/i), {
    target: { value: String(new Date().getFullYear()) },
  })
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'patient@example.com' },
  })
  fireEvent.change(screen.getByLabelText(/телефон/i), {
    target: { value: '+7 (999) 000-00-00' },
  })
}

describe('TaxFormRequestForm', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a client-side error for invalid inn', async () => {
    render(<TaxFormRequestForm />)
    fillRequiredFields()

    fireEvent.change(screen.getByLabelText(/инн налогоплательщика/i), {
      target: { value: '12345' },
    })

    fireEvent.submit(screen.getByRole('button', { name: /отправить заявку/i }).closest('form'))

    expect(
      await screen.findByText('ИНН налогоплательщика должен содержать 12 цифр.')
    ).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('renders server validation messages from the stable api shape', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Проверьте форму и попробуйте снова.',
          details: [{ field: 'taxpayerInn', message: 'Укажите корректный ИНН.' }],
        },
      }),
    })

    render(<TaxFormRequestForm />)
    fillRequiredFields()

    fireEvent.submit(screen.getByRole('button', { name: /отправить заявку/i }).closest('form'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByText('Укажите корректный ИНН.')).toBeInTheDocument()
  })

  it('submits the form and shows success state', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<TaxFormRequestForm />)
    fillRequiredFields()

    fireEvent.submit(screen.getByRole('button', { name: /отправить заявку/i }).closest('form'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tax-form',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    expect(
      await screen.findByText('Заявка на справку успешно отправлена!')
    ).toBeInTheDocument()
  })
})
