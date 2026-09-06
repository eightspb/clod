const DAY_MS = 24 * 60 * 60_000

/**
 * Runs the retention jobs once a day inside the server process; the container has no cron and
 * a failed run must never take the site down, so failures are logged with a stage code only.
 */
export function scheduleRetention({ jobs, intervalMs = DAY_MS, setTimer = setInterval, log = (stage) => console.error('[retention]', stage) }) {
  if (!Array.isArray(jobs) || jobs.some((job) => typeof job !== 'function')) throw new TypeError('Retention schedule requires job functions')
  const run = async () => {
    for (const job of jobs) {
      try {
        await job()
      } catch {
        log('JOB_FAILED')
      }
    }
  }
  const timer = setTimer(run, intervalMs)
  if (timer && typeof timer.unref === 'function') timer.unref()
  return Object.freeze({ run, timer })
}
