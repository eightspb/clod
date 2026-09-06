#!/usr/bin/env node
import { createGracefulShutdown } from '../src/lib/graceful-shutdown.js'
import { db } from '../src/lib/database.js'
import { runAnalyticsRetention } from '../src/lib/analytics-retention.js'
import { runCallRetention } from '../src/lib/mango-call-retention.js'
import { sweepStaleBookings } from '../src/lib/appointment-sweeper.js'
import { scheduleRetention } from '../src/lib/retention-schedule.js'

const DRAIN_TIMEOUT_MS = 90_000

process.env.ASTRO_NODE_AUTOSTART = 'disabled'
const { startServer } = await import('../dist/server/entry.mjs')
const { server } = startServer()
const drain = createGracefulShutdown(server.server, { timeoutMs: DRAIN_TIMEOUT_MS })
scheduleRetention({ jobs: [() => runAnalyticsRetention({ client: db.$client }), () => runCallRetention({ client: db.$client })] })
scheduleRetention({ jobs: [() => sweepStaleBookings({ client: db.$client })], intervalMs: 5 * 60_000, log: (stage) => console.error('[sweep-appointments]', stage) })
process.on('SIGTERM', drain)
process.on('SIGINT', drain)
