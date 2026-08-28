import { createCipheriv, createDecipheriv, createHash } from 'node:crypto'
import { link, lstat, mkdir, mkdtemp, open, readFile, readdir, realpath, rm, symlink, truncate, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { decryptPatientProfile } from './contact-identity.js'
import { readClinicImportStage, writeClinicImportStage } from './clinic-import-stage.js'

const ENCRYPTION_KEY = Buffer.from('stage-encryption-key-synthetic-3').toString('base64')
const WRONG_KEY = Buffer.from('stage-encryption-key-wrong-value').toString('base64')
const SOURCE_ROLES = Object.freeze(['pd', 'patients', 'visits', 'invoices', 'pdWorkbook', 'medesk', 'legacyPatients'])
const SOURCE_NAMES = Object.freeze({ pd: '544663c3807aab090001bad8PD.csv', patients: '544663c3807aab090001bad8_patients.csv', visits: '544663c3807aab090001bad8_visits.csv', invoices: '544663c3807aab090001bad8_invoices.csv', pdWorkbook: '544663c3807aab090001bad8PD — копия.xlsx', medesk: 'medesk.csv', legacyPatients: 'Vse pacienty.xlsx' })
const MANIFEST_FILES = Object.freeze(SOURCE_ROLES.map((role, index) => Object.freeze({ role, filename: SOURCE_NAMES[role], sha256: String(index + 1).repeat(64), byteSize: index + 1, rowCount: ['pd', 'visits', 'invoices'].includes(role) ? 1 : 0, parsingMode: role === 'visits' ? 'legacy_physical_rows' : 'strict', structuralIssueCount: 0 })))
const MANIFEST_HASH = createHash('sha256').update(JSON.stringify({ version: 1, files: MANIFEST_FILES })).digest('hex')
const SECRET_VALUES = Object.freeze(['Скрытая Фамилия', '+79991112233', '0000000000007001', 'Скрытый комментарий', 'Скрытый адрес', 'Скрытая услуга', 'female'])
const IDENTITY_EVIDENCE = Object.freeze({ exactEhr: 0, sameFioBirthDate: 0, patronymicCorrection: 0, surnameChange: 0, sameFioMissingBirthDate: 0, surnameChangeMissingBirthDate: 0, componentConflicts: 0, conflictingStrongIdentifiers: 0, insufficientEvidence: 0, sharedCardDifferentPeople: 0, supplementalPatients: 0, supplementalEnrichments: 0, supplementalIssues: 0 })
const VISIT_EVIDENCE = Object.freeze({ total: 1, linked: 1, ambiguous: 0, unmatched: 0, exactEhr: 1, exactClinicCard: 0, leadingZeroClinicCard: 0, phoneCompatibleName: 0, exactFullName: 0, conflictingCommentEvidence: 0, missingDate: 0, emptyStatus: 0, shortRow: 0, invalidStartDate: 0, invalidEndDate: 0, controlCharValue: 0, valueTooLarge: 0 })
const CONTROLS = Object.freeze({ primaryRows: 1, medeskEhrIdentifiers: 1, patients: 1, visits: 1, missingDates: 0, validBirthDates: 1, cardCollisionGroups: 0, invoices: 1, primaryMerges: 0, supplementalPatients: 0, nameHistoryRecords: 1 })

function source(sourceRow) {
  return Object.freeze({ sourceName: SOURCE_NAMES.pd, sourceRow })
}

function payloadHash(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

function bundle() {
  const patientId = '00000000-0000-8000-8000-000000000001'
  const historicalVisitId = '00000000-0000-8000-8000-000000000002'
  const patientPayload = Object.freeze({ structuralIssues: Object.freeze([]), values: Object.freeze({ surname: 'Скрытая Фамилия' }) })
  const visitPayload = Object.freeze({ structuralIssues: Object.freeze([]), values: Object.freeze({ appointment_id: 'appointment-secret' }) })
  const invoicePayload = Object.freeze({ structuralIssues: Object.freeze([]), values: Object.freeze({ appointment_id: 'appointment-secret', service_name: 'Скрытая услуга' }) })
  return Object.freeze({
    version: 1,
    manifest: Object.freeze({ version: 1, files: MANIFEST_FILES, sha256: MANIFEST_HASH }),
    patients: Object.freeze([Object.freeze({ id: patientId, profile: Object.freeze({ lastName: 'Скрытая Фамилия', firstName: 'Ия', middleName: 'Тестовна', birthDate: '1988-02-29', gender: 'female', primaryPhone: '+79991112233' }), firstSeenAt: '2020-01-01T00:00:00.000Z', lastSeenAt: '2024-01-01T00:00:00.000Z', isSupplemental: false })]),
    externalIdentifiers: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000003', patientId, system: 'medesk_ehr', value: '0000000000007001', fingerprint: `v1:${'1'.repeat(64)}`, globalFingerprint: `v1:${'2'.repeat(64)}`, identityKey: `v1:${'3'.repeat(64)}`, isPrimary: true, source: source(2), sources: Object.freeze([source(2)]) })]),
    contacts: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000004', patientId, kind: 'phone', value: '+79991112233', fingerprint: `v1:${'4'.repeat(64)}`, mask: '+7 •••••••• 33', isPrimary: true, source: source(2), sources: Object.freeze([source(2)]), firstSeenAt: '2020-01-01T00:00:00.000Z', lastSeenAt: '2024-01-01T00:00:00.000Z' })]),
    nameHistory: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000005', patientId, lastName: 'Скрытая Фамилия', source: source(2), sourceIdentifier: '0000000000007001', observedAt: '2020-01-01T00:00:00.000Z', reason: 'surname_change' })]),
    privateData: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000006', patientId, value: Object.freeze({ address: 'Скрытый адрес' }), sources: Object.freeze([source(2)]) })]),
    consents: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000007', patientId, type: 'sms_notifications', status: 'granted', observedAt: '2024-01-01T00:00:00.000Z', source: source(2) })]),
    sourceLinks: Object.freeze([]),
    historicalVisits: Object.freeze([Object.freeze({ id: historicalVisitId, sourceName: SOURCE_NAMES.visits, sourceRow: 2, patientId, appointmentIdFingerprint: `v1:${'a'.repeat(64)}`, startsAt: '2024-02-29T09:15:00.000Z', endsAt: '2024-02-29T09:45:00.000Z', sourceStatus: 'completed', linkStatus: 'linked', linkMethod: 'exact_ehr', evidenceLevel: 'exact', issueCodes: Object.freeze([]) })]),
    visitDetails: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000008', historicalVisitId, value: Object.freeze({ appointment_id: 'appointment-secret', comment: 'Скрытый комментарий', service_names: 'Скрытая услуга' }) })]),
    visitCandidates: Object.freeze([]),
    identityIssues: Object.freeze([]),
    visitIssues: Object.freeze([]),
    normalizationIssues: Object.freeze([]),
    sourceRows: Object.freeze([
      Object.freeze({ id: '00000000-0000-8000-8000-000000000009', sourceRole: 'pd', sourceName: SOURCE_NAMES.pd, sourceRow: 2, patientId, historicalVisitId: null, birthDateValid: true, payload: patientPayload, payloadHash: payloadHash(patientPayload), issueCodes: Object.freeze([]) }),
      Object.freeze({ id: '00000000-0000-8000-8000-000000000011', sourceRole: 'visits', sourceName: SOURCE_NAMES.visits, sourceRow: 2, patientId, historicalVisitId, birthDateValid: null, payload: visitPayload, payloadHash: payloadHash(visitPayload), issueCodes: Object.freeze([]) }),
      Object.freeze({ id: '00000000-0000-8000-8000-000000000012', sourceRole: 'invoices', sourceName: SOURCE_NAMES.invoices, sourceRow: 2, patientId: null, historicalVisitId: null, birthDateValid: null, payload: invoicePayload, payloadHash: payloadHash(invoicePayload), issueCodes: Object.freeze([]) })
    ]),
    invoices: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000010', sourceName: SOURCE_NAMES.invoices, sourceRow: 2, historicalVisitId, status: 'incomplete_source', payload: invoicePayload, payloadHash: payloadHash(invoicePayload) })]),
    attachments: Object.freeze([]),
    identityMergeEvidence: Object.freeze([]),
    identityEvidenceCounts: IDENTITY_EVIDENCE,
    visitEvidenceCounts: VISIT_EVIDENCE,
    report: Object.freeze({ version: 1, manifestHash: MANIFEST_HASH, sourceRows: Object.freeze({ total: 3, byRole: Object.freeze({ pd: 1, patients: 0, visits: 1, invoices: 1, pdWorkbook: 0, medesk: 0, legacyPatients: 0 }) }), patients: Object.freeze({ total: 1, supplemental: 0, externalIdentifiers: 1, medeskEhrIdentifiers: 1, contacts: 1, nameHistory: 1, consents: 1, evidenceCounts: IDENTITY_EVIDENCE }), visits: VISIT_EVIDENCE, invoices: Object.freeze({ total: 1, incomplete: 1 }), attachments: Object.freeze({ total: 0 }), issues: Object.freeze({ normalization: 0, identity: 0, visits: 0 }), controls: CONTROLS })
  })
}

function randomSource(seed = 0) {
  let counter = seed
  return (size) => Buffer.alloc(size, ++counter)
}

async function paths() {
  const root = await mkdtemp(join(tmpdir(), 'clinic-stage-test-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const repositoryPath = join(root, 'repository')
  const outside = join(root, 'outside')
  await Promise.all([mkdir(repositoryPath), mkdir(outside)])
  const databasePath = join(root, 'target.db')
  await writeFile(databasePath, Buffer.from('byte-identical-synthetic-database'))
  return Object.freeze({ root, repositoryPath, databasePath, stagePath: join(outside, 'clinic-import.stage') })
}

function captured(operation) {
  return operation().then((value) => ({ value, error: null }), (error) => ({ value: null, error }))
}

function changedBundle(change) {
  const value = structuredClone(bundle())
  change(value)
  return value
}

function ambiguousBundle(change = () => {}) {
  return changedBundle((value) => {
    const patientId = '00000000-0000-8000-8000-000000000081'
    value.patients.push({ ...value.patients[0], id: patientId, profile: { ...value.patients[0].profile, primaryPhone: null }, isSupplemental: true })
    value.externalIdentifiers.push({ ...value.externalIdentifiers[0], id: '00000000-0000-8000-8000-000000000082', patientId, value: '0000000000007002', fingerprint: `v1:${'5'.repeat(64)}`, globalFingerprint: `v1:${'6'.repeat(64)}`, identityKey: `v1:${'7'.repeat(64)}` })
    value.privateData.push({ ...value.privateData[0], id: '00000000-0000-8000-8000-000000000083', patientId })
    value.consents.push({ ...value.consents[0], id: '00000000-0000-8000-8000-000000000086', patientId, status: 'not_granted' })
    value.historicalVisits[0].patientId = null
    value.historicalVisits[0].linkStatus = 'ambiguous'
    value.historicalVisits[0].linkMethod = 'exact_full_name'
    value.historicalVisits[0].evidenceLevel = 'moderate'
    value.sourceRows.find(({ sourceRole }) => sourceRole === 'visits').patientId = null
    value.visitCandidates.push({ id: '00000000-0000-8000-8000-000000000084', historicalVisitId: value.historicalVisits[0].id, patientId: value.patients[0].id, evidenceCode: 'EXACT_FULL_NAME', score: 60 }, { id: '00000000-0000-8000-8000-000000000085', historicalVisitId: value.historicalVisits[0].id, patientId, evidenceCode: 'EXACT_FULL_NAME', score: 60 })
    value.report.patients.total = 2
    value.report.patients.supplemental = 1
    value.report.patients.externalIdentifiers = 2
    value.report.patients.medeskEhrIdentifiers = 2
    value.report.patients.consents = 2
    value.report.patients.evidenceCounts.supplementalPatients = 1
    value.identityEvidenceCounts.supplementalPatients = 1
    value.report.visits.linked = 0
    value.report.visits.ambiguous = 1
    value.report.visits.exactEhr = 0
    value.report.visits.exactFullName = 1
    value.visitEvidenceCounts.linked = 0
    value.visitEvidenceCounts.ambiguous = 1
    value.visitEvidenceCounts.exactEhr = 0
    value.visitEvidenceCounts.exactFullName = 1
    value.report.controls.medeskEhrIdentifiers = 2
    value.report.controls.patients = 2
    value.report.controls.validBirthDates = 1
    value.report.controls.supplementalPatients = 1
    change(value)
  })
}

async function authenticatedMutation(stagePath, change) {
  const artifact = JSON.parse(await readFile(stagePath, 'utf8'))
  const key = Buffer.from(ENCRYPTION_KEY, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(artifact.iv, 'base64url'))
  decipher.setAAD(Buffer.from(`clod.clinic-import-stage\0${artifact.version}\0${artifact.manifestHash}\0${artifact.planHash}`))
  decipher.setAuthTag(Buffer.from(artifact.tag, 'base64url'))
  const plan = JSON.parse(Buffer.concat([decipher.update(Buffer.from(artifact.ciphertext, 'base64url')), decipher.final()]).toString('utf8'))
  change(plan)
  const plaintext = Buffer.from(JSON.stringify(plan))
  const planHash = createHash('sha256').update(plaintext).digest('hex')
  const iv = Buffer.alloc(12, 93)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(`clod.clinic-import-stage\0${artifact.version}\0${artifact.manifestHash}\0${planHash}`))
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  await writeFile(stagePath, JSON.stringify({ ...artifact, planHash, iv: iv.toString('base64url'), ciphertext: ciphertext.toString('base64url'), tag: cipher.getAuthTag().toString('base64url') }))
  return planHash
}

describe('clinic import encrypted stage', () => {
  it('writes outside the repository without changing one database byte and reads without source files', async () => {
    const location = await paths()
    const before = await readFile(location.databasePath)
    const writeResult = await captured(() => writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    const written = writeResult.value
    const after = await readFile(location.databasePath)
    const opened = await readClinicImportStage({ stagePath: location.stagePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY, expectedManifestHash: written.manifestHash, expectedPlanHash: written.planHash })
    const profile = decryptPatientProfile({ envelope: opened.plan.patients[0].profileEnvelope, key: ENCRYPTION_KEY })
    const protectedJson = JSON.stringify(opened.plan)
    expect({ writeError: writeResult.error?.code ?? null, databaseSame: before.equals(after), manifestHash: opened.manifestHash, planHash: opened.planHash, safeWriteReport: SECRET_VALUES.some((value) => JSON.stringify(written).includes(value)), plaintextInPlan: SECRET_VALUES.some((value) => protectedJson.includes(value)), envelopeCount: (protectedJson.match(/v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []).length, attachments: opened.plan.attachments, profile }).toEqual({ writeError: null, databaseSame: true, manifestHash: MANIFEST_HASH, planHash: written.planHash, safeWriteReport: false, plaintextInPlan: false, envelopeCount: 11, attachments: [], profile: { firstName: 'Ия', lastName: 'Скрытая Фамилия', secondName: 'Тестовна', phone: '79991112233', birthday: '1988-02-29' } })
  })

  it('gives independently encrypted stages of one logical bundle the same plan hash', async () => {
    const first = await paths()
    const second = await paths()
    const firstWrite = await writeClinicImportStage({ bundle: bundle(), stagePath: first.stagePath, databasePath: first.databasePath, repositoryPath: first.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource(0) })
    const secondWrite = await writeClinicImportStage({ bundle: bundle(), stagePath: second.stagePath, databasePath: second.databasePath, repositoryPath: second.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource(91) })
    const firstRead = await readClinicImportStage({ stagePath: first.stagePath, repositoryPath: first.repositoryPath, encryptionKey: ENCRYPTION_KEY, expectedManifestHash: firstWrite.manifestHash, expectedPlanHash: firstWrite.planHash })
    const secondRead = await readClinicImportStage({ stagePath: second.stagePath, repositoryPath: second.repositoryPath, encryptionKey: ENCRYPTION_KEY, expectedManifestHash: secondWrite.manifestHash, expectedPlanHash: secondWrite.planHash })
    expect({ differentArtifacts: (await readFile(first.stagePath)).equals(await readFile(second.stagePath)), hashes: [firstWrite.planHash, firstRead.planHash, secondWrite.planHash, secondRead.planHash] }).toEqual({ differentArtifacts: false, hashes: Array.from({ length: 4 }, () => firstWrite.planHash) })
  })

  it('includes every verified patient profile field in the logical plan hash', async () => {
    const first = await paths()
    const second = await paths()
    const firstWrite = await writeClinicImportStage({ bundle: bundle(), stagePath: first.stagePath, databasePath: first.databasePath, repositoryPath: first.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() })
    const secondWrite = await writeClinicImportStage({ bundle: changedBundle((value) => { value.patients[0].profile.gender = 'male' }), stagePath: second.stagePath, databasePath: second.databasePath, repositoryPath: second.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() })
    expect(firstWrite.planHash).not.toBe(secondWrite.planHash)
  })

  it('rejects tampering, the wrong key and mismatched expected hashes with frozen value-free errors', async () => {
    const location = await paths()
    const written = await writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() })
    const wrongKey = await captured(() => readClinicImportStage({ stagePath: location.stagePath, repositoryPath: location.repositoryPath, encryptionKey: WRONG_KEY, expectedManifestHash: written.manifestHash, expectedPlanHash: written.planHash }))
    const wrongHash = await captured(() => readClinicImportStage({ stagePath: location.stagePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY, expectedManifestHash: 'd'.repeat(64), expectedPlanHash: written.planHash }))
    const artifact = JSON.parse(await readFile(location.stagePath, 'utf8'))
    artifact.ciphertext = `${artifact.ciphertext[0] === 'A' ? 'B' : 'A'}${artifact.ciphertext.slice(1)}`
    await writeFile(location.stagePath, JSON.stringify(artifact))
    const tampered = await captured(() => readClinicImportStage({ stagePath: location.stagePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY, expectedManifestHash: written.manifestHash, expectedPlanHash: written.planHash }))
    expect([tampered, wrongKey, wrongHash].map(({ error }) => ({ name: error?.name, code: error?.code, frozen: Object.isFrozen(error), leaked: SECRET_VALUES.some((value) => error?.message?.includes(value)) }))).toEqual(Array.from({ length: 3 }, () => ({ name: 'ClinicImportStageError', code: 'STAGE_INTEGRITY_FAILED', frozen: true, leaked: false })))
  })

  it('refuses relative output and any output inside the repository before writing', async () => {
    const location = await paths()
    const relative = await captured(() => writeClinicImportStage({ bundle: bundle(), stagePath: 'relative.stage', databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }))
    const inside = await captured(() => writeClinicImportStage({ bundle: bundle(), stagePath: join(location.repositoryPath, 'inside.stage'), databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }))
    expect([relative, inside].map(({ error }) => ({ name: error?.name, code: error?.code, frozen: Object.isFrozen(error) }))).toEqual(Array.from({ length: 2 }, () => ({ name: 'ClinicImportStageError', code: 'INVALID_STAGE_PATH', frozen: true })))
  })

  it('refuses an outside symlink that resolves to a stage inside the repository', async () => {
    const location = await paths()
    const written = await writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() })
    const inside = join(location.repositoryPath, 'hidden.stage')
    await writeFile(inside, await readFile(location.stagePath))
    await unlink(location.stagePath)
    await symlink(inside, location.stagePath)
    const result = await captured(() => readClinicImportStage({ stagePath: location.stagePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY, expectedManifestHash: written.manifestHash, expectedPlanHash: written.planHash }))
    expect({ name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error) }).toEqual({ name: 'ClinicImportStageError', code: 'INVALID_STAGE_PATH', frozen: true })
  })

  it('does not invoke input getters and never puts their returned values into an error', async () => {
    let reads = 0
    const malicious = Object.defineProperty({}, 'bundle', { enumerable: true, get: () => {
      reads += 1
      return 'getter-secret'
    } })
    const result = await captured(() => writeClinicImportStage(malicious))
    expect({ reads, name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error), leaked: result.error?.message.includes('getter-secret') }).toEqual({ reads: 0, name: 'ClinicImportStageError', code: 'INVALID_STAGE_INPUT', frozen: true, leaked: false })
  })

  it('rejects a report containing arbitrary text before writing it to the stage', async () => {
    const location = await paths()
    const unsafe = Object.freeze({ ...bundle(), report: Object.freeze({ version: 1, manifestHash: MANIFEST_HASH, leaked: 'Скрытая Фамилия' }) })
    const result = await captured(() => writeClinicImportStage({ bundle: unsafe, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }))
    expect({ name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error), leaked: result.error?.message.includes('Скрытая Фамилия') }).toEqual({ name: 'ClinicImportStageError', code: 'INVALID_STAGE_INPUT', frozen: true, leaked: false })
  })

  it.each([
    ['orphan patient reference', (value) => { value.contacts[0].patientId = '00000000-0000-8000-8000-000000000099' }],
    ['duplicate global identifier fingerprint', (value) => { value.externalIdentifiers.push({ ...value.externalIdentifiers[0], id: '00000000-0000-8000-8000-000000000098' }) }],
    ['source row count drift', (value) => { value.report.sourceRows.total = 4 }],
    ['birth-date fact count drift', (value) => { value.report.controls.validBirthDates = 0 }],
    ['missing primary birth-date fact', (value) => { delete value.sourceRows[0].birthDateValid }],
    ['nullable primary birth-date fact', (value) => { value.sourceRows[0].birthDateValid = null }],
    ['birth-date fact on a non-primary row', (value) => { value.sourceRows[1].birthDateValid = false }],
    ['source payload hash drift', (value) => { value.sourceRows[0].payloadHash = 'f'.repeat(64) }],
    ['appointment fingerprint drift', (value) => { value.historicalVisits[0].appointmentIdFingerprint = null }],
    ['duplicate patient consent', (value) => { value.consents.push({ ...value.consents[0], id: '00000000-0000-8000-8000-000000000097' }); value.report.patients.consents = 2 }],
    ['missing patient consent', (value) => { value.consents = []; value.report.patients.consents = 0 }],
    ['unsupported patient consent status', (value) => { value.consents[0].status = 'unknown' }],
    ['forged invoice linkage without an appointment id', (value) => { delete value.invoices[0].payload.values.appointment_id; value.invoices[0].payloadHash = payloadHash(value.invoices[0].payload); const sourceRow = value.sourceRows.find(({ sourceRole }) => sourceRole === 'invoices'); sourceRow.payloadHash = payloadHash(sourceRow.payload) }],
    ['inverted patient observation range', (value) => { value.patients[0].firstSeenAt = '2025-01-01T00:00:00.000Z' }],
    ['one-sided patient observation range', (value) => { value.patients[0].firstSeenAt = null }],
    ['inverted contact observation range', (value) => { value.contacts[0].firstSeenAt = '2025-01-01T00:00:00.000Z' }],
    ['one-sided contact observation range', (value) => { value.contacts[0].lastSeenAt = null }],
    ['surname change without proven earlier chronology', (value) => { value.nameHistory[0].observedAt = null }],
    ['surname change simultaneous with current chronology', (value) => { value.nameHistory[0].observedAt = value.patients[0].lastSeenAt }],
    ['timezone-coerced timestamp', (value) => { value.patients[0].firstSeenAt = '2020-01-01T03:00:00+03:00' }],
    ['calendar-invalid timestamp', (value) => { value.patients[0].firstSeenAt = '2024-02-30T00:00:00.000Z' }]
  ])('rejects a relational graph with %s before writing', async (_label, change) => {
    const location = await paths()
    const result = await captured(() => writeClinicImportStage({ bundle: changedBundle(change), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_INPUT', files: [] })
  })

  it.each([
    ['duplicate patient identity key', (value) => { value.externalIdentifiers.push({ ...value.externalIdentifiers[0], id: '00000000-0000-8000-8000-000000000091', system: 'clinic_card', fingerprint: `v1:${'8'.repeat(64)}`, globalFingerprint: null }); value.report.patients.externalIdentifiers = 2 }],
    ['duplicate patient contact fingerprint', (value) => { value.contacts.push({ ...value.contacts[0], id: '00000000-0000-8000-8000-000000000092' }); value.report.patients.contacts = 2 }],
    ['multiple primary patient phones', (value) => { value.contacts.push({ ...value.contacts[0], id: '00000000-0000-8000-8000-000000000092', value: '+79991112244', fingerprint: `v1:${'5'.repeat(64)}`, mask: '+7 •••••••• 44' }); value.report.patients.contacts = 2 }],
    ['primary phone different from the patient profile', (value) => { value.contacts[0].value = '+79991112244'; value.contacts[0].fingerprint = `v1:${'5'.repeat(64)}`; value.contacts[0].mask = '+7 •••••••• 44' }],
    ['candidate on a linked visit', (value) => { value.visitCandidates.push({ id: '00000000-0000-8000-8000-000000000093', historicalVisitId: value.historicalVisits[0].id, patientId: value.patients[0].id, evidenceCode: 'EXACT_EHR', score: 100 }) }],
    ['source patient different from its linked visit', (value) => { value.sourceRows.find(({ sourceRole }) => sourceRole === 'visits').patientId = null }],
    ['one issue id reused across collections', (value) => { const id = '00000000-0000-8000-8000-000000000094'; value.identityIssues.push({ id, code: 'INCOMPLETE_PATIENT_NAME', source: source(2), candidatePatientIds: [value.patients[0].id] }); value.normalizationIssues.push({ id, code: 'INVALID_NORMALIZED_VALUE', source: source(2), field: 'name' }); value.report.issues.identity = 1; value.report.issues.normalization = 1 }]
  ])('rejects the full relational graph invariant: %s', async (_label, change) => {
    const location = await paths()
    const result = await captured(() => writeClinicImportStage({ bundle: changedBundle(change), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_INPUT', files: [] })
  })

  it('accepts an ambiguous visit only with a method and two distinct candidates', async () => {
    const location = await paths()
    const input = ambiguousBundle()
    const result = await captured(() => writeClinicImportStage({ bundle: input, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ error: result.error?.code ?? null, files: await readdir(join(location.root, 'outside')) }).toEqual({ error: null, files: ['clinic-import.stage'] })
  })

  it('rejects granted sms consent for a supplemental patient', async () => {
    const location = await paths()
    const result = await captured(() => writeClinicImportStage({ bundle: ambiguousBundle((value) => { value.consents.find(({ patientId }) => value.patients.find(({ isSupplemental }) => isSupplemental).id === patientId).status = 'granted' }), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_INPUT', files: [] })
  })

  it('rejects a link method with a different evidence level', async () => {
    const location = await paths()
    const result = await captured(() => writeClinicImportStage({ bundle: changedBundle((value) => { value.historicalVisits[0].evidenceLevel = 'strong' }), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_INPUT', files: [] })
  })

  it.each([
    ['evidence code', (value) => { value.visitCandidates[0].evidenceCode = 'EXACT_EHR' }],
    ['score', (value) => { value.visitCandidates[0].score = 100 }]
  ])('rejects an ambiguous candidate with a mismatched %s', async (_label, change) => {
    const location = await paths()
    const result = await captured(() => writeClinicImportStage({ bundle: ambiguousBundle(change), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_INPUT', files: [] })
  })

  it.each([
    ['per-visit', 2_049],
    ['total', 20_001]
  ])('rejects the %s candidate bound before materializing the stage', async (_label, count) => {
    const location = await paths()
    const input = ambiguousBundle((value) => {
      const candidate = value.visitCandidates[0]
      value.visitCandidates = Array.from({ length: count }, (_, index) => ({ ...candidate, id: `00000000-0000-8000-8000-${String(index + 100_000).padStart(12, '0')}` }))
    })
    const result = await captured(() => writeClinicImportStage({ bundle: input, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INPUT_TOO_COMPLEX', files: [] })
  })

  it.each([
    ['candidate evidence', (value) => { value.visitCandidates.push({ id: '00000000-0000-8000-8000-000000000093', historicalVisitId: value.historicalVisits[0].id, patientId: value.patients[0].id, evidenceCode: 'IVANOV', score: 100 }) }],
    ['identity issue code', (value) => { value.identityIssues.push({ id: '00000000-0000-8000-8000-000000000094', code: 'IVANOV', source: source(2), candidatePatientIds: [value.patients[0].id] }); value.report.issues.identity = 1 }],
    ['visit issue code', (value) => { value.visitIssues.push({ id: '00000000-0000-8000-8000-000000000095', historicalVisitId: value.historicalVisits[0].id, code: 'IVANOV', field: 'appointment_begin' }); value.report.issues.visits = 1 }],
    ['normalization issue code', (value) => { value.normalizationIssues.push({ id: '00000000-0000-8000-8000-000000000096', code: 'IVANOV', source: source(2), field: 'name' }); value.report.issues.normalization = 1 }],
    ['normalization issue field', (value) => { value.normalizationIssues.push({ id: '00000000-0000-8000-8000-000000000096', code: 'INVALID_NORMALIZED_VALUE', source: source(2), field: 'ivanov' }); value.report.issues.normalization = 1 }],
    ['visit issue field', (value) => { value.visitIssues.push({ id: '00000000-0000-8000-8000-000000000095', historicalVisitId: value.historicalVisits[0].id, code: 'CONTROL_CHAR_VALUE', field: 'ivanov' }); value.report.issues.visits = 1 }],
    ['source row issue code', (value) => { value.sourceRows[0].issueCodes = ['IVANOV'] }]
  ])('rejects hostile allowlist metadata in %s', async (_label, change) => {
    const location = await paths()
    const result = await captured(() => writeClinicImportStage({ bundle: changedBundle(change), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_INPUT', files: [] })
  })

  it.each([
    ['card collision total', (value) => { value.report.controls.cardCollisionGroups = 1 }],
    ['component conflict evidence', (value) => { value.report.patients.evidenceCounts.componentConflicts = 1 }]
  ])('derives %s instead of trusting the report', async (_label, change) => {
    const location = await paths()
    const result = await captured(() => writeClinicImportStage({ bundle: changedBundle(change), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_INPUT', files: [] })
  })

  it('keeps exact pre-merge birth-date controls when primary rows merge', async () => {
    const location = await paths()
    const input = changedBundle((value) => {
      const duplicate = structuredClone(value.sourceRows[0])
      duplicate.id = '00000000-0000-8000-8000-000000000081'
      duplicate.sourceRow = 3
      value.sourceRows.push(duplicate)
      value.manifest.files[0].rowCount = 2
      value.manifest.sha256 = createHash('sha256').update(JSON.stringify({ version: 1, files: value.manifest.files })).digest('hex')
      value.report.manifestHash = value.manifest.sha256
      value.report.sourceRows.total = 4
      value.report.sourceRows.byRole.pd = 2
      value.report.controls.primaryRows = 2
      value.report.controls.primaryMerges = 1
      value.report.controls.validBirthDates = 2
      value.identityMergeEvidence = [{ ordinal: 1, patientId: value.patients[0].id, reason: 'sameFioBirthDate', sources: [source(2), source(3)] }]
      value.identityEvidenceCounts.sameFioBirthDate = 1
      value.report.patients.evidenceCounts.sameFioBirthDate = 1
    })
    const written = await writeClinicImportStage({ bundle: input, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() })
    const opened = await readClinicImportStage({ stagePath: location.stagePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY, expectedManifestHash: written.manifestHash, expectedPlanHash: written.planHash })
    expect({ patients: opened.plan.patients.length, primaryRows: opened.plan.report.controls.primaryRows, validBirthDates: opened.plan.report.controls.validBirthDates }).toEqual({ patients: 1, primaryRows: 2, validBirthDates: 2 })
  })

  it('preserves the identity-alias name-history reason through protection', async () => {
    const location = await paths()
    const input = changedBundle((value) => { value.nameHistory[0].reason = 'identity_alias' })
    const written = await writeClinicImportStage({ bundle: input, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() })
    const opened = await readClinicImportStage({ stagePath: location.stagePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY, expectedManifestHash: written.manifestHash, expectedPlanHash: written.planHash })
    expect(opened.plan.nameHistory[0].reason).toBe('identity_alias')
  })

  it('rejects an aggregate bundle budget before sealing or materializing all repeated payloads', async () => {
    const location = await paths()
    const input = structuredClone(bundle())
    const row = { ...input.sourceRows[0], payload: { values: { huge: 'Ж'.repeat(20_000) }, structuralIssues: [] } }
    input.sourceRows = Array(14_000).fill(row)
    let randomReads = 0
    const result = await captured(() => writeClinicImportStage({ bundle: input, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: (size) => { randomReads += 1; return Buffer.alloc(size, 1) } }))
    expect({ code: result.error?.code, randomReads, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INPUT_TOO_COMPLEX', randomReads: 0, files: [] })
  })

  it('keeps input-work above the former stage-byte cap available for semantic validation', async () => {
    const location = await paths()
    const input = structuredClone(bundle())
    const row = { ...input.sourceRows[0], payload: { values: { huge: 'Ж'.repeat(20_000) }, structuralIssues: [] } }
    input.sourceRows = Array(2_000).fill(row)
    let randomReads = 0
    const result = await captured(() => writeClinicImportStage({ bundle: input, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: (size) => { randomReads += 1; return Buffer.alloc(size, 1) } }))
    expect({ code: result.error?.code, randomReads, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_INPUT', randomReads: 0, files: [] })
  })

  it('rejects a sparse artifact above the read boundary before allocating it', async () => {
    const location = await paths()
    await writeFile(location.stagePath, '{}')
    await truncate(location.stagePath, 512 * 1024 * 1024 + 1)
    const result = await captured(() => readClinicImportStage({ stagePath: location.stagePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY, expectedManifestHash: MANIFEST_HASH, expectedPlanHash: 'a'.repeat(64) }))
    expect(result.error?.code).toBe('INPUT_TOO_COMPLEX')
  })

  it('snapshots a collection own length descriptor without invoking a proxy length getter', async () => {
    const location = await paths()
    const input = bundle()
    let reads = 0
    const sourceRows = new Proxy([...input.sourceRows], { get: (target, property, receiver) => { if (property === 'length') reads += 1; return Reflect.get(target, property, receiver) } })
    const written = await writeClinicImportStage({ bundle: Object.freeze({ ...input, sourceRows }), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() })
    expect({ reads, manifestHash: written.manifestHash }).toEqual({ reads: 0, manifestHash: MANIFEST_HASH })
  })

  it('uses one aggregate descriptor snapshot when a bundle proxy swaps a collection', async () => {
    const location = await paths()
    const input = structuredClone(bundle())
    const row = { ...input.sourceRows[0], payload: { values: { huge: 'Ж'.repeat(20_000) }, structuralIssues: [] } }
    const oversized = Array(2_000).fill(row)
    let reads = 0
    const hostile = new Proxy(input, { getOwnPropertyDescriptor: (target, property) => property === 'sourceRows' ? { configurable: true, enumerable: true, writable: true, value: ++reads === 1 ? target.sourceRows : oversized } : Reflect.getOwnPropertyDescriptor(target, property) })
    const result = await captured(() => writeClinicImportStage({ bundle: hostile, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ reads, code: result.error?.code ?? null, files: await readdir(join(location.root, 'outside')) }).toEqual({ reads: 1, code: null, files: ['clinic-import.stage'] })
  })

  it('rebuilds nested metadata arrays from descriptors before relational validation', async () => {
    const location = await paths()
    const input = bundle()
    let reads = 0
    const sources = new Proxy([...input.externalIdentifiers[0].sources], { get: (target, property, receiver) => { reads += 1; return Reflect.get(target, property, receiver) } })
    const identifier = Object.freeze({ ...input.externalIdentifiers[0], sources })
    const changed = Object.freeze({ ...input, externalIdentifiers: Object.freeze([identifier]) })
    const result = await captured(() => writeClinicImportStage({ bundle: changed, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ reads, error: result.error?.code ?? null }).toEqual({ reads: 0, error: null })
  })

  it.each([
    ['missing entity', (value) => { value.invoices = []; value.report.invoices.total = 0; value.report.invoices.incomplete = 0; value.report.controls.invoices = 0 }],
    ['substituted payload', (value) => { value.invoices[0].payload = structuredClone(value.invoices[0].payload); value.invoices[0].payload.values.service_name = 'Другая услуга'; value.invoices[0].payloadHash = payloadHash(value.invoices[0].payload) }]
  ])('rejects an invoice source-row graph with a %s', async (_label, change) => {
    const location = await paths()
    const result = await captured(() => writeClinicImportStage({ bundle: changedBundle(change), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_INPUT', files: [] })
  })

  it.each([
    ['visit issue union', (value) => { value.historicalVisits[0].issueCodes = ['SHORT_ROW'] }],
    ['source row issue union', (value) => { value.sourceRows[0].issueCodes = ['SHORT_ROW'] }]
  ])('rejects forged %s metadata', async (_label, change) => {
    const location = await paths()
    const result = await captured(() => writeClinicImportStage({ bundle: changedBundle(change), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_INPUT', files: [] })
  })

  it('rejects a visit short-row issue absent from its source row', async () => {
    const location = await paths()
    const input = changedBundle((value) => { value.visitIssues.push({ id: '00000000-0000-8000-8000-000000000074', historicalVisitId: value.historicalVisits[0].id, code: 'SHORT_ROW', field: null }); value.historicalVisits[0].issueCodes = ['SHORT_ROW']; value.report.visits.shortRow = 1; value.visitEvidenceCounts.shortRow = 1; value.report.issues.visits = 1 })
    const result = await captured(() => writeClinicImportStage({ bundle: input, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_INPUT', files: [] })
  })

  it('rejects a source-row short-row issue absent from its visit', async () => {
    const location = await paths()
    const input = changedBundle((value) => { const row = value.sourceRows.find(({ sourceRole }) => sourceRole === 'visits'); row.payload.structuralIssues = [{ actualWidth: 10, code: 'SHORT_ROW', expectedWidth: 11 }]; row.payloadHash = payloadHash(row.payload); row.issueCodes = ['SHORT_ROW']; value.manifest.files.find(({ role }) => role === 'visits').structuralIssueCount = 1; value.manifest.sha256 = createHash('sha256').update(JSON.stringify({ version: 1, files: value.manifest.files })).digest('hex'); value.report.manifestHash = value.manifest.sha256 })
    const result = await captured(() => writeClinicImportStage({ bundle: input, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_INPUT', files: [] })
  })

  it.each([
    ['wrong code field', (value) => { value.visitIssues.push({ id: '00000000-0000-8000-8000-000000000071', historicalVisitId: value.historicalVisits[0].id, code: 'INVALID_START_DATE', field: 'comment' }); value.historicalVisits[0].issueCodes = ['INVALID_START_DATE']; value.report.visits.invalidStartDate = 1; value.visitEvidenceCounts.invalidStartDate = 1; value.report.issues.visits = 1 }],
    ['duplicate code field', (value) => { value.visitIssues.push({ id: '00000000-0000-8000-8000-000000000072', historicalVisitId: value.historicalVisits[0].id, code: 'CONTROL_CHAR_VALUE', field: 'comment' }, { id: '00000000-0000-8000-8000-000000000073', historicalVisitId: value.historicalVisits[0].id, code: 'CONTROL_CHAR_VALUE', field: 'comment' }); value.historicalVisits[0].issueCodes = ['CONTROL_CHAR_VALUE']; value.report.visits.controlCharValue = 2; value.visitEvidenceCounts.controlCharValue = 2; value.report.issues.visits = 2 }]
  ])('rejects visit issue metadata with a %s', async (_label, change) => {
    const location = await paths()
    const result = await captured(() => writeClinicImportStage({ bundle: changedBundle(change), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_INPUT', files: [] })
  })

  it('rejects an authenticated but relationally impossible plan while reading', async () => {
    const location = await paths()
    const written = await writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() })
    const planHash = await authenticatedMutation(location.stagePath, (plan) => { plan.report.visits.linked = 2 })
    const result = await captured(() => readClinicImportStage({ stagePath: location.stagePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY, expectedManifestHash: written.manifestHash, expectedPlanHash: planHash }))
    expect({ name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error) }).toEqual({ name: 'ClinicImportStageError', code: 'STAGE_INTEGRITY_FAILED', frozen: true })
  })

  it('rejects an authenticated stage whose primary birth-date fact no longer matches its control', async () => {
    const location = await paths()
    const written = await writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() })
    const planHash = await authenticatedMutation(location.stagePath, (plan) => { plan.sourceRows[0].birthDateValid = false })
    const result = await captured(() => readClinicImportStage({ stagePath: location.stagePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY, expectedManifestHash: written.manifestHash, expectedPlanHash: planHash }))
    expect({ name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error) }).toEqual({ name: 'ClinicImportStageError', code: 'STAGE_INTEGRITY_FAILED', frozen: true })
  })

  it('rejects an authenticated artifact whose valid logical content no longer matches its plan hash', async () => {
    const location = await paths()
    await writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() })
    const forgedPlanHash = await authenticatedMutation(location.stagePath, (plan) => { plan.patients[0].lastSeenAt = '2025-01-01T00:00:00.000Z' })
    const result = await captured(() => readClinicImportStage({ stagePath: location.stagePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY, expectedManifestHash: MANIFEST_HASH, expectedPlanHash: forgedPlanHash }))
    expect({ name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error) }).toEqual({ name: 'ClinicImportStageError', code: 'STAGE_INTEGRITY_FAILED', frozen: true })
  })

  it('rejects an authenticated plan containing an invalid private envelope', async () => {
    const location = await paths()
    const written = await writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() })
    const planHash = await authenticatedMutation(location.stagePath, (plan) => { const envelope = plan.patients[0].profileEnvelope; plan.patients[0].profileEnvelope = `${envelope.slice(0, -1)}${envelope.at(-1) === 'A' ? 'B' : 'A'}` })
    const result = await captured(() => readClinicImportStage({ stagePath: location.stagePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY, expectedManifestHash: written.manifestHash, expectedPlanHash: planHash }))
    expect({ name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error) }).toEqual({ name: 'ClinicImportStageError', code: 'STAGE_INTEGRITY_FAILED', frozen: true })
  })

  it('rejects magic serialization keys without invoking their values', async () => {
    const location = await paths()
    let reads = 0
    const input = structuredClone(bundle())
    Object.defineProperty(input.sourceRows[0].payload.values, '__proto__', { enumerable: true, value: Object.defineProperty({}, 'secret', { get: () => { reads += 1; return 'hook-secret' } }) })
    const result = await captured(() => writeClinicImportStage({ bundle: input, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    expect({ reads, code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ reads: 0, code: 'INPUT_TOO_COMPLEX', files: [] })
  })

  it('rejects an ancestor swap after publish and rolls back the linked stage', async () => {
    const location = await paths()
    const alternate = join(location.root, 'alternate')
    const alias = join(location.root, 'outside-alias')
    await mkdir(alternate)
    await symlink(join(location.root, 'outside'), alias)
    const result = await captured(() => writeClinicImportStage({ bundle: bundle(), stagePath: join(alias, 'clinic-import.stage'), databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource(), afterLink: async () => { await unlink(alias); await symlink(alternate, alias) } }))
    expect({ code: result.error?.code, original: await readdir(join(location.root, 'outside')), alternate: await readdir(alternate) }).toEqual({ code: 'INVALID_STAGE_PATH', original: [], alternate: [] })
  })

  it('rejects a same-size mutation of the published hard-link before reporting success', async () => {
    const location = await paths()
    const result = await captured(() => writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource(), afterLink: async () => { const bytes = await readFile(location.stagePath); bytes[0] ^= 1; await writeFile(location.stagePath, bytes) } }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'STAGE_INTEGRITY_FAILED', files: [] })
  })

  it('reauthorizes the original repository path immediately before linking', async () => {
    const location = await paths()
    const repositoryAlias = join(location.root, 'repository-alias')
    const alternateRepository = join(location.root, 'alternate-repository')
    await mkdir(alternateRepository)
    await symlink(location.repositoryPath, repositoryAlias)
    let swapped = false
    const fileSystem = Object.freeze({ link, lstat, realpath, unlink, open: async (...args) => { if (!swapped && String(args[0]).includes('.clinic-import-stage-')) { swapped = true; await unlink(repositoryAlias); await symlink(alternateRepository, repositoryAlias) } return open(...args) } })
    const result = await captured(() => writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: repositoryAlias, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource(), fileSystem }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_PATH', files: [] })
  })

  it('reauthorizes the original repository path after linking', async () => {
    const location = await paths()
    const repositoryAlias = join(location.root, 'repository-alias')
    const alternateRepository = join(location.root, 'alternate-repository')
    await mkdir(alternateRepository)
    await symlink(location.repositoryPath, repositoryAlias)
    const result = await captured(() => writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: repositoryAlias, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource(), afterLink: async () => { await unlink(repositoryAlias); await symlink(alternateRepository, repositoryAlias) } }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'INVALID_STAGE_PATH', files: [] })
  })

  it('gives cleanup failure precedence and never reports success after a failed private-temp unlink', async () => {
    const location = await paths()
    const fileSystem = Object.freeze({ link, lstat, open, realpath, unlink: async (target) => { await unlink(target); if (target.includes('.clinic-import-stage-')) throw new Error('synthetic cleanup failure') } })
    const result = await captured(() => writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource(), fileSystem }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'STAGE_CLEANUP_FAILED', files: [] })
  })

  it('keeps cleanup failure precedence over a simultaneous publish failure', async () => {
    const location = await paths()
    const fileSystem = Object.freeze({ lstat, open, realpath, link: async () => { throw new Error('synthetic publish failure') }, unlink: async (target) => { await unlink(target); throw new Error('synthetic cleanup failure') } })
    const result = await captured(() => writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource(), fileSystem }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'STAGE_CLEANUP_FAILED', files: [] })
  })

  it('never reports success when an injected unlink retains a private temporary file', async () => {
    const location = await paths()
    const fileSystem = Object.freeze({ link, lstat, open, realpath, unlink: async (target) => { if (!target.includes('.clinic-import-stage-')) await unlink(target) } })
    const result = await captured(() => writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource(), fileSystem }))
    const files = await readdir(join(location.root, 'outside'))
    expect({ code: result.error?.code, stageRetained: files.includes('clinic-import.stage'), temporaryRetained: files.some((name) => name.startsWith('.clinic-import-stage-')) }).toEqual({ code: 'STAGE_CLEANUP_FAILED', stageRetained: false, temporaryRetained: true })
  })

  it('gives an injected close cleanup failure precedence over the interrupted write', async () => {
    const location = await paths()
    const temporaryHandles = new WeakSet()
    const fileSystem = Object.freeze({ link, lstat, realpath, unlink, open: async (target, ...args) => { const handle = await open(target, ...args); if (String(target).includes('.clinic-import-stage-')) temporaryHandles.add(handle); return handle }, close: async (handle) => { await handle.close(); if (temporaryHandles.has(handle)) throw new Error('synthetic close failure') } })
    const result = await captured(() => writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource(), fileSystem }))
    expect({ code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ code: 'STAGE_CLEANUP_FAILED', files: [] })
  })

  it('rejects forged manifest hashes before creating a stage', async () => {
    const location = await paths()
    const forged = Object.freeze({ ...bundle(), manifest: Object.freeze({ version: 1, files: MANIFEST_FILES, sha256: 'd'.repeat(64) }) })
    const result = await captured(() => writeClinicImportStage({ bundle: forged, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }))
    expect({ name: result.error?.name, code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ name: 'ClinicImportStageError', code: 'INVALID_STAGE_INPUT', files: [] })
  })

  it('rejects extra fields and malformed safe fingerprints instead of copying them beside ciphertext', async () => {
    const location = await paths()
    const original = bundle()
    const identifier = Object.freeze({ ...original.externalIdentifiers[0], fingerprint: 'Скрытая Фамилия', leakedExtra: 'Скрытый адрес' })
    const unsafe = Object.freeze({ ...original, externalIdentifiers: Object.freeze([identifier]) })
    const result = await captured(() => writeClinicImportStage({ bundle: unsafe, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }))
    expect({ name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error), files: await readdir(join(location.root, 'outside')) }).toEqual({ name: 'ClinicImportStageError', code: 'INVALID_STAGE_INPUT', frozen: true, files: [] })
  })

  it('rejects an unmasked contact value in the safe mask position', async () => {
    const location = await paths()
    const original = bundle()
    const unsafe = Object.freeze({ ...original, contacts: Object.freeze([Object.freeze({ ...original.contacts[0], mask: '+79991112233' })]) })
    const result = await captured(() => writeClinicImportStage({ bundle: unsafe, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }))
    expect({ name: result.error?.name, code: result.error?.code, files: await readdir(join(location.root, 'outside')) }).toEqual({ name: 'ClinicImportStageError', code: 'INVALID_STAGE_INPUT', files: [] })
  })

  it('preserves unknown patient, contact, consent and name-history chronology as null', async () => {
    const location = await paths()
    const input = changedBundle((value) => { value.patients[0].firstSeenAt = null; value.patients[0].lastSeenAt = null; value.contacts[0].firstSeenAt = null; value.contacts[0].lastSeenAt = null; value.consents[0].observedAt = null; value.nameHistory[0].observedAt = null; value.nameHistory[0].reason = 'identity_alias' })
    const written = await writeClinicImportStage({ bundle: input, stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() })
    const opened = await readClinicImportStage({ stagePath: location.stagePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY, expectedManifestHash: written.manifestHash, expectedPlanHash: written.planHash })
    expect({ patient: [opened.plan.patients[0].firstSeenAt, opened.plan.patients[0].lastSeenAt], contact: [opened.plan.contacts[0].firstSeenAt, opened.plan.contacts[0].lastSeenAt], consent: opened.plan.consents[0].observedAt, name: opened.plan.nameHistory[0].observedAt }).toEqual({ patient: [null, null], contact: [null, null], consent: null, name: null })
  })

  it('never overwrites an existing stage and removes its private temporary file', async () => {
    const location = await paths()
    const reserved = Buffer.from('reserved-stage-bytes')
    await writeFile(location.stagePath, reserved)
    const result = await captured(() => writeClinicImportStage({ bundle: bundle(), stagePath: location.stagePath, databasePath: location.databasePath, repositoryPath: location.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
    const entries = await readdir(join(location.root, 'outside'))
    expect({ name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error), unchanged: (await readFile(location.stagePath)).equals(reserved), entries }).toEqual({ name: 'ClinicImportStageError', code: 'STAGE_WRITE_FAILED', frozen: true, unchanged: true, entries: ['clinic-import.stage'] })
  })
})
