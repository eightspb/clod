import { describe, it, expect } from 'vitest'
import { webpDimensions } from './webp-dimensions.js'

function riff(chunk, payload) {
  const header = Buffer.from('RIFF\0\0\0\0WEBP', 'ascii')
  return Buffer.concat([header, Buffer.from(chunk, 'ascii'), Buffer.alloc(4), payload, Buffer.alloc(20)])
}

describe('webpDimensions', () => {
  it('reads an extended VP8X canvas of 600×800', () => {
    const payload = Buffer.alloc(10)
    payload.writeUIntLE(599, 4, 3)
    payload.writeUIntLE(799, 7, 3)
    expect(webpDimensions(riff('VP8X', payload))).toEqual({ width: 600, height: 800 })
  })

  it('reads a lossless VP8L canvas of 321×123', () => {
    const payload = Buffer.alloc(5)
    payload[0] = 0x2f
    payload.writeUInt32LE(320 | (122 << 14), 1)
    expect(webpDimensions(riff('VP8L', payload))).toEqual({ width: 321, height: 123 })
  })

  it('reads a lossy VP8 frame of 1080×1080', () => {
    const payload = Buffer.alloc(10)
    payload.writeUInt16LE(1080, 6)
    payload.writeUInt16LE(1080, 8)
    expect(webpDimensions(riff('VP8 ', payload))).toEqual({ width: 1080, height: 1080 })
  })

  it('rejects a PNG buffer', () => {
    expect(() => webpDimensions(Buffer.from('\x89PNG\r\n\x1a\n' + '0'.repeat(40), 'latin1'))).toThrow()
  })
})
