const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/
const IPV4_TRUNCATED_PATTERN = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.0\/24$/
const IPV6_TRUNCATED_PATTERN = /^[0-9a-f:]+::\/48$/i
const BROWSERS = Object.freeze([['Edg/', 'Edge'], ['OPR/', 'Opera'], ['YaBrowser', 'Яндекс Браузер'], ['Firefox/', 'Firefox'], ['Chrome/', 'Chrome'], ['Safari/', 'Safari']])
const PLATFORMS = Object.freeze([['iPhone', 'iOS'], ['iPad', 'iOS'], ['Android', 'Android'], ['Windows', 'Windows'], ['Mac OS X', 'macOS'], ['Linux', 'Linux']])

function expandIpv6(value) {
  const halves = value.split('::')
  if (halves.length > 2) return undefined
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const groups = halves.length === 2 ? [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail] : head
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) return undefined
  return groups.map((group) => group.toLowerCase().replace(/^0+(?=.)/, ''))
}

/**
 * Reduces a client address to its network so analytics never stores a value that identifies a
 * single household: /24 for IPv4 and /48 for IPv6 (the prefix ISPs delegate to one customer).
 */
export function truncateIp(value) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (IPV4_TRUNCATED_PATTERN.test(trimmed) || IPV6_TRUNCATED_PATTERN.test(trimmed)) return trimmed
  const ipv4 = IPV4_PATTERN.exec(trimmed)
  if (ipv4) return ipv4.slice(1, 4).every((octet) => Number(octet) <= 255) ? `${ipv4[1]}.${ipv4[2]}.${ipv4[3]}.0/24` : undefined
  const groups = expandIpv6(trimmed)
  return groups ? `${groups.slice(0, 3).join(':')}::/48` : undefined
}

/**
 * Keeps only the origin of a referrer: the full URL of a search results page carries the
 * patient's query, which is medical data by itself.
 */
export function referrerOrigin(value) {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : undefined
  } catch {
    return undefined
  }
}

/**
 * Serialises event details for storage without ever producing a cut JSON string.
 */
export function safeDetails(value, limit) {
  try {
    const json = JSON.stringify(value)
    if (typeof json !== 'string') return undefined
    return json.length > limit ? JSON.stringify({ truncated: true }) : json
  } catch {
    return undefined
  }
}

/**
 * Coarse browser and platform families for the admin session list; the raw User-Agent is a
 * fingerprinting vector and is never sent to the browser.
 */
export function userAgentFamily(value) {
  if (typeof value !== 'string' || value.trim() === '') return 'Другой'
  const browser = BROWSERS.find(([marker]) => value.includes(marker))?.[1]
  const platform = PLATFORMS.find(([marker]) => value.includes(marker))?.[1]
  if (!browser && !platform) return 'Другой'
  return [browser, platform].filter(Boolean).join(' · ')
}
