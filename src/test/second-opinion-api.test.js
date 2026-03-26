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
  'TO_EMAIL',
]

function setSmtpEnv(overrides = {}) {
  for (const key of SMTP_ENV_KEYS) {
    delete process.env[key]
  }

  Object.assign(process.env, overrides)
}

async function loadHandler() {
  vi.resetModules()
  return import('../pages/api/second-opinion.js')
}

function buildFile(name, type, size = 1024) {
  const file = new File([new Uint8Array(size)], name, { type })

  if (typeof file.arrayBuffer !== 'function') {
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new Uint8Array(size).buffer,
      configurable: true,
      writable: true,
    })
  }

  return file
}

async function makeRequest({
  origin = 'https://odintsovclinic.ru',
  ip = '127.0.0.1',
  fields = {},
  files = [buildFile('scan.pdf', 'application/pdf')],
} = {}) {
  const formData = new FormData()

  for (const [key, value] of Object.entries({
    firstName: 'Мария',
    lastName: 'Иванова',
    middleName: '',
    birthDate: '1990-01-01',
    phone: '+7 (999) 111-22-33',
    email: 'patient@example.com',
    comment: 'Комментарий',
    ...fields,
  })) {
    formData.set(key, value)
  }

  for (const file of files) {
    formData.append('files', file)
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

describe('POST /api/second-opinion', () => {
  beforeEach(() => {
    sendMailMock.mockReset()
    createTransportMock.mockClear()
    setSmtpEnv({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '465',
      SMTP_USER: 'mailer@example.com',
      SMTP_PASS: 'secret-pass',
      TO_EMAIL: 'clinic@example.com',
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

  it('rejects missing files and required fields with machine-readable details', async () => {
    const { POST } = await loadHandler()

    const response = await POST({
      request: await makeRequest({
        fields: {
          firstName: '',
          phone: '',
        },
        files: [],
      }),
    })
    const body = await parseJson(response)

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        { field: 'firstName', message: 'Заполните имя.' },
        { field: 'phone', message: 'Заполните телефон.' },
        { field: 'files', message: 'Прикрепите хотя бы один файл.' },
      ])
    )
    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it('rejects unsupported file types before reading attachments', async () => {
    const { POST } = await loadHandler()
    const invalidFile = buildFile(
      'report.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    const arrayBufferSpy = vi.spyOn(invalidFile, 'arrayBuffer')

    const response = await POST({
      request: await makeRequest({
        files: [invalidFile],
      }),
    })
    const body = await parseJson(response)

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toContainEqual({
      field: 'files',
      message: 'Поддерживаются только PDF, JPG, JPEG и PNG.',
    })
    expect(arrayBufferSpy).not.toHaveBeenCalled()
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

  it('escapes html in clinic email and keeps auto-reply best-effort', async () => {
    sendMailMock
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Mailbox unavailable'))

    const { POST } = await loadHandler()

    const response = await POST({
      request: await makeRequest({
        fields: {
          firstName: '<Мария>',
          lastName: 'Иванова<script>',
          comment: 'Строка 1\n<script>alert(1)</script>',
        },
      }),
    })
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(body).toEqual({
      success: true,
      data: {
        autoReplySent: false,
      },
    })
    expect(sendMailMock).toHaveBeenCalledTimes(2)
    expect(sendMailMock.mock.calls[0][0].html).toContain('&lt;Мария&gt;')
    expect(sendMailMock.mock.calls[0][0].html).toContain('Иванова&lt;script&gt;')
    expect(sendMailMock.mock.calls[0][0].html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(sendMailMock.mock.calls[0][0].html).toContain('Строка 1<br/>')
  })
})
