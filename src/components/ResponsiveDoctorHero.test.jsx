import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ResponsiveDoctorHero } from './ResponsiveDoctorHero.jsx'

function createDoctors() {
  return [
    { slug: 'elkina-anna', name: 'Ёлкина Анна О’Коннор', specialization: 'Эндокринолог, нутрициолог', photo: '/images/doctors/elkina.webp', photoFull: '/images/doctors/elkina.png', photoMobile: '/images/doctors/elkina-mobile.webp', experienceYears: 14, dativeShortName: 'Анне О’Коннор', proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/ёлкина/', proDoctorovRating: { score: 4.9, reviewCount: 83 } },
    { slug: 'tsoy-yuriy', name: 'Цой Юрий Альбертович', specialization: 'Онколог-маммолог, врач УЗД', photo: '/images/doctors/tsoy.webp', photoFull: '/images/doctors/tsoy.png', photoMobile: '/images/doctors/tsoy-mobile.webp', experienceYears: 21, dativeShortName: 'Юрию Альбертовичу', proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/tsoy-yuriy/', proDoctorovRating: { score: 5, reviewCount: 117 } },
  ]
}

describe('ResponsiveDoctorHero', () => {
  it('presents two doctors as carousels with their exact accessible label', () => {
    const doctors = createDoctors()
    const label = 'Карусель эндокринологов'
    render(<ResponsiveDoctorHero doctors={doctors} label={label} ctaHref="/second-opinion" desktopClassName="md:block" desktopMedia="(min-width: 768px)" />)
    expect(screen.getAllByRole('region', { name: label }).map((region) => region.getAttribute('aria-roledescription'))).toEqual(['carousel', 'carousel'])
  })

  it('presents the desktop hero branch as the same carousel gated to the desktop media', () => {
    const doctors = createDoctors()
    const desktopClassName = 'hidden lg:block specialty-hero-desktop'
    const desktopMedia = '(min-width: 1024px)'
    const { container } = render(<ResponsiveDoctorHero doctors={doctors} label="Карусель маммологов" ctaHref="/consultation" desktopClassName={desktopClassName} desktopMedia={desktopMedia} />)
    const wrapper = container.querySelector('.specialty-hero-desktop')
    const region = within(wrapper).getByRole('region', { name: 'Карусель маммологов' })
    expect({ variant: region.dataset.variant, controls: within(region).getAllByRole('button', { name: /предыдущий врач|следующий врач/i }).length, media: region.querySelector('source')?.getAttribute('media'), booking: region.querySelector('[data-booking-doctor]')?.getAttribute('data-booking-doctor') }).toEqual({ variant: 'desktop', controls: 2, media: desktopMedia, booking: doctors[0].slug })
  })

  it('keeps the mobile carousel hidden on desktop next to the desktop variant', () => {
    const doctors = createDoctors()
    render(<ResponsiveDoctorHero doctors={doctors} label="Карусель гинекологов" ctaHref="/second-opinion" />)
    const regions = screen.getAllByRole('region', { name: 'Карусель гинекологов' })
    expect(regions.map((region) => ({ variant: region.dataset.variant, mobileOnly: region.classList.contains('md:hidden') }))).toEqual([{ variant: 'mobile', mobileOnly: true }, { variant: 'desktop', mobileOnly: false }])
  })

  it('keeps one doctor as a non-carousel hero fallback', () => {
    const doctor = createDoctors()[0]
    const { container } = render(<ResponsiveDoctorHero doctors={[doctor]} label="Карусель эндокринологов" ctaHref="/second-opinion" desktopClassName="hidden md:block single-hero-desktop" desktopMedia="(min-width: 768px)" />)
    const wrapper = container.querySelector('.single-hero-desktop')
    expect({ carousel: screen.queryByRole('region'), controls: screen.queryAllByRole('button', { name: /предыдущий врач|следующий врач/i }).length, heading: within(wrapper).getByRole('heading', { name: doctor.name }).textContent }).toEqual({ carousel: null, controls: 0, heading: doctor.name })
  })

  it('renders no doctor presentation for an empty collection', () => {
    const { container } = render(<ResponsiveDoctorHero doctors={[]} label="Пустая карусель" ctaHref="/second-opinion" desktopClassName="md:block" desktopMedia="(min-width: 768px)" />)
    expect(container.firstChild).toBeNull()
  })
})
