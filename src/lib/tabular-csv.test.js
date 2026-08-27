import { describe, expect, it } from 'vitest'

const BOM_TSV = '\uFEFFИмя\tКарта\r\nЖанна\t64-2\r\n'
const QUOTED_CSV = 'Пациент;Заметка;Email\nЛюба;"Сказала ""ёж""";luba@example.invalid\n'
const MULTILINE_CSV = 'Имя;Заметка\nАглая;"Первая\nвторая"\nЗоя;Кратко\n'
const TRAILING_CSV = 'Имя;Телефон;Метка\nЭмма;+7 000 000-00-01;\n'
const NBSP_CSV = 'Имя;Адрес\nИя;Дом\u00a07\n'
const DUPLICATE_CSV = 'Имя;Имя\nАся;Аля\n'
const SHORT_CSV = 'Имя;Карта\nЯна\n'
const LONG_CSV = 'Имя;Карта\nРая;546/1;лишнее\n'
const BROKEN_CSV = 'Имя;Заметка\nНина;"без конца\n'
const LITERAL_QUOTES_CSV = 'Имя;Заметка;Метка\nАся;"начало;редкая\nИя;пара""кавычек;частая\nЮна;конец";обычная\nЛея;обычно;строка"\n'
const PADDED_CSV = 'Имя;Карта;Метка\nЯна;91-2\nИнна\n'
const CSV_MODULE_PATH = './tabular-csv.js'

async function csvModule() {
  return import(CSV_MODULE_PATH).catch(() => Object.freeze({}))
}

async function parse(content, options = Object.freeze({})) {
  const module = await csvModule()
  const parser = typeof module.parseTabularCsv === 'function' ? module.parseTabularCsv : () => Object.freeze({ headers: Object.freeze([]), rows: Object.freeze([]) })
  return parser(content, options)
}

async function errorCode(content, options = Object.freeze({})) {
  try {
    await parse(content, options)
    return 'NO_ERROR'
  } catch (error) {
    return error.code ?? error.name
  }
}

describe('parseTabularCsv', () => {
  it('reads a BOM-prefixed tab-separated CRLF document', async () => {
    const result = await parse(BOM_TSV)
    expect(result).toEqual({ headers: ['Имя', 'Карта'], rows: [{ sourceRow: 2, values: { Имя: 'Жанна', Карта: '64-2' } }] })
  })

  it('reads escaped quotes in semicolon-separated fields', async () => {
    const result = await parse(QUOTED_CSV)
    expect(result.rows[0].values).toEqual({ Пациент: 'Люба', Заметка: 'Сказала "ёж"', Email: 'luba@example.invalid' })
  })

  it('preserves embedded newlines and physical source row numbers', async () => {
    const result = await parse(MULTILINE_CSV, { delimiter: ';' })
    expect(result.rows).toEqual([{ sourceRow: 2, values: { Имя: 'Аглая', Заметка: 'Первая\nвторая' } }, { sourceRow: 4, values: { Имя: 'Зоя', Заметка: 'Кратко' } }])
  })

  it('keeps an empty trailing cell', async () => {
    const result = await parse(TRAILING_CSV, { delimiter: ';' })
    expect(result.rows[0].values).toEqual({ Имя: 'Эмма', Телефон: '+7 000 000-00-01', Метка: '' })
  })

  it('preserves nonbreaking spaces for later normalization', async () => {
    const result = await parse(NBSP_CSV, { delimiter: ';' })
    expect(result.rows[0].values.Адрес).toBe('Дом\u00a07')
  })

  it('returns deeply immutable headers and rows', async () => {
    const result = await parse('Имя;Карта\nЮна;81-4\n', { delimiter: ';' })
    expect([result, result.headers, result.rows, result.rows[0], result.rows[0].values].every(Object.isFrozen)).toBe(true)
  })

  it('rejects duplicate headers', async () => {
    const code = await errorCode(DUPLICATE_CSV, { delimiter: ';' })
    expect(code).toBe('DUPLICATE_HEADER')
  })

  it.each([SHORT_CSV, LONG_CSV])('rejects a row whose width differs from the header', async (content) => {
    const code = await errorCode(content, { delimiter: ';' })
    expect(code).toBe('ROW_WIDTH_MISMATCH')
  })

  it('rejects an unterminated quoted field', async () => {
    const code = await errorCode(BROKEN_CSV, { delimiter: ';' })
    expect(code).toBe('UNTERMINATED_QUOTE')
  })

  it('keeps strict malformed-quote validation by default', async () => {
    expect(await errorCode(LITERAL_QUOTES_CSV, { delimiter: ';' })).toBe('INVALID_QUOTE')
  })

  it('optionally treats every quote literally and preserves physical row boundaries', async () => {
    const result = await parse(LITERAL_QUOTES_CSV, { delimiter: ';', literalQuotes: true })
    expect(result.rows).toEqual([{ sourceRow: 2, values: { Имя: 'Ася', Заметка: '"начало', Метка: 'редкая' } }, { sourceRow: 3, values: { Имя: 'Ия', Заметка: 'пара""кавычек', Метка: 'частая' } }, { sourceRow: 4, values: { Имя: 'Юна', Заметка: 'конец"', Метка: 'обычная' } }, { sourceRow: 5, values: { Имя: 'Лея', Заметка: 'обычно', Метка: 'строка"' } }])
  })

  it('keeps strict short-row validation by default', async () => {
    expect(await errorCode(PADDED_CSV, { delimiter: ';' })).toBe('ROW_WIDTH_MISMATCH')
  })

  it('optionally pads each physical short row and exposes immutable structural metadata', async () => {
    const result = await parse(PADDED_CSV, { delimiter: ';', padShortRows: true })
    expect(result.rows).toEqual([{ sourceRow: 2, sourceWidth: 2, structuralIssues: [{ code: 'SHORT_ROW', actualWidth: 2, expectedWidth: 3 }], values: { Имя: 'Яна', Карта: '91-2', Метка: '' } }, { sourceRow: 3, sourceWidth: 1, structuralIssues: [{ code: 'SHORT_ROW', actualWidth: 1, expectedWidth: 3 }], values: { Имя: 'Инна', Карта: '', Метка: '' } }])
  })

  it('deeply freezes padded-row structural metadata', async () => {
    const result = await parse(PADDED_CSV, { delimiter: ';', padShortRows: true })
    expect(result.rows.every((row) => [row, row.structuralIssues, row.structuralIssues[0], row.values].every(Object.isFrozen))).toBe(true)
  })

  it('rejects an over-wide row even when short-row padding is enabled', async () => {
    expect(await errorCode(LONG_CSV, { delimiter: ';', padShortRows: true })).toBe('ROW_WIDTH_MISMATCH')
  })

  it.each([{ literalQuotes: 'yes' }, { padShortRows: 1 }])('rejects a non-boolean compatibility option', async (options) => {
    expect(await errorCode(TRAILING_CSV, { delimiter: ';', ...options })).toBe('INVALID_OPTIONS')
  })
})
