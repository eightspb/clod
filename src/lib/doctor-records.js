const MAX_DOCTORS = 50
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const SLUG = /^[a-z0-9-]{1,100}$/

export class DoctorRecordError extends Error {
  constructor(code) {
    super(code)
    this.name = 'DoctorRecordError'
    this.code = code
  }
}

function text(value, scope, maximum) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be text`)
  const normalized = value.trim()
  if (normalized.length < 1 || normalized.length > maximum) throw new TypeError(`${scope} is outside the allowed length`)
  return normalized
}

function doctor(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Doctor must be an object')
  const slug = text(value.slug, 'Doctor slug', 100)
  if (!SLUG.test(slug)) throw new TypeError('Doctor slug is invalid')
  if (!Number.isSafeInteger(value.medflexDoctorId) || value.medflexDoctorId < 1) throw new TypeError('Medflex doctor identifier is invalid')
  if (!Number.isInteger(value.experienceYears) || value.experienceYears < 0 || value.experienceYears > 80) throw new TypeError('Doctor experience is invalid')
  const photo = text(value.photo, 'Doctor photo', 500)
  if (!photo.startsWith('/images/doctors/')) throw new TypeError('Doctor photo is outside the curated directory')
  return Object.freeze({ slug, name: text(value.name, 'Doctor name', 200), specialization: text(value.specialization, 'Doctor specialization', 300), experienceYears: value.experienceYears, bio: text(value.bio, 'Doctor biography', 5000), photo, medflexDoctorId: value.medflexDoctorId, externalName: text(value.externalName, 'Medflex doctor name', 200) })
}

function command(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.doctors) || value.doctors.length > MAX_DOCTORS || typeof value.syncedAt !== 'string' || !ISO_TIMESTAMP.test(value.syncedAt)) throw new TypeError('Doctor synchronization command is invalid')
  const doctors = value.doctors.map(doctor)
  if (new Set(doctors.map((item) => item.slug)).size !== doctors.length || new Set(doctors.map((item) => item.medflexDoctorId)).size !== doctors.length) throw new TypeError('Doctor synchronization command contains duplicates')
  return Object.freeze({ doctors, syncedAt: value.syncedAt })
}

function rows(result) {
  if (result === null || typeof result !== 'object' || !Array.isArray(result.rows)) throw new DoctorRecordError('DOCTOR_STORAGE_INVARIANT')
  return result.rows
}

async function transaction(client, operation) {
  const value = await client.transaction('write')
  try {
    const result = await operation(value)
    await value.commit()
    return result
  } catch (error) {
    await value.rollback()
    throw error
  } finally {
    value.close()
  }
}

async function localIdentity(executor, item) {
  const linkedRows = rows(await executor.execute({ sql: 'SELECT l.localDoctorId, d.id AS doctorId FROM MedflexDoctorLink l LEFT JOIN Doctor d ON d.id = l.localDoctorId WHERE l.medflexDoctorId = ? LIMIT 2', args: [item.medflexDoctorId] }))
  if (linkedRows.length > 1) throw new DoctorRecordError('DOCTOR_STORAGE_INVARIANT')
  const linked = linkedRows[0]
  if (linked?.localDoctorId !== null && linked?.doctorId === null) throw new DoctorRecordError('DOCTOR_STORAGE_INVARIANT')
  const historicalRows = rows(await executor.execute({ sql: 'SELECT DISTINCT d.id AS doctorId FROM MedflexDoctorLink l JOIN Doctor d ON d.id = l.localDoctorId WHERE l.externalName = ? ORDER BY d.id LIMIT 3', args: [item.externalName] }))
  const historicalIdentifiers = new Set(historicalRows.map((row) => row.doctorId))
  if (historicalIdentifiers.size > 1) throw new DoctorRecordError('DOCTOR_IDENTITY_CONFLICT')
  const historicalDoctorId = historicalRows[0]?.doctorId ?? null
  if (linked?.doctorId && historicalDoctorId && linked.doctorId !== historicalDoctorId) throw new DoctorRecordError('DOCTOR_IDENTITY_CONFLICT')
  const linkedDoctorId = linked?.doctorId ?? historicalDoctorId
  const selected = rows(await executor.execute({ sql: 'SELECT id, name, slug FROM Doctor WHERE slug = ? OR name = ? ORDER BY id LIMIT 3', args: [item.slug, item.name] }))
  const identifiers = new Set(selected.map((row) => row.id))
  if (identifiers.size > 1) throw new DoctorRecordError('DOCTOR_IDENTITY_CONFLICT')
  if (linkedDoctorId) {
    if (identifiers.size === 1 && !identifiers.has(linkedDoctorId)) throw new DoctorRecordError('DOCTOR_IDENTITY_CONFLICT')
    return linkedDoctorId
  }
  return selected[0]?.id ?? null
}

async function insertDoctor(executor, item, syncedAt) {
  const id = `doctor-${item.slug}`
  const photoId = `doctor-seed-photo-${item.slug}`
  const filename = item.photo.split('/').at(-1)
  await executor.execute({ sql: 'INSERT INTO Media (id, filename, mimeType, url, folder, createdAt) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING', args: [photoId, filename, 'image/webp', item.photo, 'doctors', Date.parse(syncedAt)] })
  await executor.execute({ sql: 'INSERT INTO Doctor (id, name, slug, specialization, experienceYears, bio, photoMediaId) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [id, item.name, item.slug, item.specialization, item.experienceYears, item.bio, photoId] })
  return id
}

async function synchronize(client, raw) {
  const value = command(raw)
  return transaction(client, async (executor) => {
    await executor.execute({ sql: 'UPDATE MedflexDoctorLink SET active = ?, syncedAt = ?', args: [0, value.syncedAt] })
    let created = 0
    let preserved = 0
    for (const item of value.doctors) {
      let localDoctorId = await localIdentity(executor, item)
      if (localDoctorId === null) {
        localDoctorId = await insertDoctor(executor, item, value.syncedAt)
        created += 1
      } else preserved += 1
      await executor.execute({ sql: 'INSERT INTO MedflexDoctorLink (medflexDoctorId, externalName, localDoctorId, active, syncedAt) VALUES (?, ?, ?, ?, ?) ON CONFLICT(medflexDoctorId) DO UPDATE SET externalName = excluded.externalName, localDoctorId = excluded.localDoctorId, active = excluded.active, syncedAt = excluded.syncedAt', args: [item.medflexDoctorId, item.externalName, localDoctorId, 1, value.syncedAt] })
    }
    const total = rows(await executor.execute('SELECT COUNT(*) AS total FROM MedflexDoctorLink'))
    return Object.freeze({ active: value.doctors.length, created, preserved, total: Number(total[0]?.total ?? 0) })
  })
}

async function list(client) {
  const doctors = rows(await client.execute('SELECT d.id, d.name, d.slug, d.specialization, d.experienceYears, d.bio, m.url AS photoUrl FROM Doctor d LEFT JOIN Media m ON m.id = d.photoMediaId ORDER BY d.name, d.id'))
  const links = rows(await client.execute('SELECT medflexDoctorId, externalName, localDoctorId, active, syncedAt FROM MedflexDoctorLink WHERE localDoctorId IS NOT NULL ORDER BY localDoctorId, active DESC, syncedAt DESC, medflexDoctorId DESC'))
  const certificates = rows(await client.execute('SELECT c.id, c.doctorId, c.mediaId, c.title, c.sortOrder, m.url FROM DoctorCertificate c LEFT JOIN Media m ON m.id = c.mediaId ORDER BY c.doctorId, c.sortOrder, c.id'))
  const byDoctor = new Map()
  const linksByDoctor = new Map()
  for (const link of links) {
    const values = linksByDoctor.get(link.localDoctorId) ?? []
    values.push(Object.freeze({ medflexDoctorId: Number(link.medflexDoctorId), medflexName: link.externalName, active: link.active === 1, syncedAt: link.syncedAt }))
    linksByDoctor.set(link.localDoctorId, values)
  }
  for (const certificate of certificates) {
    const values = byDoctor.get(certificate.doctorId) ?? []
    values.push(Object.freeze({ id: certificate.id, mediaId: certificate.mediaId, title: certificate.title, sortOrder: Number(certificate.sortOrder), url: certificate.url ?? null }))
    byDoctor.set(certificate.doctorId, values)
  }
  return doctors.map((item) => {
    const medflexLinks = Object.freeze(linksByDoctor.get(item.id) ?? [])
    const current = medflexLinks[0]
    return Object.freeze({ id: item.id, name: item.name, slug: item.slug, specialization: item.specialization, experienceYears: Number(item.experienceYears), bio: item.bio, photoUrl: item.photoUrl ?? null, certificates: Object.freeze(byDoctor.get(item.id) ?? []), medflexDoctorId: current?.medflexDoctorId ?? null, medflexName: current?.medflexName ?? null, active: current?.active === true, syncedAt: current?.syncedAt ?? null, medflexLinks })
  })
}

/**
 * Creates the persistence boundary for the curated local doctor catalog.
 */
export function createDoctorRecords({ client }) {
  if (client === null || typeof client !== 'object' || typeof client.execute !== 'function' || typeof client.transaction !== 'function') throw new TypeError('Doctor records client is invalid')
  return Object.freeze({ list: () => list(client), sync: (input) => synchronize(client, input) })
}
