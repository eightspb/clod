const DELIMITERS = Object.freeze(['\t', ';'])
const DEFAULT_MAX_BYTES = 64 * 1024 * 1024
const DEFAULT_MAX_ROWS = 250_000

export class TabularCsvError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'TabularCsvError'
    this.code = code
    Object.freeze(this)
  }
}

function fail(code, message) {
  throw new TabularCsvError(code, message)
}

function decode(content, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) fail('INVALID_LIMIT', 'CSV byte limit must be a positive integer')
  if (typeof content === 'string') {
    if (Buffer.byteLength(content, 'utf8') > maxBytes) fail('INPUT_TOO_LARGE', `CSV input exceeds ${maxBytes} bytes`)
    return content.startsWith('\uFEFF') ? content.slice(1) : content
  }
  if (!(content instanceof Uint8Array)) fail('INVALID_INPUT', 'CSV input must be a string or byte array')
  if (content.byteLength > maxBytes) fail('INPUT_TOO_LARGE', `CSV input exceeds ${maxBytes} bytes`)
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(content)
    return text.startsWith('\uFEFF') ? text.slice(1) : text
  } catch {
    return fail('INVALID_UTF8', 'CSV input is not valid UTF-8')
  }
}

function delimiterFrom(text, literalQuotes) {
  const counts = new Map(DELIMITERS.map((delimiter) => [delimiter, 0]))
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"' && !literalQuotes) {
      if (quoted && text[index + 1] === '"') index += 1
      else quoted = !quoted
    } else if (!quoted && counts.has(character)) counts.set(character, counts.get(character) + 1)
    else if (!quoted && (character === '\n' || character === '\r')) break
  }
  const present = DELIMITERS.filter((delimiter) => counts.get(delimiter) > 0)
  if (present.length === 0) fail('UNDETECTABLE_DELIMITER', 'CSV header does not contain a supported delimiter')
  if (present.length > 1) fail('AMBIGUOUS_DELIMITER', 'CSV header contains multiple supported delimiters')
  return present[0]
}

function selectedDelimiter(text, value, literalQuotes) {
  if (value === undefined) return delimiterFrom(text, literalQuotes)
  if (!DELIMITERS.includes(value)) fail('INVALID_DELIMITER', 'CSV delimiter must be a tab or semicolon')
  return value
}

function newline(text, index, line) {
  if (text[index] === '\r' && text[index + 1] !== '\n') fail('INVALID_NEWLINE', `CSV contains a bare carriage return on line ${line}`)
  return Object.freeze({ index: index + (text[index] === '\r' ? 2 : 1), line: line + 1 })
}

function parseRecords(text, delimiter, maxRows, literalQuotes) {
  if (!Number.isSafeInteger(maxRows) || maxRows < 1) fail('INVALID_LIMIT', 'CSV row limit must be a positive integer')
  if (text.length === 0) fail('EMPTY_DOCUMENT', 'CSV document is empty')
  if (text.includes('\0')) fail('INVALID_CHARACTER', 'CSV document contains a null character')
  const records = []
  let cells = []
  let field = ''
  let index = 0
  let line = 1
  let sourceRow = 1
  let state = 'field-start'
  let endedWithNewline = false
  const finishField = () => {
    cells.push(field)
    field = ''
    state = 'field-start'
  }
  const finishRecord = () => {
    finishField()
    records.push(Object.freeze({ sourceRow, cells: Object.freeze(cells) }))
    if (records.length > maxRows) fail('ROW_LIMIT_EXCEEDED', `CSV document exceeds ${maxRows} rows`)
    cells = []
  }
  while (index < text.length) {
    const character = text[index]
    if (state === 'quoted') {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 2
      } else if (character === '"') {
        state = 'after-quote'
        index += 1
      } else if (character === '\n' || character === '\r') {
        const next = newline(text, index, line)
        field += '\n'
        index = next.index
        line = next.line
      } else {
        field += character
        index += 1
      }
    } else if (character === delimiter) {
      if (state === 'after-quote' || state === 'unquoted' || state === 'field-start') finishField()
      index += 1
      endedWithNewline = false
    } else if (character === '\n' || character === '\r') {
      const next = newline(text, index, line)
      finishRecord()
      index = next.index
      line = next.line
      sourceRow = line
      endedWithNewline = true
    } else if (character === '"' && literalQuotes) {
      field += '"'
      state = 'unquoted'
      index += 1
      endedWithNewline = false
    } else if (character === '"' && state === 'field-start') {
      state = 'quoted'
      index += 1
      endedWithNewline = false
    } else if (character === '"') fail('INVALID_QUOTE', `CSV contains an invalid quote on line ${line}`)
    else if (state === 'after-quote') fail('INVALID_QUOTE', `CSV contains content after a closing quote on line ${line}`)
    else {
      field += character
      state = 'unquoted'
      index += 1
      endedWithNewline = false
    }
  }
  if (state === 'quoted') fail('UNTERMINATED_QUOTE', `CSV quoted field starting on row ${sourceRow} is unterminated`)
  if (!endedWithNewline) finishRecord()
  return Object.freeze(records)
}

function headersFrom(record) {
  if (record.cells.length === 0 || record.cells.some((header) => header.length === 0)) fail('EMPTY_HEADER', 'CSV header contains an empty name')
  if (new Set(record.cells).size !== record.cells.length) fail('DUPLICATE_HEADER', 'CSV header contains duplicate names')
  return Object.freeze([...record.cells])
}

function valuesFrom(headers, cells) {
  const values = {}
  headers.forEach((header, index) => Object.defineProperty(values, header, { configurable: false, enumerable: true, value: cells[index], writable: false }))
  return Object.freeze(values)
}

function rowsFrom(headers, records, padShortRows) {
  return Object.freeze(records.map((record) => {
    if (record.cells.length > headers.length || (!padShortRows && record.cells.length < headers.length)) fail('ROW_WIDTH_MISMATCH', `CSV row ${record.sourceRow} has ${record.cells.length} cells instead of ${headers.length}`)
    if (record.cells.length === headers.length) return Object.freeze({ sourceRow: record.sourceRow, values: valuesFrom(headers, record.cells) })
    const cells = Object.freeze([...record.cells, ...Array(headers.length - record.cells.length).fill('')])
    const structuralIssues = Object.freeze([Object.freeze({ code: 'SHORT_ROW', actualWidth: record.cells.length, expectedWidth: headers.length })])
    return Object.freeze({ sourceRow: record.sourceRow, sourceWidth: record.cells.length, structuralIssues, values: valuesFrom(headers, cells) })
  }))
}

function booleanOption(options, key) {
  if (options[key] === undefined) return false
  if (typeof options[key] !== 'boolean') fail('INVALID_OPTIONS', 'CSV compatibility options must be boolean')
  return options[key]
}

/** Parses UTF-8 tabular text; opt-in literal quotes preserve legacy physical rows and padded rows report structural issues. */
export function parseTabularCsv(content, options = Object.freeze({})) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) fail('INVALID_OPTIONS', 'CSV parser options must be an object')
  const literalQuotes = booleanOption(options, 'literalQuotes')
  const padShortRows = booleanOption(options, 'padShortRows')
  const text = decode(content, options.maxBytes ?? DEFAULT_MAX_BYTES)
  const delimiter = selectedDelimiter(text, options.delimiter, literalQuotes)
  const records = parseRecords(text, delimiter, options.maxRows ?? DEFAULT_MAX_ROWS, literalQuotes)
  const headers = headersFrom(records[0])
  return Object.freeze({ headers, rows: rowsFrom(headers, records.slice(1), padShortRows) })
}
