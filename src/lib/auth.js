const COOKIE_NAME = 'admin_session'
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function getSecret() {
  const secret =
    import.meta.env.TOKEN_SECRET ||
    import.meta.env.ADMIN_PASSWORD ||
    process.env.TOKEN_SECRET ||
    process.env.ADMIN_PASSWORD ||
    ''
  if (!secret) throw new Error('TOKEN_SECRET or ADMIN_PASSWORD environment variable is required')
  return secret
}

async function hmacSign(data, secret) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

async function hmacVerify(data, signature, secret) {
  const expected = await hmacSign(data, secret)
  return expected === signature
}

export async function createToken() {
  const secret = getSecret()
  const timestamp = Date.now().toString()
  const sig = await hmacSign(timestamp, secret)
  return `${timestamp}.${sig}`
}

export async function verifyToken(token) {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [timestamp, sig] = parts
  const ts = parseInt(timestamp, 10)
  if (isNaN(ts)) return false
  if (Date.now() - ts > TOKEN_TTL_MS) return false
  const secret = getSecret()
  return hmacVerify(timestamp, sig, secret)
}

export function getTokenFromCookie(request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k, v.join('=')]
    })
  )
  return cookies[COOKIE_NAME] || null
}

export async function isAuthenticated(request) {
  const token = getTokenFromCookie(request)
  return verifyToken(token)
}

export function buildSetCookie(token) {
  const isProduction = (import.meta.env.MODE || process.env.NODE_ENV) === 'production'
  const secureFlag = isProduction ? '; Secure' : ''
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/${secureFlag}; Max-Age=${TOKEN_TTL_MS / 1000}`
}

export function buildClearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`
}

const ALLOWED_HOSTS = [
  'odintsovclinic.ru',
  'www.odintsovclinic.ru',
  'localhost:4321',
  'localhost:3000',
  '127.0.0.1:4321',
]

export function validateOrigin(request) {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  const source = origin || referer
  if (!source) return false

  try {
    const url = new URL(source)
    return ALLOWED_HOSTS.includes(url.host)
  } catch {
    return false
  }
}
