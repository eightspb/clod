// @vitest-environment node

import { getContainerRenderer } from '@astrojs/react'
import { load } from 'cheerio'
import { loadRenderers } from 'astro:container'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import DoctorRoute from '../pages/doctors/[slug].astro'
import Layout from './Layout.astro'

const PUBLIC_DOCTOR_KEYS = Object.freeze(['name', 'photo', 'slug', 'specialization'])
const PUBLIC_DOCTOR_SLUGS = Object.freeze(['odintsov', 'prikhodko', 'macuchov', 'skurihin', 'egorova', 'vlasenko', 'zaharova', 'nevzorova', 'kalinina'])
const OLD_WIDGET_RUNTIME = Object.freeze(['booking.medflex.ru', 'medflexRoundWidgetData', 'round_widget_button', '__medflexLoaded', 'medflex-round-widget__button'])

function deserialize(value) {
  const [type, data] = value
  if (type === 0 && typeof data === 'object' && data !== null) return Object.fromEntries(Object.entries(data).map(([key, entry]) => [key, deserialize(entry)]))
  if (type === 0) return data
  if (type === 1) return data.map(deserialize)
  throw new Error(`Unsupported Astro property type in Layout test: ${type}`)
}

function deserializeProps(raw) {
  if (!raw) return {}
  return Object.fromEntries(Object.entries(JSON.parse(raw)).map(([key, value]) => [key, deserialize(value)]))
}

async function renderLayout(pageDoctorSlug) {
  const renderers = await loadRenderers([getContainerRenderer()])
  const container = await AstroContainer.create({ renderers })
  container.addClientRenderer({ name: '@astrojs/react', entrypoint: '@astrojs/react/client.js' })
  return container.renderToString(Layout, { props: { pageDoctorSlug }, request: new Request(`https://odintsovclinic.ru/doctors/${pageDoctorSlug}`), slots: { default: '<p>Профиль врача</p>' }, partial: false })
}

async function renderDoctorRoute(slug) {
  const renderers = await loadRenderers([getContainerRenderer()])
  const container = await AstroContainer.create({ renderers })
  container.addClientRenderer({ name: '@astrojs/react', entrypoint: '@astrojs/react/client.js' })
  return container.renderToString(DoctorRoute, { params: { slug }, request: new Request(`https://odintsovclinic.ru/doctors/${slug}`), partial: false })
}

describe('Layout booking flow', () => {
  it('mounts one first-party island with only public doctors and page context', async () => {
    const html = await renderLayout('egorova')
    const $ = load(html)
    const islands = $('astro-island[component-export="BookingFlow"]')
    const props = deserializeProps(islands.first().attr('props'))
    const contract = { islands: islands.length, pageDoctorSlug: props.pageDoctorSlug, slugs: props.doctors?.map((doctor) => doctor.slug), keys: props.doctors?.map((doctor) => Object.keys(doctor).sort()), oldRuntime: OLD_WIDGET_RUNTIME.filter((value) => html.includes(value)) }
    expect(contract).toEqual({ islands: 1, pageDoctorSlug: 'egorova', slugs: PUBLIC_DOCTOR_SLUGS, keys: PUBLIC_DOCTOR_SLUGS.map(() => PUBLIC_DOCTOR_KEYS), oldRuntime: [] })
  })

  it('passes the doctor route slug as page booking context', async () => {
    const html = await renderDoctorRoute('egorova')
    const $ = load(html)
    const props = deserializeProps($('astro-island[component-export="BookingFlow"]').attr('props'))
    const general = $('astro-island[component-export="Header"] [data-booking-btn], astro-island[component-export="StickyCTA"] [data-booking-btn]')
    expect({ pageDoctorSlug: props.pageDoctorSlug, generalCount: general.length, explicitDoctors: general.map((_index, trigger) => $(trigger).attr('data-booking-doctor')).get() }).toEqual({ pageDoctorSlug: 'egorova', generalCount: 2, explicitDoctors: [] })
  })
})

describe('Layout structured data', () => {
  it('publishes MedicalBusiness without a self-declared rating and with assets that exist', async () => {
    const html = await renderLayout('')
    const $ = load(html)
    const business = $('script[type="application/ld+json"]').map((_index, node) => JSON.parse($(node).html())).get().find((node) => node['@type'] === 'MedicalBusiness')
    const ogImage = $('meta[property="og:image"]').attr('content')
    const localPath = (url) => join(process.cwd(), 'public', new URL(url).pathname)
    expect({ rating: business.aggregateRating, logo: existsSync(localPath(business.logo)), image: existsSync(localPath(business.image)), ogImage: existsSync(localPath(ogImage)) }).toEqual({ rating: undefined, logo: true, image: true, ogImage: true })
  })
})
