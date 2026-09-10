/**
 * Yandex Metrika counter for odintsovclinic.ru.
 * The tag loads only after the visitor grants analytics consent in the layout banner;
 * goals are plain JS events and never carry patient data. Webvisor stays off:
 * session replays of a medical site would record names and phone numbers.
 */
export const METRIKA_COUNTER_ID = 26618208
export const METRIKA_TAG_URL = 'https://mc.yandex.ru/metrika/tag.js'
const INIT_OPTIONS = Object.freeze({ clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false })

/**
 * Sends a named goal to the counter when it is loaded and does nothing otherwise.
 */
export function reachGoal(goal, scope = globalThis) {
  if (typeof scope.ym !== 'function') return
  scope.ym(METRIKA_COUNTER_ID, 'reachGoal', goal)
}

/**
 * Maps a contact link to its goal: phone_click for tel:, max_click for max.ru.
 */
export function contactGoal(element) {
  const href = element.getAttribute('href') || ''
  if (href.startsWith('tel:')) return 'phone_click'
  if (/^https?:\/\/max\.ru\//.test(href)) return 'max_click'
  return undefined
}

/**
 * Defines the ym queue, appends the tag script once and queues the init call.
 */
export function installMetrika(win) {
  if (typeof win.ym === 'function') return
  const queue = []
  const ym = (...args) => queue.push(args)
  ym.a = queue
  ym.l = Date.now()
  win.ym = ym
  const script = win.document.createElement('script')
  script.async = true
  script.src = METRIKA_TAG_URL
  win.document.head.appendChild(script)
  ym(METRIKA_COUNTER_ID, 'init', { ...INIT_OPTIONS })
}
