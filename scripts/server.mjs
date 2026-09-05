#!/usr/bin/env node
import { createGracefulShutdown } from '../src/lib/graceful-shutdown.js'

const DRAIN_TIMEOUT_MS = 90_000

process.env.ASTRO_NODE_AUTOSTART = 'disabled'
const { startServer } = await import('../dist/server/entry.mjs')
const { server } = startServer()
const drain = createGracefulShutdown(server.server, { timeoutMs: DRAIN_TIMEOUT_MS })
process.on('SIGTERM', drain)
process.on('SIGINT', drain)
