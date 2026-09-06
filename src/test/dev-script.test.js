import { chmod, mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { describe, expect, it } from 'vitest'

const DEV_SCRIPT = resolve('scripts/dev.sh')
const TEST_PORT = '49197'
const FAKE_EXECUTABLE = '#!/bin/sh\nprintf "%s\\n" "$(basename "$0")" "$@"\n'

async function createExecutable(directory, name) {
  const path = join(directory, name)
  await writeFile(path, FAKE_EXECUTABLE)
  await chmod(path, 0o700)
  return path
}

async function runDevScript(directory, binDirectory) {
  const child = spawn('/bin/sh', [DEV_SCRIPT], { cwd: directory, env: { ...process.env, PATH: `${binDirectory}:${process.env.PATH}`, PORT: TEST_PORT } })
  const stdout = []
  const stderr = []
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk) => stdout.push(chunk))
  child.stderr.on('data', (chunk) => stderr.push(chunk))
  const [status] = await once(child, 'close')
  return { status, stdout: stdout.join('').trim().split('\n'), stderr: stderr.join('') }
}

describe('development launcher', () => {
  it('stops any lock-holding Astro dev server and loads the local dotenv file before starting', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'clod-dev-script-'))
    const binDirectory = join(directory, 'bin')
    await mkdir(binDirectory)
    await Promise.all([createExecutable(binDirectory, 'bun'), createExecutable(binDirectory, 'bunx')])
    await writeFile(join(directory, '.env'), 'MEDFLEX_CLINIC_TOKEN=local-fixture-token\n')
    const result = await runDevScript(directory, binDirectory)
    expect(result).toEqual({ status: 0, stdout: ['bunx', 'astro', 'dev', 'stop', 'bun', '--env-file=.env', 'run', 'astro', 'dev', '--port', TEST_PORT], stderr: '' })
  })
})
