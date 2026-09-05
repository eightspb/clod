/**
 * Builds a drain handler for SIGTERM/SIGINT: stop accepting connections, let in-flight
 * requests (a paid booking POST can take up to 75 s behind nginx) finish, then exit 0;
 * exit 1 if the deadline passes first so Docker never has to SIGKILL a half-written request.
 */
export function createGracefulShutdown(server, { timeoutMs, exit = process.exit, setTimer = setTimeout }) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError(`Graceful shutdown timeout must be a positive number of milliseconds, got ${timeoutMs}`)
  let draining = false
  return () => {
    if (draining) return
    draining = true
    server.close(() => exit(0))
    setTimer(() => exit(1), timeoutMs).unref()
  }
}
