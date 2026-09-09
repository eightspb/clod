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
import ContactsRoute from '../pages/contacts.astro'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RelatedArticles } from '../components/RelatedArticles.jsx'

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
  const container = await AstroContainer.create({ renderers, astroConfig: { site: 'https://odintsovclinic.ru' } })
  container.addClientRenderer({ name: '@astrojs/react', entrypoint: '@astrojs/react/client.js' })
  return container.renderToString(Layout, { props: { pageDoctorSlug }, request: new Request(`https://odintsovclinic.ru/doctors/${pageDoctorSlug}`), slots: { default: '<p>Профиль врача</p>' }, partial: false })
}

async function renderDoctorRoute(slug) {
  const renderers = await loadRenderers([getContainerRenderer()])
  const container = await AstroContainer.create({ renderers, astroConfig: { site: 'https://odintsovclinic.ru' } })
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
  it('preserves the publication calendar date in related article cards', () => {
    const html = renderToStaticMarkup(createElement(RelatedArticles, { articles: [{ slug: 'kak-podgotovitsya-k-vab', title: 'Подготовка к ВАБ', publishDate: '2026-04-01T00:00:00.000Z' }] }))
    expect(load(html)('section').text()).toContain('1 апреля 2026')
  })

  it('identifies the doctor as the main entity of the profile page', async () => {
    const $ = load(await renderDoctorRoute('kalinina'))
    const nodes = $('script[type="application/ld+json"]').map((_index, node) => JSON.parse($(node).html())).get()
    const profile = nodes.find((node) => node['@type'] === 'ProfilePage')
    const person = nodes.find((node) => node['@type'] === 'Person')
    expect(profile?.mainEntity).toEqual({ '@id': person['@id'] })
  })

  it('does not assign landscape dimensions to a doctor portrait', async () => {
    const $ = load(await renderDoctorRoute('odintsov'))
    expect($('meta[property="og:image:height"]').attr('content')).toBeUndefined()
  })

  it('links the clinic, website and current page through stable identities', async () => {
    const $ = load(await renderLayout('prikhodko'))
    const nodes = $('script[type="application/ld+json"]').map((_index, node) => JSON.parse($(node).html())).get()
    const website = nodes.find((node) => node['@type'] === 'WebSite')
    const page = nodes.find((node) => node['@type'] === 'WebPage')
    expect({ publisher: website?.publisher, site: page?.isPartOf }).toEqual({ publisher: { '@id': 'https://odintsovclinic.ru/#clinic' }, site: { '@id': 'https://odintsovclinic.ru/#website' } })
  })

  it('describes a doctor as a person employed by the clinic', async () => {
    const $ = load(await renderDoctorRoute('kalinina'))
    const person = $('script[type="application/ld+json"]').map((_index, node) => JSON.parse($(node).html())).get().find((node) => node['@type'] === 'Person')
    expect({ id: person?.['@id'], employer: person?.worksFor?.['@id'] }).toEqual({ id: 'https://odintsovclinic.ru/doctors/kalinina#person', employer: 'https://odintsovclinic.ru/#clinic' })
  })

  it('renders only one clinic entity on the contacts route', async () => {
    const renderers = await loadRenderers([getContainerRenderer()])
    const container = await AstroContainer.create({ renderers, astroConfig: { site: 'https://odintsovclinic.ru' } })
    container.addClientRenderer({ name: '@astrojs/react', entrypoint: '@astrojs/react/client.js' })
    const $ = load(await container.renderToString(ContactsRoute, { request: new Request('https://odintsovclinic.ru/contacts'), partial: false }))
    const businesses = $('script[type="application/ld+json"]').map((_index, node) => JSON.parse($(node).html())).get().filter((node) => ['MedicalClinic', 'MedicalBusiness'].includes(node['@type']))
    expect(businesses.map((node) => node['@id'])).toEqual(['https://odintsovclinic.ru/#clinic'])
  })

  it('publishes MedicalBusiness without a self-declared rating and with assets that exist', async () => {
    const html = await renderLayout('')
    const $ = load(html)
    const business = $('script[type="application/ld+json"]').map((_index, node) => JSON.parse($(node).html())).get().find((node) => node['@type'] === 'MedicalBusiness')
    const ogImage = $('meta[property="og:image"]').attr('content')
    const localPath = (url) => join(process.cwd(), 'public', new URL(url).pathname)
    expect({ rating: business.aggregateRating, logo: existsSync(localPath(business.logo)), image: existsSync(localPath(business.image)), ogImage: existsSync(localPath(ogImage)) }).toEqual({ rating: undefined, logo: true, image: true, ogImage: true })
  })
})
