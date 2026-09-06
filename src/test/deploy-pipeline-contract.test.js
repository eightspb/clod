import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const PROJECT_ROOT = resolve(import.meta.dirname, '../..')

function read(relativePath) {
  return readFile(join(PROJECT_ROOT, relativePath), 'utf8')
}

describe('nginx templates re-resolve the app container on every request', () => {
  for (const template of ['nginx.https.conf', 'nginx.http.conf']) {
    it(`${template} declares the Docker DNS resolver`, async () => {
      expect(await read(template)).toContain('resolver 127.0.0.11')
    })

    it(`${template} proxies through a variable so the upstream IP is not frozen at start`, async () => {
      expect(await read(template)).not.toMatch(/proxy_pass\s+http:\/\/app:4321/)
    })

    it(`${template} keeps the original URI when proxying through the variable`, async () => {
      const source = await read(template)
      const passes = source.match(/proxy_pass\s+http:\/\/\$app_upstream\S*/g) ?? []
      expect(passes.every((line) => line.endsWith('$app_upstream$request_uri;'))).toBe(true)
    })
  }
})

describe('container entrypoint', () => {
  it('starts the server through the graceful shutdown wrapper', async () => {
    expect(await read('docker-entrypoint.sh')).toContain('exec node /app/scripts/server.mjs')
  })

  it('offers an explicit escape hatch that skips schema initialisation', async () => {
    expect(await read('docker-entrypoint.sh')).toMatch(/SKIP_DB_INIT[^\n]*=\s*"?true/)
  })
})

describe('docker-compose', () => {
  it('gives the app enough time to drain a booking request before SIGKILL', async () => {
    expect(await read('docker-compose.yml')).toMatch(/stop_grace_period:\s*95s/)
  })
})

describe('Dockerfile', () => {
  it('probes the readiness route instead of the static home page', async () => {
    expect(await read('Dockerfile')).toContain("fetch('http://localhost:4321/api/health')")
  })

  it('waits for schema initialisation before counting health failures', async () => {
    expect(await read('Dockerfile')).toMatch(/HEALTHCHECK[^\n]*--start-period=60s/)
  })
})

describe('deploy script', () => {
  it('backs up the database before touching the server', async () => {
    const source = await read('scripts/deploy.sh')
    const backupIndex = source.indexOf('scripts/backup.sh')
    const pullIndex = source.indexOf('&& git pull')
    expect(backupIndex > 0 && backupIndex < pullIndex).toBe(true)
  })

  it('lets the operator skip the backup only through a named variable', async () => {
    expect(await read('scripts/deploy.sh')).toContain('SKIP_BACKUP')
  })

  it('remembers the previous image tag for rollback', async () => {
    expect(await read('scripts/deploy.sh')).toContain('CLOD_PREVIOUS_IMAGE_TAG')
  })

  it('runs the smoke check after the nginx reload', async () => {
    const source = await read('scripts/deploy.sh')
    const reloadIndex = source.indexOf('reload_nginx_with_retry\n')
    const smokeIndex = source.indexOf('scripts/smoke.sh')
    expect(reloadIndex > 0 && smokeIndex > reloadIndex).toBe(true)
  })

  it('prunes images only after the smoke check passed', async () => {
    const source = await read('scripts/deploy.sh')
    const smokeIndex = source.indexOf('scripts/smoke.sh')
    const pruneIndex = source.indexOf('docker image')
    expect(smokeIndex > 0 && pruneIndex > smokeIndex).toBe(true)
  })

  it('no longer removes every image older than a day', async () => {
    expect(await read('scripts/deploy.sh')).not.toContain('prune -af')
  })
})

describe('smoke script', () => {
  it('checks the readiness route, two public pages and the admin guard', async () => {
    const source = await read('scripts/smoke.sh')
    expect(['/api/health', '/doctors', '/api/admin/stats'].every((path) => source.includes(path))).toBe(true)
  })

  it('expects the admin route to answer 401', async () => {
    expect(await read('scripts/smoke.sh')).toMatch(/\/api\/admin\/stats[^\n]*401/)
  })
})

describe('rollback script', () => {
  it('switches the running image to the previous tag without a build', async () => {
    const source = await read('scripts/rollback.sh')
    expect(source.includes('CLOD_PREVIOUS_IMAGE_TAG') && source.includes('--no-build')).toBe(true)
  })

  it('is exposed as a package script', async () => {
    const pkg = JSON.parse(await read('package.json'))
    expect(pkg.scripts.rollback).toBe('sh scripts/rollback.sh')
  })
})

describe('self-hosted monitor', () => {
  it('mounts the host status directory read-only into the app container', async () => {
    expect(await read('docker-compose.yml')).toContain('/var/lib/clod-monitor:/var/lib/clod-monitor:ro')
  })

  it('ships a systemd timer that runs the monitor every two minutes', async () => {
    expect(await read('deploy/systemd/clod-monitor.timer')).toMatch(/OnUnitActiveSec=2min/)
  })

  it('restarts the app only after repeated health failures with a cooldown', async () => {
    const source = await read('scripts/monitor.sh')
    expect(source.includes('HEALTH_FAILURES_BEFORE_RESTART') && source.includes('RESTART_COOLDOWN_SECONDS')).toBe(true)
  })

  it('keeps certbot under a restart policy', async () => {
    const source = await read('docker-compose.yml')
    const certbot = source.slice(source.indexOf('certbot:'))
    expect(certbot).toMatch(/restart:\s*unless-stopped/)
  })

  for (const template of ['nginx.https.conf', 'nginx.http.conf']) {
    it(`${template} writes MANGO callback attempts to a greppable log line`, async () => {
      const source = await read(template)
      expect(source.includes("log_format clod_mango '[mango]") && source.includes('access_log /dev/stdout clod_mango;')).toBe(true)
    })
  }
})

describe('retention jobs', () => {
  it('runs analytics and call retention from the entrypoint without blocking startup on failure', async () => {
    const source = await read('docker-entrypoint.sh')
    expect(source.includes('scripts/prune-analytics.mjs ||') && source.includes('scripts/prune-calls.mjs ||')).toBe(true)
  })

  it('schedules the same jobs daily inside the server process', async () => {
    expect(await read('scripts/server.mjs')).toContain('scheduleRetention({ jobs: [() => runAnalyticsRetention')
  })
})
