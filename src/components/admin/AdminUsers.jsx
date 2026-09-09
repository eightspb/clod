import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Lock, LockOpen, UserPlus } from 'lucide-react'
import { PASSWORD_MIN_LENGTH } from '../../lib/admin-password-policy.js'
import { ICON_BUTTON, ICON_BUTTON_DANGER } from './row-button.js'

const INPUT_CLASS = 'min-h-11 rounded-xl border border-clay-admin-border bg-white px-3 text-sm text-clay-dark outline-none transition focus:border-clay-mint'
const SMALL_BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-clay-admin-border bg-white px-4 text-sm font-semibold text-clay-admin-dark transition hover:border-clay-mint hover:text-clay-mint disabled:cursor-not-allowed disabled:opacity-45'
const ROLE_LABELS = Object.freeze({ admin: 'Администратор', staff: 'Сотрудник' })
const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'short', timeStyle: 'short' })
const EMPTY_FORM = Object.freeze({ login: '', displayName: '', password: '' })

function date(value) {
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? DATE_FORMAT.format(parsed) : '—'
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers } })
  if (response.status === 401) {
    window.location.href = '/admin/login'
    throw new Error('Unauthorized')
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`)
  return payload
}

function PasswordForm({ user, onDone, onCancel }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await requestJson(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: 'PATCH', body: JSON.stringify({ password }) })
      onDone()
    } catch (failure) {
      setError(failure.message)
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3" aria-label={`Новый пароль для ${user.login}`}>
      <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Новый пароль<input className={INPUT_CLASS} type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button type="submit" className={SMALL_BUTTON} disabled={busy || password.length < PASSWORD_MIN_LENGTH}>Сохранить пароль</button>
      <button type="button" className={SMALL_BUTTON} onClick={onCancel}>Отмена</button>
      {error && <p role="alert" className="w-full text-sm text-red-700">{error}</p>}
    </form>
  )
}

/** Admin-only management of named accounts: create staff, change passwords, block and unblock. */
export function AdminUsers() {
  const [users, setUsers] = useState([])
  const [me, setMe] = useState(undefined)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const [passwordFor, setPasswordFor] = useState(undefined)
  const load = useCallback(async () => {
    try {
      const payload = await requestJson('/api/admin/users')
      setUsers(payload.data)
      setMe(payload.me)
    } catch (failure) {
      setError(failure.message)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])
  async function create(event) {
    event.preventDefault()
    setBusy('create')
    setError('')
    setNotice('')
    try {
      const payload = await requestJson('/api/admin/users', { method: 'POST', body: JSON.stringify(form) })
      setForm(EMPTY_FORM)
      setNotice(`Сотрудник ${payload.data.login} добавлен`)
      await load()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy('')
    }
  }
  async function toggle(user) {
    setBusy(user.id)
    setError('')
    setNotice('')
    try {
      await requestJson(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: 'PATCH', body: JSON.stringify({ disabled: !user.disabledAt }) })
      setNotice(user.disabledAt ? `Сотрудник ${user.login} разблокирован` : `Сотрудник ${user.login} заблокирован, его сессии завершены`)
      await load()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy('')
    }
  }
  return (
    <section className="space-y-6" aria-labelledby="admin-users-title">
      <h2 id="admin-users-title" className="font-serif text-2xl text-clay-dark">Пользователи панели</h2>
      <form onSubmit={create} className="clay-card flex flex-wrap items-end gap-3 p-5" aria-label="Новый сотрудник">
        <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Имя пользователя<input className={INPUT_CLASS} autoComplete="off" required value={form.login} onChange={(event) => setForm({ ...form, login: event.target.value })} /></label>
        <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Отображаемое имя<input className={INPUT_CLASS} autoComplete="off" required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label>
        <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Пароль<input className={INPUT_CLASS} type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
        <button type="submit" className={SMALL_BUTTON} disabled={busy === 'create'}><UserPlus aria-hidden="true" size={17} />Добавить сотрудника</button>
        <p className="w-full text-xs text-clay-admin-muted">Имя пользователя: строчные латинские буквы, цифры, точка, дефис или подчёркивание. Пароль не короче {PASSWORD_MIN_LENGTH} символов.</p>
      </form>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-clay-admin-dark">{notice}</p>}
      <div className="overflow-x-auto rounded-2xl border border-clay-admin-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-clay-admin-muted"><tr><th className="px-4 py-2.5">Пользователь</th><th className="w-36 px-4 py-2.5">Роль</th><th className="w-40 px-4 py-2.5">Создан</th><th className="w-40 px-4 py-2.5">Состояние</th><th className="w-28 px-4 py-2.5"><span className="sr-only">Действия</span></th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-clay-admin-border align-top">
                <td className="px-4 py-2.5"><span className="block font-semibold text-clay-admin-dark">{user.displayName}{user.id === me ? ' (вы)' : ''}</span><span className="block font-mono text-xs text-clay-admin-muted">{user.login}</span>{passwordFor === user.id && <PasswordForm user={user} onDone={() => { setPasswordFor(undefined); setNotice(`Пароль ${user.login} изменён`) }} onCancel={() => setPasswordFor(undefined)} />}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{ROLE_LABELS[user.role] ?? user.role}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-clay-admin-muted">{date(user.createdAt)}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{user.disabledAt ? <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Заблокирован</span> : <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Активен</span>}</td>
                <td className="px-4 py-2.5"><div className="flex justify-end gap-1.5"><button type="button" className={ICON_BUTTON} title="Сменить пароль" aria-label={`Сменить пароль ${user.login}`} onClick={() => setPasswordFor(passwordFor === user.id ? undefined : user.id)}><KeyRound aria-hidden="true" size={17} /></button>{user.role === 'staff' && (user.disabledAt ? <button type="button" className={ICON_BUTTON} title="Разблокировать" aria-label={`Разблокировать ${user.login}`} disabled={busy === user.id} onClick={() => toggle(user)}><LockOpen aria-hidden="true" size={17} /></button> : <button type="button" className={ICON_BUTTON_DANGER} title="Заблокировать" aria-label={`Заблокировать ${user.login}`} disabled={busy === user.id} onClick={() => toggle(user)}><Lock aria-hidden="true" size={17} /></button>)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
