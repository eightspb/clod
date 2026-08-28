import { DOCTORS } from './doctors-data.js'
import { createDoctorRecords } from './doctor-records.js'
import { createMedflexClient } from './medflex-client.js'
import { discoverMedflexDoctors } from './medflex-doctors.js'

function configuration(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Doctor synchronization options are invalid')
  const records = input.records ?? createDoctorRecords({ client: input.client })
  const client = input.medflexClient ?? createMedflexClient()
  const discover = input.discover ?? discoverMedflexDoctors
  const websiteDoctors = input.websiteDoctors ?? DOCTORS
  const clock = input.clock ?? (() => new Date())
  if (records === null || typeof records !== 'object' || typeof records.sync !== 'function' || typeof records.list !== 'function' || client === null || typeof client !== 'object' || typeof discover !== 'function' || !Array.isArray(websiteDoctors) || typeof clock !== 'function') throw new TypeError('Doctor synchronization adapters are invalid')
  return Object.freeze({ records, client, discover, websiteDoctors, clock })
}

function seed(websiteDoctor, medflexDoctor) {
  return Object.freeze({ slug: websiteDoctor.slug, name: websiteDoctor.name, specialization: websiteDoctor.specialization, experienceYears: websiteDoctor.experienceYears, bio: websiteDoctor.bio, photo: websiteDoctor.photo, medflexDoctorId: medflexDoctor.id, externalName: medflexDoctor.name })
}

async function synchronize(options) {
  const discoveryClient = Object.freeze({ listDoctors: options.client.listDoctors, listLpus: options.client.listLpus })
  const report = await options.discover({ client: discoveryClient, websiteDoctors: options.websiteDoctors.map(({ slug, name }) => ({ slug, name })) })
  if (report === null || typeof report !== 'object' || !Array.isArray(report.doctors)) throw new TypeError('Medflex doctor discovery report is invalid')
  const websiteBySlug = new Map(options.websiteDoctors.map((doctor) => [doctor.slug, doctor]))
  const doctors = report.doctors.map((doctor) => {
    const websiteDoctor = websiteBySlug.get(doctor.slug)
    if (!websiteDoctor) throw new TypeError('Medflex doctor discovery contains an unknown doctor')
    return seed(websiteDoctor, doctor)
  })
  const syncedAt = options.clock().toISOString()
  const saved = await options.records.sync({ doctors, syncedAt })
  return Object.freeze({ report: saved, doctors: await options.records.list() })
}

/**
 * Creates the bounded Medflex-to-local-doctor synchronization workflow.
 */
export function createAdminDoctorSync(input) {
  const options = configuration(input)
  return Object.freeze({ sync: () => synchronize(options) })
}
