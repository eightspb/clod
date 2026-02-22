export const DIRECTIONS = [
  { label: 'Маммология',       to: '/mammology' },
  { label: 'ВАБ',              to: '/vab' },
  { label: 'Гинекология',      to: '/gynecology' },
  { label: 'Эндокринология',   to: '/endocrinology' },
  { label: 'Неврология',       to: '/neurology' },
]

export const NAV_ITEMS = [
  { label: 'О клинике',     to: '/about' },
  { label: 'Направления', children: DIRECTIONS },
  { label: 'Доктора',       to: '/doctors' },
  { label: 'Второе мнение', to: '/second-opinion' },
  { label: 'Цены',          to: '/prices' },
  { label: 'Блог',          to: '/blog' },
  { label: 'Контакты',      to: '/contacts' },
]

export const FOOTER_LINKS = [
  ...DIRECTIONS,
  { label: 'О клинике',        to: '/about' },
  { label: 'Второе мнение',    to: '/second-opinion' },
  { label: 'Цены и гарантии',  to: '/prices' },
  { label: 'Блог',             to: '/blog' },
  { label: 'Контакты',         to: '/contacts' },
]
