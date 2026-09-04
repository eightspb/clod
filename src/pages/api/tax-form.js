export const prerender = false

import nodemailer from 'nodemailer'
import { validateOrigin } from '../../lib/auth.js'
import { checkRateLimit } from '../../lib/rate-limit.js'
import { getClientIp } from '../../lib/client-ip.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const CLINIC_EMAIL_DOMAIN = '@odintsovclinic.ru'
const UNAVAILABLE_MESSAGE = 'Форма временно недоступна. Позвоните +7 (812) 748-22-10 или напишите в Telegram'
const RATE_LIMIT_OPTS = { namespace: 'tax-form', maxRequests: 5, windowMs: 15 * 60 * 1000 }

function jsonResponse(payload, status, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
  })
}

function errorResponse(status, code, message, details, headers) {
  const payload = {
    success: false,
    error: {
      code,
      message,
    },
  }

  if (details?.length) {
    payload.error.details = details
  }

  return jsonResponse(payload, status, headers)
}

function getEnvValue(name) {
  return import.meta.env[name] || process.env[name] || ''
}


/**
 * Tax deduction requests carry INN and medical-service facts, so every recipient
 * must be a clinic mailbox; a personal address anywhere in the list is a config error.
 */
function getRecipients() {
  const recipients = getEnvValue('TAX_FORM_TO_EMAIL').split(',').map((value) => value.trim()).filter(Boolean)
  if (recipients.length === 0) throw new Error('TAX_FORM_TO_EMAIL is not configured')
  const outside = recipients.filter((address) => !address.toLowerCase().endsWith(CLINIC_EMAIL_DOMAIN))
  if (outside.length > 0) throw new Error(`TAX_FORM_TO_EMAIL contains ${outside.length} recipient(s) outside ${CLINIC_EMAIL_DOMAIN}`)
  return recipients.join(', ')
}

function getSmtpConfig() {
  const host = getEnvValue('SMTP_HOST').trim()
  const user = getEnvValue('SMTP_USER').trim()
  const pass = getEnvValue('SMTP_PASS')
  const rawPort = getEnvValue('SMTP_PORT').trim()
  const port = rawPort ? Number.parseInt(rawPort, 10) : 465
  const to = getRecipients()

  if (!host || !user || !pass || Number.isNaN(port)) {
    throw new Error('SMTP configuration is incomplete')
  }

  const secureSetting = getEnvValue('SMTP_SECURE').trim()
  const secure = secureSetting ? secureSetting !== 'false' : true
  const from = getEnvValue('FROM_EMAIL').trim() || `"Клиника Одинцова" <${user}>`

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    to,
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeMultilineText(value) {
  return normalizeText(value).replace(/\r\n/g, '\n')
}

function normalizeDigits(value) {
  return normalizeText(value).replace(/\D+/g, '')
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isValidPhone(value) {
  const digits = normalizeDigits(value)
  return digits.length >= 10 && digits.length <= 15
}

function isValidInn(value) {
  return /^\d{12}$/.test(normalizeDigits(value))
}

function isValidTaxYear(value) {
  if (!/^\d{4}$/.test(value)) {
    return false
  }

  const numericYear = Number.parseInt(value, 10)
  const currentYear = new Date().getFullYear()
  return numericYear >= 2000 && numericYear <= currentYear
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function toHtmlParagraph(value, fallback) {
  const normalized = normalizeMultilineText(value)
  if (!normalized) return fallback
  return escapeHtml(normalized).replaceAll('\n', '<br/>')
}

function sanitizeHeaderValue(value, fallback = '') {
  const normalized = normalizeText(value).replace(/[\r\n]+/g, ' ')
  return normalized || fallback
}

function validateSubmission(fields) {
  const errors = []

  if (!fields.patientFullName) {
    errors.push({ field: 'patientFullName', message: 'Укажите ФИО пациента' })
  }

  if (!fields.patientBirthDate) {
    errors.push({ field: 'patientBirthDate', message: 'Укажите дату рождения пациента' })
  }

  if (!fields.taxpayerFullName) {
    errors.push({ field: 'taxpayerFullName', message: 'Укажите ФИО налогоплательщика' })
  }

  if (!fields.taxpayerBirthDate) {
    errors.push({
      field: 'taxpayerBirthDate',
      message: 'Укажите дату рождения налогоплательщика',
    })
  }

  if (!fields.taxpayerInn) {
    errors.push({ field: 'taxpayerInn', message: 'Укажите ИНН налогоплательщика' })
  } else if (!isValidInn(fields.taxpayerInn)) {
    errors.push({ field: 'taxpayerInn', message: 'Укажите корректный ИНН' })
  }

  if (!fields.taxYear) {
    errors.push({ field: 'taxYear', message: 'Укажите год, за который нужна справка' })
  } else if (!isValidTaxYear(fields.taxYear)) {
    errors.push({ field: 'taxYear', message: 'Укажите корректный год' })
  }

  if (!fields.email) {
    errors.push({ field: 'email', message: 'Укажите email' })
  } else if (!isValidEmail(fields.email)) {
    errors.push({ field: 'email', message: 'Укажите корректный email' })
  }

  if (!fields.phone) {
    errors.push({ field: 'phone', message: 'Заполните телефон' })
  } else if (!isValidPhone(fields.phone)) {
    errors.push({ field: 'phone', message: 'Укажите корректный номер телефона' })
  }

  return errors
}

function createTransporter(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })
}

export async function POST({ request }) {
  if (!validateOrigin(request)) {
    return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Недопустимый источник запроса')
  }

  const ip = getClientIp(request)
  const { allowed, retryAfterSec } = checkRateLimit(ip, RATE_LIMIT_OPTS)

  if (!allowed) {
    return errorResponse(
      429,
      'RATE_LIMITED',
      'Слишком много заявок. Попробуйте позже',
      undefined,
      { 'Retry-After': String(retryAfterSec) }
    )
  }

  let config

  try {
    config = getSmtpConfig()
  } catch (error) {
    console.error('[tax-form] mail configuration rejected:', error.message)
    return errorResponse(503, 'CONFIG_ERROR', UNAVAILABLE_MESSAGE)
  }

  try {
    const formData = await request.formData()
    const fields = {
      patientFullName: normalizeText(formData.get('patientFullName')?.toString()),
      patientBirthDate: normalizeText(formData.get('patientBirthDate')?.toString()),
      taxpayerFullName: normalizeText(formData.get('taxpayerFullName')?.toString()),
      taxpayerBirthDate: normalizeText(formData.get('taxpayerBirthDate')?.toString()),
      taxpayerInn: normalizeText(formData.get('taxpayerInn')?.toString()),
      taxYear: normalizeText(formData.get('taxYear')?.toString()),
      email: normalizeText(formData.get('email')?.toString()),
      phone: normalizeText(formData.get('phone')?.toString()),
      comment: normalizeMultilineText(formData.get('comment')?.toString()),
    }

    const validationErrors = validateSubmission(fields)

    if (validationErrors.length) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'Проверьте форму и попробуйте снова',
        validationErrors
      )
    }

    const transporter = createTransporter(config)
    const patientName = sanitizeHeaderValue(fields.patientFullName, 'Пациент')
    const taxpayerName = sanitizeHeaderValue(fields.taxpayerFullName, 'Налогоплательщик')
    const patientCommentDisplay = toHtmlParagraph(fields.comment, 'Нет комментария')

    await transporter.sendMail({
      from: config.from,
      to: config.to,
      replyTo: fields.email || undefined,
      subject: `Налоговая справка: ${patientName}`,
      html: `
        <h2>Новая заявка на справку для налогового вычета</h2>
        <p><strong>ФИО пациента:</strong> ${escapeHtml(patientName)}</p>
        <p><strong>Дата рождения пациента:</strong> ${escapeHtml(fields.patientBirthDate)}</p>
        <p><strong>ФИО налогоплательщика:</strong> ${escapeHtml(taxpayerName)}</p>
        <p><strong>Дата рождения налогоплательщика:</strong> ${escapeHtml(fields.taxpayerBirthDate)}</p>
        <p><strong>ИНН налогоплательщика:</strong> ${escapeHtml(normalizeDigits(fields.taxpayerInn))}</p>
        <p><strong>Год справки:</strong> ${escapeHtml(fields.taxYear)}</p>
        <p><strong>Email:</strong> ${escapeHtml(fields.email)}</p>
        <p><strong>Телефон:</strong> ${escapeHtml(fields.phone)}</p>
        <p><strong>Комментарий:</strong><br/>${patientCommentDisplay}</p>
      `,
    })

    return jsonResponse({ success: true }, 200)
  } catch (error) {
    console.error('[tax-form] submit failed', error)
    return errorResponse(502, 'EMAIL_SEND_FAILED', 'Не удалось отправить заявку. Попробуйте позже')
  }
}
