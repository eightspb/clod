/**
 * Reads pixel dimensions from a WebP buffer without decoding the bitmap.
 * Supports the three container layouts cwebp emits: VP8X, VP8L and VP8.
 */
export function webpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Buffer is not a WebP container')
  const chunk = buffer.toString('ascii', 12, 16)
  if (chunk === 'VP8X') return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) }
  if (chunk === 'VP8L') return { width: 1 + (buffer.readUInt32LE(21) & 0x3fff), height: 1 + ((buffer.readUInt32LE(21) >>> 14) & 0x3fff) }
  if (chunk === 'VP8 ') return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff }
  throw new Error(`Unsupported WebP chunk ${chunk}`)
}
