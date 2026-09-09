#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createSqliteClient } from '../src/lib/database.js'
import { purgeSourceRows, vacuumDatabase } from '../src/lib/clinic-import-purge.js'

const { values } = parseArgs({ options: { database: { type: 'string' }, batch: { type: 'string' }, apply: { type: 'boolean', default: false }, vacuum: { type: 'boolean', default: false } }, strict: true })
if (typeof values.database !== 'string' || !isAbsolute(values.database)) throw new Error('--database must be an absolute path to the SQLite file')
if (typeof values.batch !== 'string') throw new Error('--batch must be the completed ImportBatch id')
const client = createSqliteClient({ url: pathToFileURL(values.database).href })
try {
  const result = await purgeSourceRows({ client, batchId: values.batch, apply: values.apply })
  console.log(JSON.stringify(result))
  if (values.apply && values.vacuum) console.log(JSON.stringify(await vacuumDatabase({ client })))
} finally {
  client.close()
}
