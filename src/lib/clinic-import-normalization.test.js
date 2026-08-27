import { describe, expect, it } from 'vitest'

const SHIFTED_DATES = Object.freeze([
  ['1900-01-01', '1900-01-02'],
  ['1900-02-28', '1900-03-01'],
  ['1904-02-29', '1904-03-01'],
  ['1917-11-07', '1917-11-06'],
  ['1929-12-31', '1930-01-01'],
  ['1936-02-29', '1936-02-28'],
  ['1941-06-22', '1941-06-21'],
  ['1945-05-09', '1945-05-10'],
  ['1950-01-01', '1949-12-31'],
  ['1956-02-29', '1956-03-01'],
  ['1961-04-12', '1961-04-11'],
  ['1968-02-29', '1968-02-28'],
  ['1970-01-01', '1970-01-02'],
  ['1980-02-29', '1980-03-01'],
  ['1988-12-31', '1989-01-01'],
  ['1992-02-29', '1992-02-28'],
  ['1999-12-31', '2000-01-01'],
  ['2000-02-29', '2000-03-01'],
  ['2004-03-01', '2004-02-29'],
  ['2013-12-31', '2013-12-30'],
])

async function normalization() {
  return import('./clinic-import-normalization.js').catch(() => Object.freeze({}))
}

function captured(operation) {
  try {
    return Object.freeze({ threw: false, value: operation() })
  } catch (error) {
    return Object.freeze({ threw: true, name: error.name, code: error.code, message: error.message })
  }
}

describe('clinic import normalization', () => {
  it('normalizes decomposed yo and source whitespace without changing letters', async () => {
    const subject = await normalization()
    const result = subject.normalizeImportText?.('  Ле\u0308ля\u00a0\u2003  Рюриковна  ')
    expect(result).toBe('Лёля Рюриковна')
  })

  it('represents empty source text explicitly as null', async () => {
    const subject = await normalization()
    const values = [undefined, null, '', ' \u00a0\u2003 '].map((value) => subject.normalizeImportText?.(value))
    expect(values).toEqual([null, null, null, null])
  })

  it.each([['ASCII control', '\u0001'], ['bidi override', '\u202E'], ['bidi isolate', '\u2066'], ['zero-width format', '\u200B']])('rejects a %s character without exposing the source value', async (_label, character) => {
    const subject = await normalization()
    const secret = `Синтетика${character}Ω`
    const result = captured(() => subject.normalizeImportText(secret))
    expect({ ...result, leaked: result.message?.includes(secret) }).toEqual({ threw: true, name: 'ClinicImportNormalizationError', code: 'INVALID_TEXT', message: 'Clinic import value is invalid', leaked: false })
  })

  it('rejects a huge decomposed value before normalization can contract it', async () => {
    const subject = await normalization()
    const secret = '\u1100\u1161\u11A8'.repeat(4_096)
    const result = captured(() => subject.normalizeImportText(secret))
    expect({ threw: result.threw, code: result.code, leaked: result.message?.includes(secret) }).toEqual({ threw: true, code: 'INVALID_TEXT', leaked: false })
  })

  it('preserves exact punctuation in short clinic card numbers', async () => {
    const subject = await normalization()
    const values = [' 64-2 ', '546/1'].map((value) => subject.normalizeClinicCard?.(value))
    expect(values).toEqual(['64-2', '546/1'])
  })

  it('removes grouping hyphens only from a sixteen-digit MEDESK identifier', async () => {
    const subject = await normalization()
    const result = subject.normalizeMedeskEhr?.('1234-5678-9012-3456')
    expect(result).toBe('1234567890123456')
  })

  it('rejects MEDESK hyphens outside the measured grouping positions', async () => {
    const subject = await normalization()
    const result = captured(() => subject.normalizeMedeskEhr('1234--5678-9012-3456'))
    expect(result).toMatchObject({ threw: true, name: 'ClinicImportNormalizationError', code: 'INVALID_MEDESK_EHR' })
  })

  it('rejects other MEDESK punctuation without exposing the identifier', async () => {
    const subject = await normalization()
    const secret = '1234/5678/9012/3456'
    const result = captured(() => subject.normalizeMedeskEhr(secret))
    expect({ ...result, leaked: result.message?.includes(secret) }).toEqual({ threw: true, name: 'ClinicImportNormalizationError', code: 'INVALID_MEDESK_EHR', message: 'Clinic import value is invalid', leaked: false })
  })

  it('does not retain an arbitrary value as a public error code', async () => {
    const subject = await normalization()
    const error = new subject.ClinicImportNormalizationError('private-source-value')
    expect({ code: error.code, message: error.message }).toEqual({ code: 'INVALID_VALUE', message: 'Clinic import value is invalid' })
  })

  it('normalizes Russian domestic and explicit international phones', async () => {
    const subject = await normalization()
    const inputs = ['8 (921) 555-01-29', '921 555-01-29', '+44 20 7946 0958']
    const result = inputs.map((value) => subject.normalizeImportPhone?.(value))
    expect(result).toEqual(['79215550129', '79215550129', '442079460958'])
  })

  it('does not manufacture a phone from an empty source cell', async () => {
    const subject = await normalization()
    const result = subject.normalizeImportPhone?.('  ')
    expect(result).toBeNull()
  })

  it('normalizes email casing and Unicode composition', async () => {
    const subject = await normalization()
    const result = subject.normalizeImportEmail?.('  LE\u0308LYA@EXAMPLE.RU ')
    expect(result).toBe('lëlya@example.ru')
  })

  it('keeps only supported separators around passport digits', async () => {
    const subject = await normalization()
    const result = subject.normalizePassportDigits?.(' 12 34-567890 ')
    expect(result).toBe('1234567890')
  })

  it('creates a source reference without retaining a filesystem path', async () => {
    const subject = await normalization()
    const result = subject.sourceReference?.({ sourceName: 'PD — копия.xlsx', sourceRow: 27 })
    expect(result).toEqual({ sourceName: 'PD — копия.xlsx', sourceRow: 27 })
  })

  it('rejects a path-shaped source name without exposing it', async () => {
    const subject = await normalization()
    const secret = '/private/archive/patient.csv'
    const result = captured(() => subject.sourceReference({ sourceName: secret, sourceRow: 2 }))
    expect({ ...result, leaked: result.message?.includes(secret) }).toEqual({ threw: true, name: 'ClinicImportNormalizationError', code: 'INVALID_SOURCE_REFERENCE', message: 'Clinic import value is invalid', leaked: false })
  })

  it('returns a deterministic calendar date from the first ten UTC characters', async () => {
    const subject = await normalization()
    const result = subject.normalizeUtcDatePrefix?.('1988-02-29T21:00:00.000Z')
    expect(result).toBe('1988-02-29')
  })

  it('accepts an exact calendar date without a UTC time suffix', async () => {
    const subject = await normalization()
    const result = subject.normalizeUtcDatePrefix?.('1988-02-29')
    expect(result).toBe('1988-02-29')
  })

  it.each(['1988-02-29garbage', '1988-02-29T21:00:00', '1988-02-29T25:00:00Z'])('rejects a non-UTC date suffix %s', async (value) => {
    const subject = await normalization()
    const result = captured(() => subject.normalizeUtcDatePrefix(value))
    expect(result).toMatchObject({ threw: true, name: 'ClinicImportNormalizationError', code: 'INVALID_DATE' })
  })

  it('does not let a malformed UTC suffix become the authoritative birthday', async () => {
    const subject = await normalization()
    const result = subject.selectBirthDate?.({ patientsUtc: '1988-02-29garbage', pdXlsx: '1988-03-01' })
    expect({ value: result.value, source: result.source, patients: result.provenance[0] }).toEqual({ value: '1988-03-01', source: 'pd_xlsx', patients: { source: 'patients_csv', status: 'rejected', reason: 'invalid_date' } })
  })

  it('rejects the known placeholder date with explicit provenance', async () => {
    const subject = await normalization()
    const result = subject.selectBirthDate?.({ patientsUtc: '2023-12-15T00:00:00.000Z' })
    expect(result).toEqual({ value: null, source: null, provenance: [{ source: 'patients_csv', status: 'rejected', reason: 'placeholder' }, { source: 'pd_xlsx', status: 'empty', reason: null }, { source: 'medesk_csv', status: 'empty', reason: null }], ignoredCandidates: [] })
  })

  it('rejects birth years outside the approved interval', async () => {
    const subject = await normalization()
    const results = ['1899-12-31', '2014-01-01'].map((pdXlsx) => subject.selectBirthDate?.({ pdXlsx }))
    expect(results.map(({ value, provenance }) => ({ value, reason: provenance[1].reason }))).toEqual([{ value: null, reason: 'year_out_of_range' }, { value: null, reason: 'year_out_of_range' }])
  })

  it('falls back from an invalid UTC birthday to the approved workbook', async () => {
    const subject = await normalization()
    const result = subject.selectBirthDate?.({ patientsUtc: '2019-02-29T00:00:00.000Z', pdXlsx: '29.02.1988', medesk: '1988-03-01' })
    expect(result).toEqual({ value: '1988-02-29', source: 'pd_xlsx', provenance: [{ source: 'patients_csv', status: 'rejected', reason: 'invalid_date' }, { source: 'pd_xlsx', status: 'selected', reason: null }, { source: 'medesk_csv', status: 'ignored', reason: 'shifted_derivative' }], ignoredCandidates: [{ source: 'medesk_csv', value: '1988-03-01', reason: 'shifted_derivative' }] })
  })

  it('uses MEDESK only when higher-priority birthday sources are unusable', async () => {
    const subject = await normalization()
    const result = subject.selectBirthDate?.({ patientsUtc: '', pdXlsx: '31.12.1889', medesk: '07.11.1991' })
    expect(result).toMatchObject({ value: '1991-11-07', source: 'medesk_csv', provenance: [{ source: 'patients_csv', status: 'empty', reason: null }, { source: 'pd_xlsx', status: 'rejected', reason: 'year_out_of_range' }, { source: 'medesk_csv', status: 'selected', reason: null }] })
  })

  it.each(SHIFTED_DATES)('keeps authoritative UTC birthday %s over shifted derivative %s', async (authoritative, derivative) => {
    const subject = await normalization()
    const result = subject.selectBirthDate?.({ patientsUtc: `${authoritative}T21:00:00.000Z`, pdXlsx: derivative })
    expect(result).toMatchObject({ value: authoritative, source: 'patients_csv', ignoredCandidates: [{ source: 'pd_xlsx', value: derivative, reason: 'shifted_derivative' }] })
  })

  it('ignores an unapproved two-digit PD birthday without hard-coded records', async () => {
    const subject = await normalization()
    const result = subject.selectBirthDate?.({ pd: '29.02.88', pdXlsx: '1988-02-29' })
    expect({ value: result.value, source: result.source, pd: result.provenance[0] }).toEqual({ value: '1988-02-29', source: 'pd_xlsx', pd: { source: 'pd_csv', status: 'rejected', reason: 'unsupported_format' } })
  })

  it('gives the explicit PD gender priority over lower sources', async () => {
    const subject = await normalization()
    const result = subject.selectGender?.({ pd: ' муж. ', medesk: 'женщина', patronymic: 'Рюриковна' })
    expect(result).toMatchObject({ value: 'male', source: 'pd_csv', inferred: false, provenance: [{ source: 'pd_csv', status: 'selected', reason: null }, { source: 'patronymic', status: 'ignored', reason: 'lower_priority' }, { source: 'medesk_csv', status: 'ignored', reason: 'lower_priority' }] })
  })

  it('gives patronymic inference priority over explicit MEDESK gender', async () => {
    const subject = await normalization()
    const result = subject.selectGender?.({ pd: '', medesk: 'мужчина', patronymic: 'Рюриковна' })
    expect(result).toMatchObject({ value: 'female', source: 'patronymic', inferred: true, provenance: [{ source: 'pd_csv', status: 'empty', reason: null }, { source: 'patronymic', status: 'selected', reason: null }, { source: 'medesk_csv', status: 'ignored', reason: 'lower_priority' }] })
  })

  it('uses explicit MEDESK gender when the primary source is empty', async () => {
    const subject = await normalization()
    const result = subject.selectGender?.({ pd: '', medesk: 'мужчина', patronymic: 'Саша' })
    expect(result).toMatchObject({ value: 'male', source: 'medesk_csv', inferred: false })
  })

  it('normalizes the measured MEDESK female token', async () => {
    const subject = await normalization()
    const result = subject.selectGender?.({ medesk: ' Женщина ', patronymic: 'Саша' })
    expect(result).toMatchObject({ value: 'female', source: 'medesk_csv', inferred: false })
  })

  it('does not treat a MEDESK token as an explicit PD synonym', async () => {
    const subject = await normalization()
    const result = subject.selectGender?.({ pd: 'женщина', medesk: '', patronymic: 'Саша' })
    expect({ value: result.value, source: result.source, pd: result.provenance[0] }).toEqual({ value: null, source: null, pd: { source: 'pd_csv', status: 'rejected', reason: 'unsupported_value' } })
  })

  it('records conservative patronymic gender inference as inferred provenance', async () => {
    const subject = await normalization()
    const results = ['Рюрикович', 'Рюриковна'].map((patronymic) => subject.selectGender?.({ patronymic }))
    expect(results.map(({ value, source, inferred }) => ({ value, source, inferred }))).toEqual([{ value: 'male', source: 'patronymic', inferred: true }, { value: 'female', source: 'patronymic', inferred: true }])
  })

  it('returns explicit empty gender when no source proves it', async () => {
    const subject = await normalization()
    const result = subject.selectGender?.({ pd: 'не указан', medesk: '', patronymic: 'Саша' })
    expect(result).toMatchObject({ value: null, source: null, inferred: false, provenance: [{ source: 'pd_csv', status: 'rejected', reason: 'unsupported_value' }, { source: 'patronymic', status: 'empty', reason: null }, { source: 'medesk_csv', status: 'empty', reason: null }] })
  })

  it('freezes nested decision outputs so later stages cannot mutate provenance', async () => {
    const subject = await normalization()
    const result = subject.selectBirthDate?.({ patientsUtc: '1988-02-29T00:00:00.000Z', pdXlsx: '1988-03-01' })
    expect([result, result.provenance, result.provenance[0], result.ignoredCandidates, result.ignoredCandidates[0]].every(Object.isFrozen)).toBe(true)
  })
})
