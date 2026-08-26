import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ResponsiveDoctorHero } from './ResponsiveDoctorHero.jsx'

const DOCTORS = Object.freeze([
  {
    slug: 'elkina-anna',
    name: 'Ёлкина Анна О’Коннор',
    specialization: 'Эндокринолог, нутрициолог',
    photo: '/images/doctors/elkina.webp',
    photoFull: '/images/doctors/elkina.png',
    photoMobile: '/images/doctors/elkina-mobile.webp',
    experienceYears: 14,
    dativeShortName: 'Анне О’Коннор',
    proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/ёлкина/',
    proDoctorovRating: { score: 4.9, reviewCount: 83 },
  },
  {
    slug: 'tsoy-yuriy',
    name: 'Цой Юрий Альбертович',
    specialization: 'Онколог-маммолог, врач УЗД',
    photo: '/images/doctors/tsoy.webp',
    photoFull: '/images/doctors/tsoy.png',
    photoMobile: '/images/doctors/tsoy-mobile.webp',
    experienceYears: 21,
    dativeShortName: 'Юрию Альбертовичу',
    proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/tsoy-yuriy/',
    proDoctorovRating: { score: 5, reviewCount: 117 },
  },
])

describe('ResponsiveDoctorHero', () => {
  it('presents two doctors as a carousel with its exact accessible label', () => {
    const label = 'Карусель эндокринологов'
    render(<ResponsiveDoctorHero doctors={DOCTORS} label={label} ctaHref="/second-opinion" desktopClassName="md:block" desktopMedia="(min-width: 768px)" />)
    expect(screen.getByRole('region', { name: label })).toHaveAttribute('aria-roledescription', 'carousel')
  })

  it('keeps the desktop hero branch in its supplied wrapper with CTA and portrait media', () => {
    const desktopClassName = 'hidden lg:block specialty-hero-desktop'
    const desktopMedia = '(min-width: 1024px)'
    const { container } = render(<ResponsiveDoctorHero doctors={DOCTORS} label="Карусель маммологов" ctaHref="/consultation" desktopClassName={desktopClassName} desktopMedia={desktopMedia} />)
    const wrapper = container.querySelector('.specialty-hero-desktop')
    expect({ hero: Boolean(wrapper?.querySelector('.hero-doctor-card')), cta: within(wrapper).getByRole('link', { name: /записаться к анне/i }).getAttribute('href'), media: wrapper?.querySelector('source')?.getAttribute('media') }).toEqual({ hero: true, cta: '/consultation', media: desktopMedia })
  })

  it('keeps one doctor as a non-carousel hero fallback', () => {
    const { container } = render(<ResponsiveDoctorHero doctors={DOCTORS.slice(0, 1)} label="Карусель эндокринологов" ctaHref="/second-opinion" desktopClassName="md:block" desktopMedia="(min-width: 768px)" />)
    expect({ carousel: screen.queryByRole('region'), controls: screen.queryAllByRole('button', { name: /предыдущий врач|следующий врач/i }).length, hero: Boolean(container.querySelector('.hero-doctor-card')) }).toEqual({ carousel: null, controls: 0, hero: true })
  })

  it('renders no doctor presentation for an empty collection', () => {
    const { container } = render(<ResponsiveDoctorHero doctors={[]} label="Пустая карусель" ctaHref="/second-opinion" desktopClassName="md:block" desktopMedia="(min-width: 768px)" />)
    expect(container.firstChild).toBeNull()
  })
})
