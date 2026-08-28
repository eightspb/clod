import { DOCTORS } from '../src/lib/doctors-data.js'
import { createMedflexClient } from '../src/lib/medflex-client.js'
import { discoverMedflexDoctors } from '../src/lib/medflex-doctors.js'

async function run() {
  const client = createMedflexClient()
  const discoveryClient = Object.freeze({ listDoctors: client.listDoctors, listLpus: client.listLpus })
  const report = await discoverMedflexDoctors({ client: discoveryClient, websiteDoctors: DOCTORS.map(({ slug, name }) => ({ slug, name })) })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

try {
  await run()
} catch {
  process.stderr.write(`${JSON.stringify({ error: 'MEDFLEX_DISCOVERY_FAILED' })}\n`)
  process.exitCode = 1
}
