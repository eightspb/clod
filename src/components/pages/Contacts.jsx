import { Bus, Car, Clock, ExternalLink, Mail, MapPin, MessageCircle, Navigation, Phone, Train } from 'lucide-react'
import { PHONE_DISPLAY, PHONE_NUMBER, PHONE_DISPLAY_2, PHONE_NUMBER_2, TELEGRAM_URL, VK_URL } from '../../lib/contacts.js'

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
    latitude: 60.001014,
    longitude: 30.251746,
  },
  hasMap: 'https://yandex.ru/maps/?pt=30.251746,60.001014&z=16&l=map',
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

      <section className="pt-6 pb-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl heading-display text-clay-dark leading-tight mb-4 speakable">
              Контакты клиники в Санкт-Петербурге
            </h1>
            <p className="text-clay-muted text-lg leading-relaxed">
              Приморский район, пр. Богатырский 22 к.1. Удобно добираться от м. Комендантский проспект, м. Старая Деревня и м. Пионерская.
            </p>
          </div>
          <div className="clay-card p-5">
            <p className="text-sm font-semibold text-clay-dark mb-3">Быстрая связь</p>
            <div className="grid gap-3">
              <a href={`tel:${PHONE_NUMBER}`} className="btn-clay-primary justify-center gap-2">
                <Phone size={16} />
                Позвонить
              </a>
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-clay-secondary justify-center gap-2">
                <MessageCircle size={16} />
                Telegram
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6 mb-6">

        <div className="clay-card p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="icon-circle-mint shrink-0">
              <MapPin size={20} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-clay-text mb-1">Адрес</div>
              <div className="text-clay-muted leading-relaxed">
                Санкт-Петербург,<br />
                Приморский район,<br />
                пр. Богатырский, д. 22, к. 1
              </div>
            </div>
          </div>
          <a
            href="https://yandex.ru/maps/?pt=30.251746,60.001014&z=16&l=map"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-clay-secondary text-sm inline-flex items-center gap-2 mt-2"
          >
            <Navigation size={15} />
            Открыть в Яндекс.Картах
          </a>
        </div>

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
          <div className="flex flex-wrap gap-3 mt-2">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-clay-secondary text-sm inline-flex items-center gap-2"
            >
              <MessageCircle size={15} />
              Telegram
            </a>
            <a
              href={VK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-clay-secondary text-sm inline-flex items-center gap-2"
            >
              <ExternalLink size={15} />
              ВКонтакте
            </a>
          </div>
        </div>

        <div className="clay-card p-6">
          <div className="flex items-start gap-3">
            <div className="icon-circle-blue shrink-0">
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-clay-text mb-3">Режим работы</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-6">
                  <span className="text-clay-muted">Понедельник-Пятница</span>
                  <span className="font-medium text-clay-text">9:00-20:00</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-clay-muted">Суббота-Воскресенье</span>
                  <span className="font-medium text-clay-text">10:00-18:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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

      <section className="mb-6">
        <h2 className="text-2xl heading-serif text-clay-dark mb-4">Как добраться</h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {METRO_STATIONS.map((station) => (
            <div key={station.name} className="clay-card p-4 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[14px] bg-[color:var(--accent-light)] text-[color:var(--accent)]">
                <Train size={18} />
              </div>
              <div className="font-medium text-clay-text text-sm mb-1">{station.name}</div>
              <div className="text-xs text-clay-muted mb-1">{station.line} линия</div>
              <div className="stat-pill">{station.walk} пешком</div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="clay-card p-5 text-sm text-clay-muted leading-relaxed">
            <div className="mb-3 flex items-center gap-2 font-semibold text-clay-text">
              <Car size={17} />
              На автомобиле
            </div>
            <p>Со стороны КАД - съезд на Богатырский проспект. Бесплатная парковка во дворе дома 22 к.1.</p>
          </div>
          <div className="clay-card p-5 text-sm text-clay-muted leading-relaxed">
            <div className="mb-3 flex items-center gap-2 font-semibold text-clay-text">
              <Bus size={17} />
              На общественном транспорте
            </div>
            <p>От метро «Комендантский проспект» - автобусы 93, 183 до остановки «Богатырский пр., 22». От метро «Старая Деревня» - маршрутка К-252.</p>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl heading-serif text-clay-dark mb-4">Карта</h2>
        <div 
          id="yandex-map-container"
          className="clay-card overflow-hidden relative cursor-pointer group bg-slate-50 h-[360px] md:h-[420px]"
        >
          <div 
            id="yandex-map-facade" 
            className="absolute inset-0 flex flex-col items-center justify-center z-10 transition-colors group-hover:bg-slate-100"
          >
            <div className="icon-circle-mint mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <MapPin size={28} className="text-white" />
            </div>
            <span className="text-clay-text font-semibold text-lg md:text-xl">Открыть карту проезда</span>
            <span className="text-clay-muted text-sm mt-2">Нажмите, чтобы загрузить Яндекс.Карты</span>
          </div>
          
          <div id="yandex-map-frame" className="w-full h-full" />
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', function() {
                var container = document.getElementById('yandex-map-container');
                var facade = document.getElementById('yandex-map-facade');
                var frameContainer = document.getElementById('yandex-map-frame');
                var isLoaded = false;

                if (container) {
                  container.addEventListener('click', function() {
                    if (isLoaded) return;
                    isLoaded = true;
                    
                    facade.style.display = 'none';
                    container.classList.remove('cursor-pointer', 'group');
                    
                    var iframe = document.createElement('iframe');
                    iframe.setAttribute('src', 'https://yandex.ru/map-widget/v1/?ll=30.251746%2C60.001014&z=16&pt=30.251746%2C60.001014,pm2rdm~&l=map');
                    iframe.setAttribute('width', '100%');
                    iframe.setAttribute('height', '100%');
                    iframe.setAttribute('frameborder', '0');
                    iframe.setAttribute('title', 'Карта - Клиника Одинцова, пр. Богатырский 22 к.1');
                    iframe.setAttribute('allowfullscreen', 'true');
                    iframe.setAttribute('loading', 'lazy');
                    
                    frameContainer.appendChild(iframe);
                  });
                }
              });
            `
          }}
        />
      </section>

      <section className="clay-card p-6 md:p-8">
        <h2 className="text-xl heading-serif text-clay-dark mb-4">Принимаем по ДМС</h2>
        <p className="text-clay-text mb-4">
          Принимаем пациентов по полисам добровольного медицинского страхования. Список программ и объём покрытия можно уточнить у администратора при записи:
        </p>
        <div className="flex flex-wrap gap-3">
          {['Ренессанс', 'АльфаСтрахование', 'ВСК', 'РЕСО-Гарантия'].map((ins) => (
            <span key={ins} className="bg-white/65 border border-white/80 rounded-2xl px-4 py-2 text-sm font-semibold text-clay-dark">
              {ins}
            </span>
          ))}
        </div>
        <p className="text-xs text-clay-muted mt-4">
          Уточните наличие вашей страховки у администратора по телефону или в Telegram.
        </p>
      </section>
    </div>
  )
}
