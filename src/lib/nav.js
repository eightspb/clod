export const DIRECTIONS = [
  { label: 'Маммология и ВАБ', to: '/mammology' },
  { label: 'Гинекология',      to: '/gynecology' },
  { label: 'Эндокринология',   to: '/endocrinology' },
  { label: 'Неврология',       to: '/neurology' },
]

export const NAV_ITEMS = [
  { label: 'Направления', children: DIRECTIONS },
  { label: 'Доктора',       to: '/doctors' },
  { label: 'Второе мнение', to: '/second-opinion' },
  { label: 'Цены',          to: '/prices' },
]

export const FOOTER_LINKS = [
  ...DIRECTIONS,
  { label: 'Второе мнение',    to: '/second-opinion' },
  { label: 'Цены и гарантии',  to: '/prices' },
]
