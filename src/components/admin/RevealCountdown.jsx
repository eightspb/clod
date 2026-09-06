import { useEffect, useState } from 'react'

const TICK_MS = 1_000

function secondsLeft(expiresAt) {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1_000))
}

/**
 * Shows how long revealed personal data stays on screen and lets the administrator extend the
 * window once more instead of losing it mid-call.
 */
export function RevealCountdown({ expiresAt, onExtend }) {
  const [left, setLeft] = useState(() => secondsLeft(expiresAt))
  useEffect(() => {
    setLeft(secondsLeft(expiresAt))
    const timer = setInterval(() => setLeft(secondsLeft(expiresAt)), TICK_MS)
    return () => clearInterval(timer)
  }, [expiresAt])
  return (
    <span role="status" className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800">
      Скроется через {left} с
      {left <= 10 && <button type="button" className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 hover:border-amber-500" onClick={onExtend}>Продлить</button>}
    </span>
  )
}
