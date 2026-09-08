// @vitest-environment node
import { getContainerRenderer } from '@astrojs/react/container-renderer'
import { loadRenderers } from 'astro:container'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { load } from 'cheerio'
import { expect, it } from 'vitest'
import Vab from '../pages/vab.astro'
import Adenomioz from '../pages/adenomioz.astro'
import Endometrioz from '../pages/endometrioz.astro'
import Eroziya from '../pages/eroziya-sheyki-matki.astro'
import Fibroadenoma from '../pages/fibroadenoma.astro'
import Gipotireoz from '../pages/gipotireoz.astro'
import Kista from '../pages/kista-molochnoy-zhelezy.astro'
import Mastopatiya from '../pages/mastopatiya.astro'
import Tireoidit from '../pages/tireoidit-khashimoto.astro'
import SecondOpinion from '../pages/second-opinion.astro'

const CONDITIONS = [
  ['adenomioz', Adenomioz], ['endometrioz', Endometrioz], ['eroziya-sheyki-matki', Eroziya], ['fibroadenoma', Fibroadenoma],
  ['gipotireoz', Gipotireoz], ['kista-molochnoy-zhelezy', Kista], ['mastopatiya', Mastopatiya], ['tireoidit-khashimoto', Tireoidit],
]
const ROUTES = [...CONDITIONS.map(([slug, route]) => [slug, route, 'MedicalCondition', 'condition']), ['vab', Vab, 'MedicalProcedure', 'procedure']]

async function schemas(route, slug) {
  const renderers = await loadRenderers([getContainerRenderer()])
  const container = await AstroContainer.create({ renderers, astroConfig: { site: 'https://odintsovclinic.ru' } })
  container.addClientRenderer({ name: '@astrojs/react', entrypoint: '@astrojs/react/client.js' })
  const $ = load(await container.renderToString(route, { request: new Request(`https://odintsovclinic.ru/${slug}`), partial: false }))
  return $('script[type="application/ld+json"]').map((_index, node) => JSON.parse($(node).text())).get()
}

it.each(ROUTES)('links the medical page to its main entity on /%s', async (slug, route, type, fragment) => {
  const nodes = await schemas(route, slug)
  const entity = nodes.find((node) => node['@type'] === type)
  const page = nodes.find((node) => node['@type'] === 'MedicalWebPage')
  expect({ id: entity['@id'], url: entity.url, mainEntity: page?.mainEntity }).toEqual({ id: `https://odintsovclinic.ru/${slug}#${fragment}`, url: `https://odintsovclinic.ru/${slug}`, mainEntity: { '@id': `https://odintsovclinic.ru/${slug}#${fragment}` } })
})

it.each(ROUTES)('avoids claiming formal medical recognition by the clinic on /%s', async (slug, route, type) => {
  const entity = (await schemas(route, slug)).find((node) => node['@type'] === type)
  expect(entity.recognizingAuthority).toBeUndefined()
})

it('describes VAB through supported procedure properties and the percutaneous enumeration', async () => {
  const procedure = (await schemas(Vab, 'vab')).find((node) => node['@type'] === 'MedicalProcedure')
  const supported = new Set(['@context', '@type', '@id', 'url', 'name', 'alternateName', 'description', 'procedureType', 'bodyLocation', 'preparation', 'followup', 'howPerformed'])
  expect({ unsupported: Object.keys(procedure).filter((key) => !supported.has(key)), procedureType: procedure.procedureType }).toEqual({ unsupported: [], procedureType: 'https://schema.org/PercutaneousProcedure' })
})

it.each(CONDITIONS)('uses therapy types accepted by possibleTreatment on /%s', async (slug, route) => {
  const condition = (await schemas(route, slug)).find((node) => node['@type'] === 'MedicalCondition')
  expect(condition.possibleTreatment.every((treatment) => ['Drug', 'DrugClass', 'LifestyleModification', 'MedicalTherapy'].includes(treatment['@type']))).toBe(true)
})

it('describes a second opinion as a clinic service with its visible free offer', async () => {
  const nodes = await schemas(SecondOpinion, 'second-opinion')
  const service = nodes.find((node) => node['@type'] === 'Service')
  const page = nodes.find((node) => node['@type'] === 'MedicalWebPage')
  expect({ entity: service?.['@id'], provider: service?.provider, offer: service?.offers, mainEntity: page?.mainEntity }).toEqual({ entity: 'https://odintsovclinic.ru/second-opinion#service', provider: { '@id': 'https://odintsovclinic.ru/#clinic' }, offer: { '@type': 'Offer', price: '0', priceCurrency: 'RUB', url: 'https://odintsovclinic.ru/second-opinion' }, mainEntity: { '@id': 'https://odintsovclinic.ru/second-opinion#service' } })
})
