import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Phone, X } from 'lucide-react'
import { validateBookingPayload } from '../../lib/appointment-validation.js'
import { PHONE_DISPLAY, PHONE_NUMBER } from '../../lib/contacts.js'
import { matchesFilter } from '../../lib/filters.js'
import { AppointmentTypePicker } from './AppointmentTypePicker.jsx'
import { BookingDialogFooter } from './BookingDialogFooter.jsx'
import { BookingResult } from './BookingResult.jsx'
import { BookingReview } from './BookingReview.jsx'
import { DoctorPicker } from './DoctorPicker.jsx'
import { DoctorSummary } from './DoctorSummary.jsx'
import { PatientDetailsForm } from './PatientDetailsForm.jsx'
import { SchedulePicker } from './SchedulePicker.jsx'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/
const PERIODS = new Set(['morning', 'day', 'evening'])
const REASONS = new Set(['AVAILABLE', 'NO_SCHEDULE', 'NO_APPOINTMENT_TYPES', 'NO_SLOTS'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALIDATION_INTENT_ID = '11111111-1111-4111-8111-111111111111'
const EMPTY_PATIENT = Object.freeze({ firstName: '', lastName: '', secondName: '', phone: '', birthday: '' })
const FIELD_ORDER = Object.freeze(['patient.firstName', 'patient.lastName', 'patient.secondName', 'patient.phone', 'patient.birthday', 'comment', 'consent'])
const FIELD_NAMES = Object.freeze({ 'patient.firstName': 'firstName', 'patient.lastName': 'lastName', 'patient.secondName': 'secondName', 'patient.phone': 'phone', 'patient.birthday': 'birthday', comment: 'comment', consent: 'consent' })
const VALIDATION_FIELDS = new Set([...FIELD_ORDER, 'doctorSlug', 'appointmentType', 'intentId', 'dtStart', 'dtEnd'])
const FIELD_IDS = Object.freeze({ firstName: 'booking-patient-first-name', lastName: 'booking-patient-last-name', secondName: 'booking-patient-second-name', phone: 'booking-patient-phone', birthday: 'booking-patient-birthday', comment: 'booking-patient-comment', consent: 'booking-patient-consent' })
const FIELD_MESSAGES = Object.freeze({ firstName: 'Укажите имя', lastName: 'Укажите фамилию', secondName: 'Проверьте отчество', phone: 'Укажите российский номер телефона', birthday: 'Укажите корректную дату рождения', comment: 'Комментарий не должен превышать 300 символов', consent: 'Подтвердите согласие' })
const FOCUSABLE_SELECTOR = 'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'
const EMPTY_COPY = Object.freeze({ NO_SCHEDULE: Object.freeze({ title: 'Расписание пока не опубликовано', message: 'Проверьте следующие даты или выберите другого врача' }), NO_APPOINTMENT_TYPES: Object.freeze({ title: 'Нет доступных типов приёма', message: 'Выберите другого врача или свяжитесь с клиникой' }), NO_SLOTS: Object.freeze({ title: 'Нет свободного времени', message: 'Проверьте следующие даты или выберите другого врача' }) })
const SPECIALTY_QUALIFIERS = new Set(['врач', 'узд', 'дмн', 'кмн', 'доктор', 'кандидат', 'медицинских', 'наук', 'профессор', 'доцент', 'высшая', 'высшей', 'категория', 'категории'])

function defaultFetch(...input) {
  return globalThis.fetch(...input)
}

function defaultClock() {
  return new Date()
}

function defaultUuid() {
  return globalThis.crypto.randomUUID()
}

function clinicDate(now) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function addDays(value, days) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + days)
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function trustedText(value) {
  if (typeof value !== 'string' || value.length === 0) return false
  return [...value].every((character) => {
    const code = character.codePointAt(0)
    return code > 31 && (code < 127 || code > 159) && (code < 0xD800 || code > 0xDFFF)
  })
}

function specialtyWords(value) {
  if (typeof value !== 'string') return new Set()
  return new Set(value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('ru-RU').split(/[^\p{L}\p{N}]+/u).filter((word) => word && !SPECIALTY_QUALIFIERS.has(word)))
}

function sameSpecialty(left, right) {
  const expected = specialtyWords(left?.specialization)
  return [...specialtyWords(right?.specialization)].some((word) => expected.has(word))
}

function validTimeZone(value) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

function validTimestamp(value) {
  return typeof value === 'string' && TIMESTAMP_PATTERN.test(value) && Number.isFinite(Date.parse(value))
}

function clinicSlotFields(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(timestamp))
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  const hour = Number(values.hour)
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}`, period: hour < 11 ? 'morning' : hour < 17 ? 'day' : 'evening' }
}

function validDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function publicDoctor(value) {
  if (!record(value)) throw new TypeError('Booking schedule doctor is invalid')
  if (![value.slug, value.name, value.location, value.timeZone].every((field) => typeof field === 'string' && field.length > 0)) throw new TypeError('Booking schedule doctor fields are invalid')
  if (!trustedText(value.name) || !trustedText(value.location)) throw new TypeError('Booking schedule doctor text is invalid')
  if (!validTimeZone(value.timeZone)) throw new TypeError('Booking schedule doctor time zone is invalid')
  return Object.freeze({ slug: value.slug, name: value.name, location: value.location, timeZone: value.timeZone })
}

function appointmentType(value) {
  if (!record(value) || typeof value.key !== 'string' || typeof value.label !== 'string') throw new TypeError('Booking appointment type is invalid')
  if (!trustedText(value.label)) throw new TypeError('Booking appointment type text is invalid')
  if (typeof value.price !== 'number' || !Number.isFinite(value.price) || value.price < 0) throw new TypeError('Booking appointment price is invalid')
  if (!Number.isSafeInteger(value.minAge) || value.minAge < 0) throw new TypeError('Booking appointment minimum age is invalid')
  if (value.maxAge !== null && (!Number.isSafeInteger(value.maxAge) || value.maxAge < value.minAge)) throw new TypeError('Booking appointment maximum age is invalid')
  return Object.freeze({ key: value.key, label: value.label, price: value.price, minAge: value.minAge, maxAge: value.maxAge })
}

function slot(value, date, timeZone) {
  if (!record(value) || typeof value.startsAt !== 'string' || typeof value.endsAt !== 'string' || typeof value.time !== 'string' || typeof value.period !== 'string') throw new TypeError('Booking schedule slot is invalid')
  if (!validTimestamp(value.startsAt) || !validTimestamp(value.endsAt) || Date.parse(value.endsAt) <= Date.parse(value.startsAt)) throw new TypeError('Booking schedule slot timestamps are invalid')
  if (!/^\d{2}:\d{2}$/.test(value.time) || !PERIODS.has(value.period)) throw new TypeError('Booking schedule slot display fields are invalid')
  const start = clinicSlotFields(value.startsAt, timeZone)
  if (start.date !== date || start.time !== value.time || start.period !== value.period) throw new TypeError('Booking schedule slot display fields do not match clinic time')
  return Object.freeze({ startsAt: value.startsAt, endsAt: value.endsAt, time: value.time, period: value.period })
}

function scheduleDate(value, timeZone) {
  if (!record(value) || !validDate(value.date) || !Array.isArray(value.slots)) throw new TypeError('Booking schedule date is invalid')
  const slots = Object.freeze(value.slots.map((candidate) => slot(candidate, value.date, timeZone)))
  if (!Number.isSafeInteger(value.count) || value.count !== slots.length) throw new TypeError('Booking schedule date count is invalid')
  return Object.freeze({ date: value.date, count: value.count, slots })
}

function schedulePayload(value, windowStart) {
  if (!record(value) || !record(value.data)) throw new TypeError('Booking schedule response is invalid')
  if (!validDate(windowStart)) throw new TypeError('Booking schedule window is invalid')
  const data = value.data
  if (typeof data.available !== 'boolean' || typeof data.reason !== 'string' || !REASONS.has(data.reason)) throw new TypeError('Booking schedule availability is invalid')
  if (!Array.isArray(data.appointmentTypes) || !Array.isArray(data.dates)) throw new TypeError('Booking schedule collections are invalid')
  const doctor = publicDoctor(data.doctor)
  const appointmentTypes = Object.freeze(data.appointmentTypes.map(appointmentType))
  const dates = Object.freeze(data.dates.map((candidate) => scheduleDate(candidate, doctor.timeZone)))
  const windowEnd = addDays(windowStart, 14)
  if (dates.some((date) => date.date < windowStart || date.date >= windowEnd)) throw new TypeError('Booking schedule date is outside the requested window')
  if (data.available && (data.reason !== 'AVAILABLE' || appointmentTypes.length === 0 || dates.length === 0)) throw new TypeError('Available booking schedule is empty')
  if (data.available && dates.some((date) => date.count === 0)) throw new TypeError('Available booking schedule contains an empty date')
  if (!data.available && data.reason === 'AVAILABLE') throw new TypeError('Unavailable booking schedule has an available reason')
  if (!data.available && dates.length > 0) throw new TypeError('Unavailable booking schedule contains dates')
  if (!data.available && ['NO_SCHEDULE', 'NO_APPOINTMENT_TYPES'].includes(data.reason) && appointmentTypes.length > 0) throw new TypeError('Unavailable booking schedule contains appointment types')
  if (!data.available && data.reason === 'NO_SLOTS' && appointmentTypes.length === 0) throw new TypeError('Slot-empty booking schedule has no appointment types')
  return Object.freeze({ available: data.available, reason: data.reason, doctor, appointmentTypes, dates })
}

function errorTitle(status) {
  if (status === 429) return 'Слишком много запросов'
  if (status === 503) return 'Расписание временно недоступно'
  return 'Не удалось загрузить расписание'
}

function validationErrors(fields) {
  const errors = {}
  for (const field of FIELD_ORDER) {
    if (!Object.hasOwn(fields, field)) continue
    const name = FIELD_NAMES[field]
    errors[name] = FIELD_MESSAGES[name]
  }
  return errors
}

function validationRoute(fields) {
  if (!record(fields)) return 'failed'
  const keys = Object.keys(fields)
  if (keys.length === 0 || keys.some((key) => !VALIDATION_FIELDS.has(key))) return 'failed'
  if (keys.includes('doctorSlug') || keys.includes('intentId')) return 'failed'
  if (keys.includes('appointmentType')) return 'type'
  if (keys.includes('dtStart') || keys.includes('dtEnd')) return 'slot'
  return 'patient'
}

function firstError(errors) {
  return FIELD_ORDER.map((field) => FIELD_NAMES[field]).find((name) => errors[name]) ?? ''
}

function semanticPayload({ doctor, appointmentType, slot: selected, patient, comment, consent }) {
  return { doctorSlug: doctor.slug, appointmentType: appointmentType.key, intentId: VALIDATION_INTENT_ID, dtStart: selected.startsAt, dtEnd: selected.endsAt, patient, comment, consent }
}

function reviewPayload(validation, source) {
  return Object.freeze({ doctorSlug: source.doctorSlug, appointmentType: source.appointmentType, dtStart: source.dtStart, dtEnd: source.dtEnd, patient: Object.freeze({ ...validation.value.patient, phone: source.patient.phone.trim() }), phoneIdentity: validation.value.patient.phone, comment: validation.value.comment, consent: true })
}

function confirmedPayload(value, submitted, expectedTimeZone, now) {
  if (!record(value) || !record(value.data) || value.data.status !== 'confirmed') throw new TypeError('Booking confirmation response is invalid')
  const data = value.data
  if (typeof data.claimId !== 'string' || !UUID_PATTERN.test(data.claimId)) throw new TypeError('Booking confirmation claim is invalid')
  const doctor = publicDoctor(data.doctor)
  if (!record(data.appointmentType) || typeof data.appointmentType.key !== 'string' || typeof data.appointmentType.label !== 'string') throw new TypeError('Booking confirmation type is invalid')
  if (!trustedText(data.appointmentType.label)) throw new TypeError('Booking confirmation type text is invalid')
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError('Booking confirmation clock is invalid')
  if (!validTimestamp(data.startsAt) || !validTimestamp(data.endsAt) || Date.parse(data.endsAt) <= Date.parse(data.startsAt)) throw new TypeError('Booking confirmation timestamps are invalid')
  if (typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price < 0) throw new TypeError('Booking confirmation price is invalid')
  if (doctor.timeZone !== expectedTimeZone) throw new TypeError('Booking confirmation time zone does not match schedule')
  if (doctor.slug !== submitted.doctorSlug || data.appointmentType.key !== submitted.appointmentType || Date.parse(data.startsAt) !== Date.parse(submitted.dtStart) || Date.parse(data.endsAt) !== Date.parse(submitted.dtEnd)) throw new TypeError('Booking confirmation scope is invalid')
  return Object.freeze({ status: 'confirmed', claimId: data.claimId, doctor, appointmentType: Object.freeze({ key: data.appointmentType.key, label: data.appointmentType.label }), startsAt: data.startsAt, endsAt: data.endsAt, price: data.price, dtstamp: now.toISOString() })
}

function protectedPayload(value) {
  if (!record(value) || !record(value.data)) throw new TypeError('Booking protected response is invalid')
  const data = value.data
  if (!['pending', 'uncertain'].includes(data.status) || data.canRetry !== false) throw new TypeError('Booking protected status is invalid')
  if (data.status === 'uncertain' && data.phoneFallback !== true) throw new TypeError('Booking uncertain fallback is invalid')
  return Object.freeze({ status: data.status })
}

function bookingError(value) {
  if (!record(value) || typeof value.error !== 'string' || value.error.length === 0 || typeof value.message !== 'string' || value.message.length === 0) throw new TypeError('Booking error response is invalid')
  if (value.fields !== undefined && !record(value.fields)) throw new TypeError('Booking error fields are invalid')
  return value
}

function sameSubmission(payload, review, submittedPhone) {
  if (!payload || !review) return false
  return submittedPhone === review.phoneIdentity && payload.doctorSlug === review.doctorSlug && payload.appointmentType === review.appointmentType && payload.dtStart === review.dtStart && payload.dtEnd === review.dtEnd && payload.comment === review.comment && payload.consent === review.consent && FIELD_ORDER.slice(0, 5).every((field) => {
    const name = FIELD_NAMES[field]
    if (name === 'phone') return true
    return payload.patient[name] === review.patient[name]
  })
}

function submission(review, intentId) {
  return Object.freeze({ doctorSlug: review.doctorSlug, appointmentType: review.appointmentType, intentId, dtStart: review.dtStart, dtEnd: review.dtEnd, patient: Object.freeze({ ...review.patient }), comment: review.comment, consent: true })
}

function retryAfterDelay(response, now) {
  const value = response.headers?.get?.('Retry-After')?.trim() ?? ''
  if (!value) return 0
  const seconds = /^\d+$/.test(value) ? Number(value) : Math.ceil((Date.parse(value) - now.getTime()) / 1000)
  if (!Number.isFinite(seconds) || seconds <= 0) return 0
  return Math.min(seconds, 3600)
}

export function BookingFlow({ doctors, pageDoctorSlug = '', fetcher = defaultFetch, uuid = defaultUuid, clock = defaultClock }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [specialty, setSpecialty] = useState('all')
  const [doctor, setDoctor] = useState(undefined)
  const [step, setStep] = useState('doctor')
  const [windowStart, setWindowStart] = useState('')
  const [schedule, setSchedule] = useState(undefined)
  const [selectedType, setSelectedType] = useState(undefined)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(undefined)
  const [scheduleError, setScheduleError] = useState(undefined)
  const [patient, setPatient] = useState({ ...EMPTY_PATIENT })
  const [comment, setComment] = useState('')
  const [consent, setConsent] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [review, setReview] = useState(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState(undefined)
  const [submittedPayload, setSubmittedPayload] = useState(undefined)
  const [liveMessage, setLiveMessage] = useState('')
  const [choiceFocus, setChoiceFocus] = useState('')
  const [retryAfter, setRetryAfter] = useState(0)
  const [scheduleRetryAfter, setScheduleRetryAfter] = useState(0)
  const [conflictKind, setConflictKind] = useState('')
  const [actionsTarget, setActionsTarget] = useState(undefined)
  const triggerRef = useRef(undefined)
  const dialogRef = useRef(undefined)
  const openedRef = useRef(false)
  const invalidFocusRef = useRef('')
  const submittingRef = useRef(false)
  const conflictRef = useRef(undefined)
  const submittedTimeZoneRef = useRef('')
  const submittedPhoneRef = useRef('')
  const close = useCallback(() => {
    if (submittingRef.current) return
    setPatient({ ...EMPTY_PATIENT })
    setComment('')
    setConsent(false)
    setReview(undefined)
    setFieldErrors({})
    setSubmittedPayload(undefined)
    setResult(undefined)
    setRetryAfter(0)
    setScheduleRetryAfter(0)
    setLiveMessage('')
    setConflictKind('')
    conflictRef.current = undefined
    submittedTimeZoneRef.current = ''
    submittedPhoneRef.current = ''
    setIsOpen(false)
  }, [])
  const selectDoctor = useCallback((selected) => {
    setDoctor(selected)
    setSchedule(undefined)
    setSelectedType(undefined)
    setSelectedDate('')
    setSelectedSlot(undefined)
    setScheduleError(undefined)
    setScheduleRetryAfter(0)
    setLiveMessage('Загружаем расписание')
    setStep('loading')
  }, [])
  const openFrom = useCallback((trigger) => {
      const explicit = trigger.getAttribute('data-booking-doctor')?.trim() ?? ''
      const slug = explicit || pageDoctorSlug
      const selected = slug ? doctors.find((candidate) => candidate.slug === slug) : undefined
      triggerRef.current = trigger
      setQuery('')
      setSpecialty(trigger.getAttribute('data-booking-specialty')?.trim() || 'all')
      setWindowStart(clinicDate(clock()))
      setDoctor(selected)
      setSchedule(undefined)
      setSelectedType(undefined)
      setSelectedDate('')
      setSelectedSlot(undefined)
      setScheduleError(undefined)
      setPatient({ ...EMPTY_PATIENT })
      setComment('')
      setConsent(false)
      setReview(undefined)
      setFieldErrors({})
      setResult(undefined)
      setSubmittedPayload(undefined)
      setRetryAfter(0)
      setScheduleRetryAfter(0)
      setLiveMessage(slug ? (selected ? 'Загружаем расписание' : 'Онлайн-запись недоступна') : 'Выберите врача')
      setConflictKind('')
      conflictRef.current = undefined
      submittedTimeZoneRef.current = ''
      submittedPhoneRef.current = ''
      setStep(slug ? (selected ? 'loading' : 'unavailable') : 'doctor')
      setIsOpen(true)
  }, [clock, doctors, pageDoctorSlug])
  useEffect(() => {
    function open(event) {
      const trigger = event.target instanceof Element ? event.target.closest('[data-booking-btn]') : undefined
      if (!trigger) return
      event.preventDefault()
      openFrom(trigger)
    }
    document.addEventListener('click', open)
    return () => document.removeEventListener('click', open)
  }, [openFrom])
  /**
   * The island hydrates on idle, so Layout.astro parks clicks made before mount on the trigger
   * as data-booking-pending; announcing readiness stops that capture and replays the parked click.
   */
  useEffect(() => {
    document.dispatchEvent(new Event('clod:booking-ready'))
    const pending = document.querySelector('[data-booking-btn][data-booking-pending]')
    if (!pending) return
    pending.removeAttribute('data-booking-pending')
    openFrom(pending)
  }, [openFrom])
  useEffect(() => {
    if (isOpen) {
      openedRef.current = true
      dialogRef.current?.focus()
      return
    }
    if (!openedRef.current) return
    openedRef.current = false
    if (triggerRef.current?.isConnected) triggerRef.current.focus()
  }, [isOpen])
  useEffect(() => {
    if (!isOpen || !dialogRef.current || dialogRef.current.contains(document.activeElement)) return
    dialogRef.current.focus()
  })
  useEffect(() => {
    if (retryAfter <= 0) return undefined
    const timer = window.setTimeout(() => setRetryAfter((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [retryAfter])
  useEffect(() => {
    if (scheduleRetryAfter <= 0) return undefined
    const timer = window.setTimeout(() => setScheduleRetryAfter((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [scheduleRetryAfter])
  useEffect(() => {
    if (!isOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
    const currentPadding = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [isOpen])
  useEffect(() => {
    if (!isOpen || !doctor || step !== 'loading' || !windowStart) return undefined
    let active = true
    async function load() {
      try {
        const url = `/api/appointments/slots?doctor=${encodeURIComponent(doctor.slug)}&from=${windowStart}&days=14`
        const response = await fetcher(url, { headers: { Accept: 'application/json' } })
        if (!response || typeof response.ok !== 'boolean' || typeof response.json !== 'function') throw new TypeError('Booking schedule transport response is invalid')
        if (!response.ok) {
          if (active) {
            const title = errorTitle(response.status)
            setScheduleError({ title, retryable: response.status === 429 || response.status === 503 })
            setScheduleRetryAfter(response.status === 429 ? retryAfterDelay(response, clock()) : 0)
            setLiveMessage(title)
            setStep('schedule-error')
          }
          return
        }
        const data = schedulePayload(await response.json(), windowStart)
        if (!active) return
        if (data.doctor.slug !== doctor.slug) throw new TypeError('Booking schedule doctor does not match request')
        const conflict = conflictRef.current
        const preservedType = conflict?.kind === 'slot' ? data.appointmentTypes.find((candidate) => candidate.key === conflict.typeKey) : undefined
        const type = preservedType ?? (data.appointmentTypes.length === 1 ? data.appointmentTypes[0] : undefined)
        const date = data.dates.find((candidate) => candidate.count > 0)?.date ?? ''
        const nextStep = data.available ? (type ? 'schedule' : 'type') : 'empty'
        setSchedule(data)
        setSelectedType(type)
        setSelectedDate(date)
        setSelectedSlot(undefined)
        setScheduleError(undefined)
        setScheduleRetryAfter(0)
        setStep(nextStep)
        if (!conflict) setLiveMessage(data.available ? 'Расписание загружено' : EMPTY_COPY[data.reason].title)
        if (conflict && data.available) setChoiceFocus(nextStep === 'type' ? 'type' : 'slot')
        conflictRef.current = undefined
      } catch {
        if (!active) return
        setScheduleError({ title: 'Не удалось загрузить расписание', retryable: false })
        setScheduleRetryAfter(0)
        setLiveMessage('Не удалось загрузить расписание')
        setStep('schedule-error')
      }
    }
    load()
    return () => {
      active = false
    }
  }, [clock, doctor, fetcher, isOpen, step, windowStart])
  useEffect(() => {
    if (step !== 'patient' || !invalidFocusRef.current) return
    const field = document.getElementById(FIELD_IDS[invalidFocusRef.current])
    invalidFocusRef.current = ''
    field?.focus()
  }, [fieldErrors, step])
  useEffect(() => {
    if (!choiceFocus) return
    const choice = document.querySelector(choiceFocus === 'type' ? '[data-booking-type]' : '[data-booking-time]')
    if (!choice) return
    setChoiceFocus('')
    choice.focus()
  }, [choiceFocus, schedule, step])
  function chooseType(type) {
    setSelectedType(type)
    setSelectedSlot(undefined)
    setConflictKind('')
    setStep('schedule')
  }
  function chooseDate(date) {
    setSelectedDate(date)
    setSelectedSlot(undefined)
  }
  function chooseSlot(slot) {
    setSelectedSlot(slot)
    setConflictKind('')
  }
  function loadLater() {
    setWindowStart((current) => addDays(current, 14))
    setScheduleError(undefined)
    setScheduleRetryAfter(0)
    setLiveMessage('Загружаем расписание')
    setStep('loading')
  }
  function retrySchedule() {
    if (scheduleRetryAfter > 0) return
    setScheduleError(undefined)
    setScheduleRetryAfter(0)
    setLiveMessage('Загружаем расписание')
    setStep('loading')
  }
  function chooseAnotherDoctor() {
    setDoctor(undefined)
    setSchedule(undefined)
    setSelectedType(undefined)
    setSelectedDate('')
    setSelectedSlot(undefined)
    setScheduleRetryAfter(0)
    setConflictKind('')
    setLiveMessage('Выберите врача')
    setStep('doctor')
  }
  function continueSchedule() {
    if (!selectedSlot) return
    setFieldErrors({})
    setStep('patient')
  }
  function changePatient(name, value) {
    setPatient((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }
  function changeComment(value) {
    setComment(value)
    setFieldErrors((current) => {
      if (!current.comment) return current
      const next = { ...current }
      delete next.comment
      return next
    })
  }
  function changeConsent(value) {
    setConsent(value)
    setFieldErrors((current) => {
      if (!current.consent) return current
      const next = { ...current }
      delete next.consent
      return next
    })
  }
  function inspectPatient() {
    if (!doctor || !selectedType || !selectedSlot) return
    const source = semanticPayload({ doctor, appointmentType: selectedType, slot: selectedSlot, patient, comment, consent })
    const validation = validateBookingPayload(source, { now: clock() })
    if (!validation.valid) {
      routeValidationErrors(validation.error.fields)
      return
    }
    setReview(reviewPayload(validation, source))
    setFieldErrors({})
    setStep('review')
  }
  function showPatientErrors(errors) {
    invalidFocusRef.current = firstError(errors)
    setFieldErrors(errors)
    setResult(undefined)
    setRetryAfter(0)
    setLiveMessage('Проверьте данные пациента')
    setStep('patient')
  }
  function routeValidationErrors(fields) {
    const route = validationRoute(fields)
    if (route === 'slot' || route === 'type') {
      refreshConflict(route)
      return
    }
    if (route === 'failed') {
      protectedResult('failed')
      return
    }
    showPatientErrors(validationErrors(fields))
  }
  function refreshConflict(kind) {
    conflictRef.current = { kind, typeKey: selectedType?.key ?? '' }
    setConflictKind(kind)
    setSelectedSlot(undefined)
    if (kind === 'type') setSelectedType(undefined)
    setResult(undefined)
    setRetryAfter(0)
    setLiveMessage(kind === 'slot' ? 'Выбранное время изменилось. Выберите новое время' : 'Тип приёма изменился. Выберите новый тип приёма')
    setStep('loading')
  }
  function protectedResult(status, delay = 0) {
    setResult(Object.freeze({ status }))
    setRetryAfter(delay)
    setLiveMessage(status === 'retryable' ? 'Отправку можно безопасно повторить' : 'Не удалось подтвердить запись')
    setStep('result')
  }
  function handleDialogKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key !== 'Tab') return
    const dialog = dialogRef.current
    if (!dialog) return
    const controls = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)]
    if (controls.length === 0) {
      event.preventDefault()
      dialog.focus()
      return
    }
    const first = controls[0]
    const last = controls.at(-1)
    const outside = !dialog.contains(document.activeElement)
    if (event.shiftKey && (document.activeElement === first || outside || document.activeElement === dialog)) {
      event.preventDefault()
      last.focus()
      return
    }
    if (!event.shiftKey && (document.activeElement === last || outside || document.activeElement === dialog)) {
      event.preventDefault()
      first.focus()
    }
  }
  function dismissBackdrop(event) {
    if (event.target !== event.currentTarget) return
    close()
  }
  async function submit(payload, expectedTimeZone) {
    if (submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    setRetryAfter(0)
    setLiveMessage('Отправляем запрос на запись')
    try {
      const response = await fetcher('/api/appointments/book', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!response || typeof response.status !== 'number' || typeof response.json !== 'function') throw new TypeError('Booking transport response is invalid')
      const body = await response.json()
      if ([200, 201].includes(response.status)) {
        const confirmation = confirmedPayload(body, payload, expectedTimeZone, clock())
        setResult(confirmation)
        setPatient({ ...EMPTY_PATIENT })
        setComment('')
        setConsent(false)
        setReview(undefined)
        setSubmittedPayload(undefined)
        submittedTimeZoneRef.current = ''
        submittedPhoneRef.current = ''
        setRetryAfter(0)
        setFieldErrors({})
        setLiveMessage('Запись подтверждена')
        setStep('result')
        return
      }
      if (response.status === 202) {
        const protectedOutcome = protectedPayload(body)
        setResult(protectedOutcome)
        setRetryAfter(0)
        setLiveMessage(protectedOutcome.status === 'pending' ? 'Запись обрабатывается' : 'Статус записи не подтверждён')
        setStep('result')
        return
      }
      const failure = bookingError(body)
      if (response.status === 409 && failure.refreshSchedule === true && failure.freshIntentRequired === true && failure.error === 'SLOT_UNAVAILABLE') {
        refreshConflict('slot')
        return
      }
      if (response.status === 409 && failure.refreshSchedule === true && failure.freshIntentRequired === true && failure.error === 'APPOINTMENT_TYPE_UNAVAILABLE') {
        refreshConflict('type')
        return
      }
      if (response.status === 400 && failure.error === 'VALIDATION_ERROR' && failure.fields) {
        routeValidationErrors(failure.fields)
        return
      }
      if (response.status === 400 && failure.error === 'AGE_NOT_ALLOWED') {
        showPatientErrors({ birthday: 'Этот тип приёма не подходит по возрасту' })
        return
      }
      if ((response.status === 429 && failure.error === 'RATE_LIMITED') || (response.status === 503 && failure.error === 'BOOKING_UNAVAILABLE')) {
        protectedResult('retryable', response.status === 429 ? retryAfterDelay(response, clock()) : 0)
        return
      }
      if ((response.status === 409 && failure.error === 'BOOKING_REQUEST_CONFLICT') || (response.status === 422 && failure.error === 'BOOKING_REJECTED')) {
        protectedResult('failed')
        return
      }
      protectedResult('failed')
    } catch {
      protectedResult('uncertain')
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }
  function submitReview() {
    if (!review || submittingRef.current) return
    if (sameSubmission(submittedPayload, review, submittedPhoneRef.current)) {
      submit(submittedPayload, submittedTimeZoneRef.current)
      return
    }
    let intentId
    try {
      intentId = uuid()
    } catch {
      protectedResult('failed')
      return
    }
    if (typeof intentId !== 'string' || !UUID_PATTERN.test(intentId)) {
      protectedResult('failed')
      return
    }
    const payload = submission(review, intentId)
    const expectedTimeZone = schedule?.doctor.timeZone ?? ''
    if (!validTimeZone(expectedTimeZone)) {
      protectedResult('failed')
      return
    }
    setSubmittedPayload(payload)
    submittedTimeZoneRef.current = expectedTimeZone
    submittedPhoneRef.current = review.phoneIdentity
    submit(payload, expectedTimeZone)
  }
  function retrySubmission() {
    if (!submittedPayload || submittingRef.current) return
    submit(submittedPayload, submittedTimeZoneRef.current)
  }
  const showSummary = doctor && schedule && step !== 'result'
  const empty = step === 'empty' && schedule ? EMPTY_COPY[schedule.reason] : undefined
  const alternatives = empty && doctor ? doctors.filter((candidate) => candidate.slug !== doctor.slug && sameSpecialty(doctor, candidate)).slice(0, 2) : []
  if (!isOpen) return null
  return (
    <div onClick={dismissBackdrop} className="booking-overlay fixed inset-0 z-[10000] flex items-center justify-center bg-clay-dark/50 p-4" data-booking-state={step} data-submitting={isSubmitting ? 'true' : 'false'} data-booking-conflict={conflictKind || undefined}>
      <section ref={dialogRef} tabIndex={-1} onKeyDown={handleDialogKeyDown} role="dialog" aria-modal="true" aria-labelledby="booking-dialog-title" aria-busy={isSubmitting} data-empty-reason={empty ? schedule.reason : undefined} className="booking-dialog relative max-h-[calc(100dvh-2rem)] w-full max-w-[960px] overflow-y-auto rounded-[var(--radius-xl)] bg-white p-6 shadow-xl focus:outline-none">
        <header className="booking-dialog-header flex items-start justify-between gap-4 border-b border-clay-bg pb-4">
          <h2 id="booking-dialog-title" className="font-serif text-2xl text-clay-dark">Онлайн-запись</h2>
          <button type="button" disabled={isSubmitting} onClick={close} className="booking-close flex min-h-11 min-w-11 items-center justify-center rounded-full text-clay-muted hover:bg-clay-bg disabled:cursor-not-allowed disabled:opacity-50" aria-label="Закрыть запись"><X aria-hidden="true" size={20} /></button>
        </header>
        <div className="booking-dialog-body" data-booking-summary={showSummary ? 'true' : 'false'}>
          <div className="booking-dialog-scroll">
            {showSummary && <DoctorSummary doctor={doctor} location={schedule.doctor.location} appointmentType={selectedType} slot={selectedSlot} />}
            <div className="booking-dialog-content min-w-0" aria-busy={isSubmitting}>
            {step === 'doctor' && <DoctorPicker doctors={doctors.filter((candidate) => matchesFilter(candidate, specialty))} query={query} onQueryChange={setQuery} onSelect={selectDoctor} />}
            {step === 'loading' && <div className="booking-loading flex min-h-52 items-center justify-center gap-3 text-clay-muted"><Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={20} />Загружаем расписание</div>}
            {step === 'type' && schedule && <AppointmentTypePicker types={schedule.appointmentTypes} selectedKey={selectedType?.key ?? ''} onSelect={chooseType} />}
            {step === 'schedule' && schedule && <SchedulePicker dates={schedule.dates} selectedDate={selectedDate} selectedSlot={selectedSlot} actionsTarget={actionsTarget} onSelectDate={chooseDate} onSelectSlot={chooseSlot} onContinue={continueSchedule} />}
            {step === 'patient' && <PatientDetailsForm patient={patient} comment={comment} consent={consent} errors={fieldErrors} actionsTarget={actionsTarget} onPatientChange={changePatient} onCommentChange={changeComment} onConsentChange={changeConsent} onBack={() => setStep('schedule')} onContinue={inspectPatient} />}
            {step === 'review' && review && <BookingReview patient={review.patient} comment={review.comment} isSubmitting={isSubmitting} actionsTarget={actionsTarget} onBack={() => setStep('patient')} onSubmit={submitReview} />}
            {step === 'result' && result && <BookingResult result={result} isSubmitting={isSubmitting} retryAfter={retryAfter} actionsTarget={actionsTarget} onAction={retrySubmission} onClose={close} />}
            {step === 'empty' && empty && <div className="booking-empty"><h3 className="font-serif text-3xl text-clay-dark">{empty.title}</h3><p className="mt-3 text-clay-muted">{empty.message}</p>{alternatives.length > 0 && <div className="booking-alternatives mt-6"><h4 className="text-sm font-semibold text-clay-dark">Врачи этой специальности</h4><div className="mt-3 grid gap-2 sm:grid-cols-2">{alternatives.map((alternative) => <button key={alternative.slug} type="button" data-booking-alternative={alternative.slug} onClick={() => selectDoctor(alternative)} className="booking-alternative min-h-11 rounded-2xl border border-clay-bg bg-white p-3 text-left text-clay-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-mint"><span className="block font-semibold">{alternative.name}</span><span className="mt-1 block text-sm text-clay-muted">{alternative.specialization}</span></button>)}</div></div>}<BookingDialogFooter target={actionsTarget}><button type="button" onClick={loadLater} className="booking-later btn-clay-primary min-h-11">Следующие 14 дней</button><button type="button" onClick={chooseAnotherDoctor} className="booking-other-doctor btn-clay-secondary min-h-11">Выбрать другого врача</button><a href={`tel:${PHONE_NUMBER}`} className="booking-phone btn-clay-secondary min-h-11"><Phone aria-hidden="true" size={18} />{PHONE_DISPLAY}</a></BookingDialogFooter></div>}
            {step === 'schedule-error' && <div className="booking-schedule-error"><h3 className="font-serif text-3xl text-clay-dark">{scheduleError?.title}</h3><p className="mt-3 text-clay-muted">Свяжитесь с клиникой, если расписание не откроется</p><BookingDialogFooter target={actionsTarget}>{scheduleError?.retryable && <button type="button" disabled={scheduleRetryAfter > 0} onClick={retrySchedule} className="booking-retry btn-clay-primary min-h-11 disabled:cursor-not-allowed disabled:opacity-50">{scheduleRetryAfter > 0 ? `Повторить через ${scheduleRetryAfter} с` : 'Повторить загрузку'}</button>}<a href={`tel:${PHONE_NUMBER}`} className="booking-phone btn-clay-secondary min-h-11"><Phone aria-hidden="true" size={18} />{PHONE_DISPLAY}</a></BookingDialogFooter></div>}
            {step === 'unavailable' && <div className="booking-unavailable"><h3 className="font-serif text-3xl text-clay-dark">Онлайн-запись недоступна</h3><p className="mt-3 text-clay-muted">Выберите другого врача или свяжитесь с клиникой по телефону</p><BookingDialogFooter target={actionsTarget}><a href={`tel:${PHONE_NUMBER}`} className="booking-phone btn-clay-secondary min-h-11"><Phone aria-hidden="true" size={18} />{PHONE_DISPLAY}</a></BookingDialogFooter></div>}
            </div>
          </div>
          <div ref={setActionsTarget} className="booking-dialog-actions" />
        </div>
        <div role="status" aria-live="polite" aria-atomic="true" className="booking-live-region sr-only">{liveMessage}</div>
      </section>
    </div>
  )
}
