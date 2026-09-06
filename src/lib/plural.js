/**
 * Picks the Russian plural form for a count.
 *
 * @param {number} count Non-negative integer.
 * @param {readonly [string, string, string]} forms Singular, few and many forms.
 * @returns {string} Form matching the count.
 */
export function plural(count, forms) {
  if (!Number.isInteger(count) || count < 0) throw new Error(`plural expects a non-negative integer, received ${count}`)
  const tail = count % 100
  if (tail >= 11 && tail <= 14) return forms[2]
  const last = count % 10
  if (last === 1) return forms[0]
  if (last >= 2 && last <= 4) return forms[1]
  return forms[2]
}
