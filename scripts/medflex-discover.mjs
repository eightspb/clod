import { discoverMedflexContract } from '../src/lib/medflex-contract-discovery.js'

const PAID_DETAIL_FLAG = '--include-paid-doctor-detail'

function probeDate(now) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function includePaidDoctorDetail(argumentsList) {
  if (!Array.isArray(argumentsList) || argumentsList.length > 1 || argumentsList.some((argument) => argument !== PAID_DETAIL_FLAG)) throw new TypeError('Medflex discovery arguments are invalid')
  return argumentsList.includes(PAID_DETAIL_FLAG)
}

async function run() {
  const capturedAt = new Date()
  const date = probeDate(capturedAt)
  const report = await discoverMedflexContract({ fetchImpl: globalThis.fetch, token: process.env.MEDFLEX_CLINIC_TOKEN, date, includePaidDoctorDetail: includePaidDoctorDetail(process.argv.slice(2)) })
  process.stdout.write(`${JSON.stringify({ capturedAt: capturedAt.toISOString(), probeDate: date, ...report }, null, 2)}\n`)
}

try {
  await run()
} catch {
  process.stderr.write(`${JSON.stringify({ error: 'MEDFLEX_DISCOVERY_FAILED' })}\n`)
  process.exitCode = 1
}
