import { PHONE_NUMBER, TELEGRAM_URL } from '../lib/contacts.js'

function Donut({ style: posStyle }) {
  return (
    <div
      className="absolute clay-banner-donut"
      style={posStyle}
    />
  )
}

function Sphere({ style: posStyle }) {
  return (
    <div
      className="absolute clay-banner-sphere"
      style={posStyle}
    />
  )
}

const CLOUD_PUFFS = [
  { w: 28, h: 28, b: 34, l: 18 },
  { w: 36, h: 36, b: 38, l: 36 },
  { w: 44, h: 44, b: 35, l: 60 },
  { w: 34, h: 34, b: 38, r: 30 },
  { w: 26, h: 26, b: 34, r: 16 },
]

function CloudButton() {
  return (
    <a
      href={`tel:${PHONE_NUMBER}`}
      className="relative inline-block cursor-pointer select-none transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0.5"
      style={{ width: '185px', height: '80px' }}
    >
      {CLOUD_PUFFS.map((p, i) => (
        <div
          key={i}
          className="clay-banner-cloud-puff"
          style={{
            width: `${p.w}px`,
            height: `${p.h}px`,
            bottom: `${p.b}px`,
            ...(p.l !== undefined ? { left: `${p.l}px` } : {}),
            ...(p.r !== undefined ? { right: `${p.r}px` } : {}),
          }}
        />
      ))}

      <div className="clay-banner-cloud-base">
        <span style={{ fontWeight: 600, fontSize: '16px', color: '#1a2540', position: 'relative', zIndex: 5 }}>
          Позвонить
        </span>
      </div>
    </a>
  )
}

function TelegramButton() {
  return (
    <a
      href={TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="clay-banner-telegram-btn inline-flex items-center justify-center cursor-pointer select-none transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0.5"
    >
      <span style={{ fontWeight: 700, fontSize: '18px', color: 'white', letterSpacing: '0.01em' }}>
        Telegram
      </span>
    </a>
  )
}

export function ClayContactBanner() {
  return (
    <section className="section">
      <div className="container-clay">
        <div className="clay-banner-bg relative rounded-[28px] px-8 py-8 sm:py-10 flex flex-col items-center gap-6">
          <Donut style={{ top: '16px', left: '16px' }} />
          <Sphere style={{ top: '20px', right: '60px' }} />
          <Donut style={{ top: '14px', right: '16px' }} />
          <Donut style={{ bottom: '16px', left: '16px' }} />
          <Donut style={{ bottom: '16px', right: '16px' }} />

          <h2
            className="text-2xl sm:text-3xl font-extrabold text-center relative z-10 leading-tight"
            style={{ color: '#111c35', textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            Не знаете к кому обратиться?
          </h2>

          <div className="flex flex-wrap items-end justify-center gap-8 relative z-10">
            <CloudButton />
            <TelegramButton />
          </div>
        </div>
      </div>
    </section>
  )
}

export default ClayContactBanner
