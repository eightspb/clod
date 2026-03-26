export const prerender = false

import nodemailer from 'nodemailer'
import { validateOrigin } from '../../lib/auth.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const MAX_FILES = 5
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_FILE_SIZE_BYTES = 25 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png'])
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const submissionsByIp = new Map()

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

function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = submissionsByIp.get(ip)

  if (!entry || now > entry.resetAt) {
    submissionsByIp.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.count += 1
  return { allowed: true }
}

function getSmtpConfig() {
  const host = getEnvValue('SMTP_HOST').trim()
  const user = getEnvValue('SMTP_USER').trim()
  const pass = getEnvValue('SMTP_PASS')
  const to = getEnvValue('TO_EMAIL').trim()
  const rawPort = getEnvValue('SMTP_PORT').trim()
  const port = rawPort ? Number.parseInt(rawPort, 10) : 465

  if (!host || !user || !pass || !to || Number.isNaN(port)) {
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

function getExtension(filename) {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? parts.at(-1) : ''
}

function sanitizeFileName(filename, fallbackIndex) {
  const cleaned = sanitizeHeaderValue(filename, `attachment-${fallbackIndex}`)
    .replace(/[\\/]+/g, '-')
    .replace(/[^\w.\-()\s\u0400-\u04FF]+/g, '-')
    .trim()

  return cleaned || `attachment-${fallbackIndex}`
}

function isAllowedFile(file) {
  const extension = getExtension(file.name || '')
  const mimeType = normalizeText(file.type).toLowerCase()

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return false
  }

  if (!mimeType) {
    return true
  }

  return ALLOWED_MIME_TYPES.has(mimeType)
}

function validateSubmission(fields, files) {
  const errors = []

  if (!fields.firstName) errors.push({ field: 'firstName', message: 'Заполните имя.' })
  if (!fields.lastName) errors.push({ field: 'lastName', message: 'Заполните фамилию.' })
  if (!fields.birthDate) errors.push({ field: 'birthDate', message: 'Укажите дату рождения.' })
  if (!fields.phone) errors.push({ field: 'phone', message: 'Заполните телефон.' })

  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.push({ field: 'email', message: 'Укажите корректный email.' })
  }

  if (!files.length) {
    errors.push({ field: 'files', message: 'Прикрепите хотя бы один файл.' })
    return errors
  }

  if (files.length > MAX_FILES) {
    errors.push({ field: 'files', message: `Можно прикрепить не более ${MAX_FILES} файлов.` })
  }

  let totalSize = 0

  for (const file of files) {
    if (!(file instanceof File)) {
      errors.push({ field: 'files', message: 'Некорректный формат загрузки файлов.' })
      continue
    }

    totalSize += file.size

    if (file.size <= 0) {
      errors.push({ field: 'files', message: 'Пустые файлы загружать нельзя.' })
      continue
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push({ field: 'files', message: 'Размер одного файла не должен превышать 10 МБ.' })
    }

    if (!isAllowedFile(file)) {
      errors.push({ field: 'files', message: 'Поддерживаются только PDF, JPG, JPEG и PNG.' })
    }
  }

  if (totalSize > MAX_TOTAL_FILE_SIZE_BYTES) {
    errors.push({ field: 'files', message: 'Суммарный размер файлов не должен превышать 25 МБ.' })
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

async function buildAttachments(files) {
  const attachments = []

  for (const [index, file] of files.entries()) {
    const buffer = Buffer.from(await file.arrayBuffer())
    attachments.push({
      filename: sanitizeFileName(file.name, index + 1),
      content: buffer,
      contentType: file.type,
    })
  }

  return attachments
}

export async function POST({ request }) {
  if (!validateOrigin(request)) {
    return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Недопустимый источник запроса.')
  }

  const ip = getClientIp(request)
  const { allowed, retryAfterSec } = checkRateLimit(ip)

  if (!allowed) {
    return errorResponse(
      429,
      'RATE_LIMITED',
      'Слишком много заявок. Попробуйте позже.',
      undefined,
      { 'Retry-After': String(retryAfterSec) }
    )
  }

  let config

  try {
    config = getSmtpConfig()
  } catch (error) {
    console.error('[second-opinion] missing SMTP configuration', error)
    return errorResponse(500, 'CONFIG_ERROR', 'Сервис временно недоступен. Попробуйте позже.')
  }

  try {
    const formData = await request.formData()
    const fields = {
      firstName: normalizeText(formData.get('firstName')?.toString()),
      lastName: normalizeText(formData.get('lastName')?.toString()),
      middleName: normalizeText(formData.get('middleName')?.toString()),
      birthDate: normalizeText(formData.get('birthDate')?.toString()),
      phone: normalizeText(formData.get('phone')?.toString()),
      email: normalizeText(formData.get('email')?.toString()),
      comment: normalizeMultilineText(formData.get('comment')?.toString()),
    }
    const files = formData.getAll('files')
    const validationErrors = validateSubmission(fields, files)

    if (validationErrors.length) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'Проверьте форму и попробуйте снова.',
        validationErrors
      )
    }

    const transporter = createTransporter(config)
    const attachments = await buildAttachments(files)
    const patientName = sanitizeHeaderValue(
      `${fields.lastName} ${fields.firstName} ${fields.middleName}`.trim(),
      'Пациент'
    )
    const patientEmailDisplay = fields.email ? escapeHtml(fields.email) : 'Не указан'
    const patientCommentDisplay = toHtmlParagraph(fields.comment, 'Нет комментария')

    await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject: `Второе мнение: ${patientName}`,
      html: `
        <h2>Новая заявка на Второе мнение</h2>
        <p><strong>Пациент:</strong> ${escapeHtml(patientName)}</p>
        <p><strong>Дата рождения:</strong> ${escapeHtml(fields.birthDate)}</p>
        <p><strong>Телефон:</strong> ${escapeHtml(fields.phone)}</p>
        <p><strong>Email:</strong> ${patientEmailDisplay}</p>
        <p><strong>Комментарий:</strong><br/> ${patientCommentDisplay}</p>
        <p><em>Файлов прикреплено: ${attachments.length}</em></p>
      `,
      attachments,
    })

    let autoReplySent = false

    if (fields.email) {
      try {
        await transporter.sendMail({
          from: config.from,
          to: fields.email,
          subject: 'Ваша заявка получена | Клиника Одинцова',
          html: `
            <h2>Здравствуйте, ${escapeHtml(fields.firstName)}!</h2>
            <p>Ваша заявка на получение второго мнения успешно получена.</p>
            <p>Мы изучим ваши данные и снимки, после чего специалист свяжется с вами по номеру ${escapeHtml(fields.phone)} в рабочие часы клиники.</p>
            <br/>
            <p>С уважением,<br/>Команда Клиники Одинцова<br/><a href="https://odintsovclinic.ru">odintsovclinic.ru</a></p>
          `,
        })
        autoReplySent = true
      } catch (error) {
        console.error('[second-opinion] auto-reply failed', error)
      }
    }

    return jsonResponse(
      {
        success: true,
        data: {
          autoReplySent,
        },
      },
      200
    )
  } catch (error) {
    console.error('[second-opinion] submit failed', error)
    return errorResponse(502, 'EMAIL_SEND_FAILED', 'Не удалось отправить заявку. Попробуйте позже.')
  }
}
