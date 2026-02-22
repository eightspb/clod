import { MapPin, Phone, Clock, MessageCircle, Mail, Navigation } from 'lucide-react'
import { PHONE_DISPLAY, PHONE_NUMBER, PHONE_DISPLAY_2, PHONE_NUMBER_2, WHATSAPP_URL, TELEGRAM_URL, ADDRESS, HOURS_WEEKDAY, HOURS_WEEKEND } from '../../lib/contacts.js'

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalBusiness',
  name: 'Клиника Одинцова',
  url: 'https://odintsovclinic.ru',
  telephone: '+78127482210',
  email: 'info@odintsovclinic.ru',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'пр. Богатырский, д. 22, к. 1',
    addressLocality: 'Санкт-Петербург',
    postalCode: '197374',
    addressRegion: 'Санкт-Петербург',
    addressCountry: 'RU',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 60.0028,
    longitude: 30.2153,
  },
  hasMap: 'https://yandex.ru/maps/-/CHdGkBYD',
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '20:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday', 'Sunday'],
      opens: '10:00',
      closes: '18:00',
    },
  ],
}

const METRO_STATIONS = [
  { name: 'Комендантский проспект', line: 'Фиолетовая', walk: '12 мин' },
  { name: 'Старая Деревня', line: 'Фиолетовая', walk: '15 мин' },
  { name: 'Пионерская', line: 'Синяя', walk: '18 мин' },
]

export function Contacts() {
  return (
    <div className="container-clay pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      <section className="pt-6 pb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-clay-text mb-3 speakable">
          Контакты клиники в Санкт-Петербурге
        </h1>
        <p className="text-clay-muted text-lg">
          Мы находимся на северо-западе Санкт-Петербурга, в пешей доступности от трёх станций метро
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-6 mb-6">

        {/* Адрес */}
        <div className="clay-card p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="icon-circle-mint shrink-0">
              <MapPin size={20} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-clay-text mb-1">Адрес</div>
              <div className="text-clay-muted leading-relaxed">
                Санкт-Петербург,<br />
                пр. Богатырский, д. 22, к. 1
              </div>
            </div>
          </div>
          <a
            href="https://yandex.ru/maps/-/CHdGkBYD"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-clay-secondary text-sm inline-flex items-center gap-2 mt-2"
          >
            <Navigation size={15} />
            Открыть в Яндекс.Картах
          </a>
        </div>

        {/* Телефоны */}
        <div className="clay-card p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="icon-circle-peach shrink-0">
              <Phone size={20} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-clay-text mb-2">Телефоны</div>
              <a href={`tel:${PHONE_NUMBER}`} className="block text-clay-teal font-medium hover:underline mb-1">
                {PHONE_DISPLAY}
              </a>
              <a href={`tel:${PHONE_NUMBER_2}`} className="block text-clay-teal font-medium hover:underline">
                {PHONE_DISPLAY_2}
              </a>
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-clay-secondary text-sm inline-flex items-center gap-2"
            >
              <MessageCircle size={15} />
              WhatsApp
            </a>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-clay-secondary text-sm inline-flex items-center gap-2"
            >
              Telegram
            </a>
          </div>
        </div>

        {/* Режим работы */}
        <div className="clay-card p-6">
          <div className="flex items-start gap-3">
            <div className="icon-circle-blue shrink-0">
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-clay-text mb-3">Режим работы</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-6">
                  <span className="text-clay-muted">Понедельник–Пятница</span>
                  <span className="font-medium text-clay-text">9:00–20:00</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-clay-muted">Суббота–Воскресенье</span>
                  <span className="font-medium text-clay-text">10:00–18:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="clay-card p-6">
          <div className="flex items-start gap-3">
            <div className="icon-circle-lavender shrink-0">
              <Mail size={20} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-clay-text mb-2">Email</div>
              <a href="mailto:info@odintsovclinic.ru" className="text-clay-teal hover:underline">
                info@odintsovclinic.ru
              </a>
              <div className="text-xs text-clay-muted mt-2">
                Для вопросов и документов. Ответим в течение рабочего дня.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Как добраться */}
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-clay-text mb-4">Как добраться</h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {METRO_STATIONS.map((station) => (
            <div key={station.name} className="clay-card p-4 text-center">
              <div className="text-2xl mb-2">🚇</div>
              <div className="font-medium text-clay-text text-sm mb-1">{station.name}</div>
              <div className="text-xs text-clay-muted mb-1">{station.line} линия</div>
              <div className="stat-pill">{station.walk} пешком</div>
            </div>
          ))}
        </div>
        <div className="clay-card p-5 text-sm text-clay-muted leading-relaxed">
          <strong className="text-clay-text">На автомобиле:</strong> со стороны КАД — съезд на Богатырский проспект.
          Парковка бесплатная во дворе дома 22 к.1.
          <br /><br />
          <strong className="text-clay-text">На общественном транспорте:</strong> от метро «Комендантский проспект» — автобусы 93, 183 до остановки «Богатырский пр., 22».
          От метро «Старая Деревня» — маршрутка К-252.
        </div>
      </section>

      {/* Карта */}
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-clay-text mb-4">Карта</h2>
        <div className="clay-card overflow-hidden" style={{ height: '400px' }}>
          <iframe
            src="https://yandex.ru/map-widget/v1/?ll=30.215300%2C60.002800&z=16&pt=30.215300%2C60.002800,pm2rdm~&l=map"
            width="100%"
            height="100%"
            frameBorder="0"
            title="Карта — Клиника Одинцова, пр. Богатырский 22 к.1"
            loading="lazy"
            allowFullScreen
          />
        </div>
      </section>

      {/* ДМС */}
      <section className="clay-card-mint p-6 md:p-8">
        <h2 className="text-xl font-bold text-white mb-4">Работаем по ДМС</h2>
        <p className="text-white/85 mb-4">
          Принимаем пациентов по полисам добровольного медицинского страхования следующих компаний:
        </p>
        <div className="flex flex-wrap gap-3">
          {['Ренессанс', 'АльфаСтрахование', 'ВСК', 'РЕСО-Гарантия'].map((ins) => (
            <span key={ins} className="bg-white/20 rounded-2xl px-4 py-2 text-sm font-semibold text-white">
              {ins}
            </span>
          ))}
        </div>
        <p className="text-xs text-white/70 mt-4">
          Уточните наличие вашей страховки у администратора по телефону или в WhatsApp.
        </p>
      </section>
    </div>
  )
}
