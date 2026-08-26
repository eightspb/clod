import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DoctorPage } from './DoctorPage.jsx'

const LEFT_PHOTO_DOCTOR = {
  slug: 'odintsov-layout',
  photo: '/images/doctors/odintsov.webp',
  photoFull: '/images/doctors/odintsov.png',
  photoAlign: 'left',
  name: 'Одинцов Владислав Александрович',
  dativeShortName: 'Владиславу Александровичу',
  specialization: 'Онколог-маммолог, врач УЗД, ДМН',
  experienceYears: 30,
  tagline: 'Главный врач клиники, доктор медицинских наук',
  proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/70120-odincov/',
  proDoctorovRating: { score: 5.0, reviewCount: 126 },
}

const RIGHT_PHOTO_DOCTOR = {
  ...LEFT_PHOTO_DOCTOR,
  slug: 'egorova-layout',
  photoAlign: 'right',
  name: 'Егорова Анастасия Александровна',
  experienceYears: 18,
}

describe('DoctorPage', () => {
  it('uses mirrored column widths when the photo is on the left', () => {
    render(<DoctorPage doctor={LEFT_PHOTO_DOCTOR} />)
    const grid = screen.getByRole('heading', { level: 1 }).parentElement.parentElement
    expect(grid).toHaveClass('lg:grid-cols-[minmax(360px,48%)_minmax(0,52%)]')
  })
  it('uses mirrored column widths when the photo is on the right', () => {
    render(<DoctorPage doctor={RIGHT_PHOTO_DOCTOR} />)
    const grid = screen.getByRole('heading', { level: 1 }).parentElement.parentElement
    expect(grid).toHaveClass('lg:grid-cols-[minmax(0,52%)_minmax(360px,48%)]')
  })
  it('renders enlarged desktop doctor photos', () => {
    render(<DoctorPage doctor={RIGHT_PHOTO_DOCTOR} />)
    const image = screen.getAllByRole('img', { name: /егорова анастасия/i })[0]
    expect(image).toHaveClass('lg:h-[630px]')
  })
  it('places the doctor photo above content on mobile layouts', () => {
    render(<DoctorPage doctor={RIGHT_PHOTO_DOCTOR} />)
    const grid = screen.getByRole('heading', { level: 1 }).parentElement.parentElement
    expect(grid.querySelector('img').parentElement).toHaveClass('order-1')
  })
  it('marks both profile booking actions with the public doctor slug', () => {
    const { container } = render(<DoctorPage doctor={LEFT_PHOTO_DOCTOR} />)
    const doctors = Array.from(container.querySelectorAll('[data-booking-btn]'), (trigger) => trigger.getAttribute('data-booking-doctor'))
    expect(doctors).toEqual(['odintsov-layout', 'odintsov-layout'])
  })
})
