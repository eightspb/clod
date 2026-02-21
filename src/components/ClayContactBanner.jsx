function Donut({ style: posStyle }) {
  return (
    <div
      className="absolute"
      style={{
        ...posStyle,
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: '9px solid #ffffff',
        background: 'transparent',
        boxSizing: 'border-box',
        zIndex: 20,
        boxShadow:
          '0 6px 12px rgba(0, 60, 140, 0.3), inset 4px 4px 7px rgba(255, 255, 255, 0.85), inset -4px -4px 7px rgba(160, 165, 175, 0.6)',
      }}
    />
  )
}

function Sphere({ style: posStyle }) {
  return (
    <div
      className="absolute"
      style={{
        ...posStyle,
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        zIndex: 20,
        background: '#f4f6fa',
        boxShadow:
          '0 3px 8px rgba(0, 20, 60, 0.2), inset 0 -2px 4px rgba(0, 20, 60, 0.1), inset 0 2px 4px rgba(255, 255, 255, 0.9)',
      }}
    />
  )
}

function CloudButton() {
  return (
    <a
      href="tel:+78127482210"
      className="relative inline-block cursor-pointer select-none transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0.5"
      style={{ width: '185px', height: '80px' }}
    >
      {[
        { w: 28, h: 28, b: 34, l: 18 },
        { w: 36, h: 36, b: 38, l: 36 },
        { w: 44, h: 44, b: 35, l: 60 },
        { w: 34, h: 34, b: 38, r: 30 },
        { w: 26, h: 26, b: 34, r: 16 },
      ].map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: `${p.w}px`,
            height: `${p.h}px`,
            bottom: `${p.b}px`,
            ...(p.l !== undefined ? { left: `${p.l}px` } : {}),
            ...(p.r !== undefined ? { right: `${p.r}px` } : {}),
            borderRadius: '50%',
            background: '#f8f9fc',
            boxShadow: 'inset 0 -2px 5px rgba(0, 15, 40, 0.06), inset 0 2px 5px rgba(255, 255, 255, 0.95)',
            zIndex: 1,
          }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50px',
          borderRadius: '25px',
          background: '#f8f9fc',
          boxShadow:
            '0 6px 18px rgba(0, 20, 60, 0.15), 0 2px 6px rgba(0, 20, 60, 0.08), inset 0 -3px 8px rgba(0, 15, 40, 0.06), inset 0 3px 8px rgba(255, 255, 255, 0.95)',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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
      href="https://t.me/odintsovclinic"
      className="inline-flex items-center justify-center cursor-pointer select-none transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0.5"
      style={{
        padding: '17px 42px',
        borderRadius: '9999px',
        background: '#5a96e8',
        boxShadow:
          '0 8px 24px rgba(30, 60, 130, 0.35), 0 3px 8px rgba(30, 60, 130, 0.15), inset 0 -5px 12px rgba(10, 30, 80, 0.3), inset 0 4px 10px rgba(140, 190, 255, 0.35)',
      }}
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
        <div
          className="relative rounded-[28px] px-8 py-12 sm:py-14 flex flex-col items-center gap-8"
          style={{
            background: 'linear-gradient(140deg, #a8f0dc 0%, #90ccf0 42%, #6aacf0 70%, #4888e4 100%)',
            border: '3px solid rgba(255,255,255,0.45)',
            borderBottomColor: 'rgba(255,255,255,0.12)',
            borderRightColor: 'rgba(255,255,255,0.2)',
            boxShadow:
              '0 16px 40px rgba(0, 30, 80, 0.18), 0 6px 14px rgba(0, 30, 80, 0.08), inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 3px rgba(0,20,60,0.06)',
            overflow: 'visible',
          }}
        >
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
