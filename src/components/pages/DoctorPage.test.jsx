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
  it('stretches the desktop portrait across the content column height', () => {
    render(<DoctorPage doctor={RIGHT_PHOTO_DOCTOR} />)
    const image = screen.getAllByRole('img', { name: /егорова анастасия/i })[0]
    expect(image).toHaveClass('lg:absolute', 'lg:top-8', 'lg:h-[calc(100%-2rem)]')
  })
  it('keeps the profile heading at the smaller desktop size', () => {
    render(<DoctorPage doctor={RIGHT_PHOTO_DOCTOR} />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect({ large: heading.classList.contains('sm:text-4xl'), oversized: heading.classList.contains('md:text-5xl') }).toEqual({ large: true, oversized: false })
  })
  it('shows the ProDoctorov rating inside the reviews stat instead of a separate row', () => {
    render(<DoctorPage doctor={RIGHT_PHOTO_DOCTOR} />)
    const reviewsStat = screen.getByText('Отзывы').parentElement
    const links = screen.getAllByRole('link', { name: /продокторов/i })
    expect({ ratingInsideStat: reviewsStat.contains(links[0]), ratingLinks: links.length }).toEqual({ ratingInsideStat: true, ratingLinks: 1 })
  })
  it('links the reviews stat to ProDoctorov when only the profile URL is known', () => {
    render(<DoctorPage doctor={{ ...RIGHT_PHOTO_DOCTOR, proDoctorovRating: undefined }} />)
    const reviewsStat = screen.getByText('Отзывы').parentElement
    expect(reviewsStat.querySelector('a')).toHaveAttribute('href', RIGHT_PHOTO_DOCTOR.proDoctorovUrl)
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
