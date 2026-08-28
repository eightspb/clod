import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DoctorList } from './DoctorList.jsx'

const DOCTOR = Object.freeze({ id: 'doctor-odintsov', name: 'Одинцов Владислав Александрович', slug: 'odintsov', specialization: 'Онколог-маммолог', experienceYears: 30, bio: 'Главный врач', photoUrl: '/images/doctors/odintsov.webp', certificates: [], medflexDoctorId: 70120, medflexName: 'Одинцов Владислав Александрович', active: true, syncedAt: '2026-08-28T17:00:00.000Z' })

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

afterEach(() => vi.unstubAllGlobals())

describe('DoctorList', () => {
  it('automatically bootstraps an empty catalog from Medflex', async () => {
    const calls = transport([json({ doctors: [] }), json({ report: { active: 1, created: 1, preserved: 0, total: 1 }, doctors: [DOCTOR] })])
    render(<DoctorList />)
    expect(await screen.findByText(DOCTOR.name)).toBeTruthy()
    expect(calls.map(([url, options]) => ({ url, method: options?.method ?? 'GET' }))).toEqual([{ url: '/api/admin/doctors', method: 'GET' }, { url: '/api/admin/doctors/sync', method: 'POST' }])
  })

  it('lets an administrator refresh doctors without deleting manual fields', async () => {
    const calls = transport([json({ doctors: [DOCTOR] }), json({ report: { active: 1, created: 0, preserved: 1, total: 1 }, doctors: [{ ...DOCTOR, specialization: 'Ручная специализация' }] })])
    render(<DoctorList />)
    await screen.findByText(DOCTOR.name)
    fireEvent.click(screen.getByRole('button', { name: 'Обновить врачей из Medflex' }))
    expect(await screen.findByText('Ручная специализация')).toBeTruthy()
    expect(screen.getByRole('status')).toHaveTextContent('Medflex: 1 активных, 0 новых, 1 сохранено без изменений')
    expect(calls[1][1]).toMatchObject({ method: 'POST', credentials: 'same-origin' })
  })

  it('keeps the current catalog visible when a manual sync fails', async () => {
    transport([json({ doctors: [DOCTOR] }), json({ error: 'DOCTORS_SYNC_UNAVAILABLE' }, 503)])
    render(<DoctorList />)
    await screen.findByText(DOCTOR.name)
    fireEvent.click(screen.getByRole('button', { name: 'Обновить врачей из Medflex' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Не удалось обновить врачей из Medflex'))
    expect(screen.getByText(DOCTOR.name)).toBeTruthy()
  })

  it('keeps Medflex metadata after saving legacy editable fields', async () => {
    transport([json({ doctors: [DOCTOR] }), json({ doctor: { id: DOCTOR.id, name: 'Ручное имя', slug: 'manual', specialization: 'Ручная специализация', experienceYears: 31, bio: 'Ручная биография', photoMediaId: null } })])
    render(<DoctorList />)
    await screen.findByText(DOCTOR.name)
    fireEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    fireEvent.change(document.querySelector('input[name="name"]'), { target: { value: 'Ручное имя' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText('Ручное имя')).toBeTruthy()
    expect(screen.getByText('Medflex активен')).toBeTruthy()
  })
})
