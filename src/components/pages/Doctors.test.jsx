import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DOCTORS } from '../../lib/doctors-data.js'
import { Doctors } from './Doctors.jsx'

function follows(first, second) {
  return Boolean(first && second && (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING))
}

function readDoctorCollectionSnapshot() {
  const heading = screen.queryByRole('heading', { level: 1, name: 'Ваши доктора' })
  const filters = screen.queryByRole('group', { name: 'Фильтр врачей по специальности' })
  const carousel = screen.queryByRole('region', { name: 'Мобильная карусель врачей' })
  const desktopGrid = document.querySelector('[data-doctors-desktop-grid]')
  const editorial = screen.queryByRole('heading', { level: 2, name: 'Врачи клиники Одинцова' })
  return {
    levelOneHeadings: screen.queryAllByRole('heading', { level: 1 }).map((element) => element.textContent),
    selectionHeadingPresent: heading !== null,
    filtersPresent: filters !== null,
    carouselPresent: carousel !== null,
    desktopGridPresent: desktopGrid !== null,
    editorialPresent: editorial !== null,
    headingBeforeFilters: follows(heading, filters),
    filtersBeforeCarousel: follows(filters, carousel),
    filtersBeforeDesktopGrid: follows(filters, desktopGrid),
    carouselBeforeEditorial: follows(carousel, editorial),
    desktopGridBeforeEditorial: follows(desktopGrid, editorial),
  }
}

function readAnnouncementSnapshot(element) {
  return element && {
    text: element.textContent,
    className: element.classList.contains('sr-only'),
    ariaLive: element.getAttribute('aria-live'),
    ariaAtomic: element.getAttribute('aria-atomic'),
  }
}

function readDoctorResultSnapshot() {
  const initialResultCount = `Показываем ${DOCTORS.length} из ${DOCTORS.length} специалистов`
  const initialAnnouncement = screen.queryByText(initialResultCount)
  const initialSnapshot = readAnnouncementSnapshot(initialAnnouncement)
  const gynecologyFilter = screen.queryByRole('button', { name: /гинекология/i })
  if (gynecologyFilter) fireEvent.click(gynecologyFilter)
  const filteredDoctorCount = DOCTORS.filter((doctor) => doctor.specialization.toLowerCase().includes('гинеколог')).length
  const filteredResultCount = `Показываем ${filteredDoctorCount} из ${DOCTORS.length} специалистов`
  return {
    initialAnnouncement: initialSnapshot,
    filteredAnnouncement: readAnnouncementSnapshot(screen.queryByText(filteredResultCount)),
    filterPresent: gynecologyFilter !== null,
    filterHeadingVisible: screen.queryByRole('heading', { name: 'Выберите специализацию' }) !== null,
  }
}

const EXPECTED_DOCTOR_COLLECTION = {
  levelOneHeadings: ['Ваши доктора'],
  selectionHeadingPresent: true,
  filtersPresent: true,
  carouselPresent: true,
  desktopGridPresent: true,
  editorialPresent: true,
  headingBeforeFilters: true,
  filtersBeforeCarousel: true,
  filtersBeforeDesktopGrid: true,
  carouselBeforeEditorial: true,
  desktopGridBeforeEditorial: true,
}

const EXPECTED_ANNOUNCEMENT = {
  initialAnnouncement: { text: `Показываем ${DOCTORS.length} из ${DOCTORS.length} специалистов`, className: true, ariaLive: 'polite', ariaAtomic: 'true' },
  filteredAnnouncement: { text: `Показываем ${DOCTORS.filter((doctor) => doctor.specialization.toLowerCase().includes('гинеколог')).length} из ${DOCTORS.length} специалистов`, className: true, ariaLive: 'polite', ariaAtomic: 'true' },
  filterPresent: true,
  filterHeadingVisible: false,
}

describe('Doctors page collections', () => {
  it('renders every doctor in the mobile carousel', () => {
    const { container } = render(<Doctors />)
    expect(container.querySelectorAll('.mobile-doctor-slide')).toHaveLength(DOCTORS.length)
  })

  it('labels the mobile collection for patients', () => {
    render(<Doctors />)
    expect(screen.getByRole('region', { name: 'Мобильная карусель врачей' })).toBeInTheDocument()
  })

  it('starts with every doctor without an all-doctors filter', () => {
    const { container } = render(<Doctors />)
    expect({
      allDoctorsFilter: screen.queryByRole('button', { name: 'Все доктора' }),
      mobileSlides: container.querySelectorAll('.mobile-doctor-slide').length,
    }).toEqual({ allDoctorsFilter: null, mobileSlides: DOCTORS.length })
  })

  it('filters doctors by specialty', () => {
    render(<Doctors />)
    const gynecologyFilter = screen.getByRole('button', { name: /гинекология/i })
    fireEvent.click(gynecologyFilter)
    expect({
      ariaPressed: gynecologyFilter.getAttribute('aria-pressed'),
      matchingDoctors: screen.getAllByText('Захарова Татьяна Николаевна').length,
      excludedDoctorPresent: screen.queryByText('Приходько Кирилл Андреевич') !== null,
    }).toEqual({ ariaPressed: 'true', matchingDoctors: 1, excludedDoctorPresent: false })
  })

  it('restores every doctor when the active specialty is toggled off', () => {
    const { container } = render(<Doctors />)
    const gynecologyFilter = screen.getByRole('button', { name: /гинекология/i })
    fireEvent.click(gynecologyFilter)
    fireEvent.click(gynecologyFilter)
    expect({
      ariaPressed: gynecologyFilter.getAttribute('aria-pressed'),
      mobileSlides: container.querySelectorAll('.mobile-doctor-slide').length,
    }).toEqual({ ariaPressed: 'false', mobileSlides: DOCTORS.length })
  })

  it('puts doctor selection before the clinic editorial block', () => {
    render(<Doctors />)
    expect(readDoctorCollectionSnapshot()).toEqual(EXPECTED_DOCTOR_COLLECTION)
  })

  it('announces the filtered result count without a visible filter heading', () => {
    render(<Doctors />)
    expect(readDoctorResultSnapshot()).toEqual(EXPECTED_ANNOUNCEMENT)
  })
})
