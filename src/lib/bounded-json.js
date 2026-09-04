const JSON_MEDIA_TYPE = /^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json(?:\s*;|$)/i

function declaredLength(request, limitBytes) {
  const value = request.headers.get('content-length')
  if (value === null) return Object.freeze({ valid: true, tooLarge: false })
  if (!/^(?:0|[1-9]\d*)$/.test(value)) return Object.freeze({ valid: false, tooLarge: false })
  const bytes = Number(value)
  if (!Number.isSafeInteger(bytes)) return Object.freeze({ valid: false, tooLarge: true })
  if (bytes > limitBytes) return Object.freeze({ valid: false, tooLarge: true })
  return Object.freeze({ valid: true, tooLarge: false })
}

async function cancel(reader) {
  try {
    await reader.cancel()
  } catch {
    return
  }
}

function release(reader) {
  try {
    reader.releaseLock()
  } catch {
    return
  }
}

async function streamedJson(request, limitBytes) {
  if (!request.body || typeof request.body.getReader !== 'function') return Object.freeze({ valid: false, tooLarge: false })
  let reader
  try {
    reader = request.body.getReader()
  } catch {
    return Object.freeze({ valid: false, tooLarge: false })
  }
  const chunks = []
  let length = 0
  try {
    while (true) {
      const part = await reader.read()
      if (!part || typeof part !== 'object' || typeof part.done !== 'boolean') return Object.freeze({ valid: false, tooLarge: false })
      if (part.done) break
      if (!ArrayBuffer.isView(part.value)) return Object.freeze({ valid: false, tooLarge: false })
      length += part.value.byteLength
      if (length > limitBytes) {
        await cancel(reader)
        return Object.freeze({ valid: false, tooLarge: true })
      }
      chunks.push(new Uint8Array(part.value.buffer, part.value.byteOffset, part.value.byteLength).slice())
    }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return Object.freeze({ valid: true, tooLarge: false, value: JSON.parse(text) })
  } catch {
    return Object.freeze({ valid: false, tooLarge: false })
  } finally {
    release(reader)
  }
}

/**
 * Reads a JSON request with strict media type, declared length, and streamed byte bounds
 * so a client cannot make the server buffer more than limitBytes before validation runs.
 */
export async function readBoundedJson(request, limitBytes) {
  if (!Number.isSafeInteger(limitBytes) || limitBytes <= 0) throw new TypeError(`JSON body limit must be a positive integer, received ${String(limitBytes)}`)
  const mediaType = request.headers.get('content-type')
  if (typeof mediaType !== 'string' || !JSON_MEDIA_TYPE.test(mediaType)) return Object.freeze({ valid: false, tooLarge: false })
  const length = declaredLength(request, limitBytes)
  if (!length.valid || length.tooLarge) return length
  return streamedJson(request, limitBytes)
}
