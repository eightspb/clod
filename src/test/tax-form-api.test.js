import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const { sendMailMock, createTransportMock } = vi.hoisted(() => {
  return {
    sendMailMock: vi.fn(),
    createTransportMock: vi.fn(() => ({ sendMail: sendMailMock })),
  }
})

vi.mock('nodemailer', () => ({
  default: {
    createTransport: createTransportMock,
  },
}))

const SMTP_ENV_KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_SECURE',
  'FROM_EMAIL',
]

function setSmtpEnv(overrides = {}) {
  for (const key of SMTP_ENV_KEYS) {
    delete process.env[key]
  }

  Object.assign(process.env, overrides)
}

async function loadHandler() {
  vi.resetModules()
  return import('../pages/api/tax-form.js')
}

async function makeRequest({
  origin = 'https://odintsovclinic.ru',
  ip = '127.0.0.1',
  fields = {},
} = {}) {
  const formData = new FormData()

  for (const [key, value] of Object.entries({
    patientFullName: 'Иванова Мария Сергеевна',
    patientBirthDate: '1990-01-01',
    taxpayerFullName: 'Иванов Сергей Петрович',
    taxpayerBirthDate: '1985-05-10',
    taxpayerInn: '123456789012',
    taxYear: String(new Date().getFullYear()),
    email: 'patient@example.com',
    phone: '+7 (999) 111-22-33',
    comment: 'Прошу подготовить справку',
    ...fields,
  })) {
    formData.set(key, value)
  }

  return {
    method: 'POST',
    headers: new Headers({
      origin,
      'x-forwarded-for': ip,
    }),
    formData: async () => formData,
  }
}

async function parseJson(response) {
  return response.json()
}

describe('POST /api/tax-form', () => {
  beforeEach(() => {
    sendMailMock.mockReset()
    createTransportMock.mockClear()
    setSmtpEnv({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '465',
      SMTP_USER: 'mailer@example.com',
      SMTP_PASS: 'secret-pass',
    })
  })

  afterEach(() => {
    for (const key of SMTP_ENV_KEYS) {
      delete process.env[key]
    }
  })

  it('fails fast when smtp config is missing', async () => {
    setSmtpEnv()
    const { POST } = await loadHandler()

    const response = await POST({ request: await makeRequest() })
    const body = await parseJson(response)

    expect(response.status).toBe(500)
    expect(body).toEqual({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: 'Сервис временно недоступен. Попробуйте позже.',
      },
    })
    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it('rejects requests from unknown origins', async () => {
    const { POST } = await loadHandler()

    const response = await POST({
      request: await makeRequest({ origin: 'https://evil.example.com' }),
    })
    const body = await parseJson(response)

    expect(response.status).toBe(403)
    expect(body).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN_ORIGIN',
        message: 'Недопустимый источник запроса.',
      },
    })
  })

  it('rejects missing required fields with machine-readable details', async () => {
    const { POST } = await loadHandler()

    const response = await POST({
      request: await makeRequest({
        fields: {
          patientFullName: '',
          taxpayerInn: '123',
          phone: '',
        },
      }),
    })
    const body = await parseJson(response)

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        { field: 'patientFullName', message: 'Укажите ФИО пациента.' },
        { field: 'taxpayerInn', message: 'Укажите корректный ИНН.' },
        { field: 'phone', message: 'Заполните телефон.' },
      ])
    )
    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it('rate limits repeated submissions from the same ip', async () => {
    sendMailMock.mockResolvedValue({})
    const { POST } = await loadHandler()

    for (let index = 0; index < 5; index += 1) {
      const okResponse = await POST({ request: await makeRequest({ ip: '10.0.0.1' }) })
      expect(okResponse.status).toBe(200)
    }

    const limitedResponse = await POST({ request: await makeRequest({ ip: '10.0.0.1' }) })
    const body = await parseJson(limitedResponse)

    expect(limitedResponse.status).toBe(429)
    expect(body).toEqual({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Слишком много заявок. Попробуйте позже.',
      },
    })
    expect(limitedResponse.headers.get('Retry-After')).toBeTruthy()
  })

  it('sends sanitized application details to both clinic inboxes', async () => {
    sendMailMock.mockResolvedValue({})
    const { POST } = await loadHandler()

    const response = await POST({
      request: await makeRequest({
        fields: {
          patientFullName: 'Иванова <Мария>',
          taxpayerFullName: 'Иванов Сергей<script>',
          comment: 'Строка 1\n<script>alert(1)</script>',
        },
      }),
    })
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(body).toEqual({
      success: true,
    })
    expect(sendMailMock).toHaveBeenCalledTimes(1)
    expect(sendMailMock.mock.calls[0][0].to).toBe(
      'info@odintsovclinic.ru, vbazarbaev@gmail.com'
    )
    expect(sendMailMock.mock.calls[0][0].html).toContain('Иванова &lt;Мария&gt;')
    expect(sendMailMock.mock.calls[0][0].html).toContain('Иванов Сергей&lt;script&gt;')
    expect(sendMailMock.mock.calls[0][0].html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(sendMailMock.mock.calls[0][0].html).toContain('Строка 1<br/>')
  })
})
