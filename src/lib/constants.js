// Shared constants used across multiple components

// Contact info
export const PHONE_NUMBER = '+78127482210'
export const PHONE_DISPLAY = '+7 (812) 748-22-10'
export const PHONE_NUMBER_2 = '+79119258022'
export const PHONE_DISPLAY_2 = '+7 (911) 925-80-22'
export const WHATSAPP_URL = 'https://wa.me/79119258022'
export const TELEGRAM_URL = 'https://t.me/odintsovclinic'

// Icon sizes
export const ICON_SIZES = {
  sm: 15,
  md: 18,
  lg: 22,
}

// Doctor ring color CSS class mapping — used in Doctors.jsx, DoctorPage.jsx, specialty pages
export const RING_COLOR_MAP = {
  mint: 'avatar-ring-mint',
  peach: 'avatar-ring-peach',
  blue: 'avatar-ring-blue',
  lavender: 'avatar-ring-lavender',
}

// Doctor filter matching logic — used in Doctors.jsx and Home.jsx
export function matchesFilter(doctor, filterId) {
  if (filterId === 'all') return true
  const spec = doctor.specialization.toLowerCase()
  if (filterId === 'mammology') return spec.includes('онколог') || spec.includes('хирург') || spec.includes('маммол')
  if (filterId === 'gynecology') return spec.includes('гинекол') || spec.includes('акушер')
  if (filterId === 'endocrinology') return spec.includes('эндокринол') || spec.includes('нутрицио')
  return false
}
