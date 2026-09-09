import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm.jsx'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LoginForm', () => {
  it('sends the user name together with the password', async () => {
    const calls = []
    vi.stubGlobal('fetch', vi.fn(async (...input) => {
      calls.push(input)
      return new Response(JSON.stringify({ error: 'Неверное имя пользователя или пароль' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }))
    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText('Имя пользователя'), { target: { value: 'olga.ivanova' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'пароль-ольги-Ω-2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(JSON.parse(calls[0][1].body)).toEqual({ login: 'olga.ivanova', password: 'пароль-ольги-Ω-2026' })
  })
})
