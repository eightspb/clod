import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminUsers } from './AdminUsers.jsx'

const ADMIN = Object.freeze({ id: '11111111-1111-4111-8111-111111111111', login: 'admin', displayName: 'Администратор', role: 'admin', createdAt: '2026-09-09T08:00:00.000Z' })
const STAFF = Object.freeze({ id: '22222222-2222-4222-8222-222222222222', login: 'olga.ivanova', displayName: 'Ольга Иванова', role: 'staff', createdAt: '2026-09-09T09:00:00.000Z' })

function json(body, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function transport(responses) {
  const calls = []
  vi.stubGlobal('fetch', vi.fn(async (...input) => {
    calls.push(input)
    return responses.shift()
  }))
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AdminUsers', () => {
  it('marks the signed-in account and offers blocking only for staff', async () => {
    transport([json({ data: [ADMIN, STAFF], me: ADMIN.id })])
    render(<AdminUsers />)
    await screen.findByText('Администратор (вы)')
    expect({ blockAdmin: screen.queryByRole('button', { name: 'Заблокировать admin' }), blockStaff: screen.getByRole('button', { name: 'Заблокировать olga.ivanova' }) }).toMatchObject({ blockAdmin: null, blockStaff: expect.any(HTMLElement) })
  })

  it('posts a new staff user and reports it', async () => {
    const calls = transport([json({ data: [ADMIN], me: ADMIN.id }), json({ data: { ...STAFF, login: 'nina.p' } }, 201), json({ data: [ADMIN, STAFF], me: ADMIN.id })])
    render(<AdminUsers />)
    await screen.findByText('Администратор (вы)')
    fireEvent.change(screen.getByLabelText('Имя пользователя'), { target: { value: 'nina.p' } })
    fireEvent.change(screen.getByLabelText('Отображаемое имя'), { target: { value: 'Нина Петрова' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'пароль-нины-Ω-2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить сотрудника' }))
    await screen.findByRole('status')
    expect(JSON.parse(calls[1][1].body)).toEqual({ login: 'nina.p', displayName: 'Нина Петрова', password: 'пароль-нины-Ω-2026' })
  })

  it('blocks a staff user through PATCH', async () => {
    const calls = transport([json({ data: [ADMIN, STAFF], me: ADMIN.id }), json({ data: { ...STAFF, disabledAt: '2026-09-09T10:00:00.000Z' } }), json({ data: [ADMIN, { ...STAFF, disabledAt: '2026-09-09T10:00:00.000Z' }], me: ADMIN.id })])
    render(<AdminUsers />)
    fireEvent.click(await screen.findByRole('button', { name: 'Заблокировать olga.ivanova' }))
    await waitFor(() => expect(calls).toHaveLength(3))
    expect({ url: calls[1][0], body: JSON.parse(calls[1][1].body) }).toEqual({ url: `/api/admin/users/${STAFF.id}`, body: { disabled: true } })
  })

  it('shows the server error for a taken login', async () => {
    transport([json({ data: [ADMIN], me: ADMIN.id }), json({ error: 'Такое имя пользователя уже занято', code: 'LOGIN_TAKEN' }, 409)])
    render(<AdminUsers />)
    await screen.findByText('Администратор (вы)')
    fireEvent.change(screen.getByLabelText('Имя пользователя'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText('Отображаемое имя'), { target: { value: 'Дубль' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'пароль-дубля-Ω-2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить сотрудника' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Такое имя пользователя уже занято')
  })
})
