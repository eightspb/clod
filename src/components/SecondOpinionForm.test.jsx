import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SecondOpinionForm } from './SecondOpinionForm.jsx'

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/фамилия/i), { target: { value: 'Иванова' } })
  fireEvent.change(screen.getByLabelText(/^имя/i), { target: { value: 'Мария' } })
  fireEvent.change(screen.getByLabelText(/дата рождения/i), { target: { value: '1990-01-01' } })
  fireEvent.change(screen.getByLabelText(/телефон/i), { target: { value: '+7 (999) 000-00-00' } })
}

describe('SecondOpinionForm', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a client-side error for unsupported files', async () => {
    render(<SecondOpinionForm />)

    const input = document.getElementById('file-upload')
    const invalidFile = new File(['bad'], 'report.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    fireEvent.change(input, { target: { files: [invalidFile] } })

    expect(
      await screen.findByText('Можно прикрепить только PDF, JPG, JPEG или PNG.')
    ).toBeInTheDocument()
  })

  it('does not submit when no files are attached', async () => {
    render(<SecondOpinionForm />)
    fillRequiredFields()

    fireEvent.submit(screen.getByRole('button', { name: /отправить/i }).closest('form'))

    expect(
      await screen.findByText('Прикрепите хотя бы один файл.')
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
          details: [{ field: 'files', message: 'Файл слишком большой.' }],
        },
      }),
    })

    render(<SecondOpinionForm />)
    fillRequiredFields()

    const input = document.getElementById('file-upload')
    const validFile = new File(['ok'], 'scan.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [validFile] } })
    fireEvent.submit(screen.getByRole('button', { name: /отправить/i }).closest('form'))

    const confirmButton = await screen.findByRole('button', { name: /подтвердить/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByText('Файл слишком большой.')).toBeInTheDocument()
  })
})
