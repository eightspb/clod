import { SITE_URL } from './constants.js'
import { PHONE_NUMBER, MAX_URL, VK_URL, PRODOCTOROV_CLINIC_URL, YANDEX_CLINIC_URL } from './contacts.js'

export function canonicalUrl(value) {
  const url = new URL(value, `${SITE_URL}/`)
  if (url.origin !== SITE_URL) throw new TypeError('Canonical URL must use the clinic origin')
  return `${SITE_URL}${url.pathname.replace(/\/+$/, '') || '/'}`
}

export function sitemapPage(value) {
  const { pathname } = new URL(value)
  return !/^\/(?:admin|api|404|blog-images)(?:\/|$)/.test(pathname)
}

export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export const CLINIC_SCHEMA = Object.freeze({
  '@context': 'https://schema.org',
  '@type': 'MedicalBusiness',
  '@id': `${SITE_URL}/#clinic`,
  name: 'Клиника Одинцова',
  alternateName: 'Клиника доктора Одинцова',
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/images/logo.png`,
  image: `${SITE_URL}/images/og/index.webp`,
  telephone: PHONE_NUMBER,
  email: 'info@odintsovclinic.ru',
  currenciesAccepted: 'RUB',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'пр. Богатырский, д. 22, к. 1',
    addressLocality: 'Санкт-Петербург',
    postalCode: '197374',
    addressRegion: 'Санкт-Петербург',
    addressCountry: 'RU',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 60.001014, longitude: 30.251746 },
  hasMap: 'https://yandex.ru/maps/?pt=30.251746,60.001014&z=16&l=map',
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '20:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday', 'Sunday'], opens: '10:00', closes: '18:00' },
  ],
  areaServed: [
    { '@type': 'City', name: 'Санкт-Петербург' },
    { '@type': 'AdministrativeArea', name: 'Ленинградская область' },
  ],
  sameAs: [MAX_URL, VK_URL, PRODOCTOROV_CLINIC_URL, 'https://2gis.ru/spb/firm/70000001007194493', YANDEX_CLINIC_URL],
})

export const WEBSITE_SCHEMA = Object.freeze({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: 'Клиника Одинцова',
  alternateName: 'Клиника доктора Одинцова',
  inLanguage: 'ru-RU',
  publisher: { '@id': CLINIC_SCHEMA['@id'] },
})
