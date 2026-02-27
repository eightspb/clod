export const DIRECTIONS = [
  { label: 'Маммология',       to: '/mammology' },
  { label: 'ВАБ',              to: '/vab' },
  { label: 'Гинекология',      to: '/gynecology' },
  { label: 'Эндокринология',   to: '/endocrinology' },
  { label: 'Нутрициология',    to: '/nutrition' },
]

export const NAV_ITEMS = [
  { label: 'О клинике',           to: '/about' },
  { label: 'Направления',         children: DIRECTIONS },
  { label: 'Доктора',             to: '/doctors' },
  { label: 'Бесплатное второе мнение', to: '/second-opinion' },
  { 
    label: 'Для пациентов',       
    children: [
      { label: 'Акции', to: '/promotions' },
      { label: 'Цены', to: '/prices' },
      { label: 'Форма для налоговой', to: '/tax-form' }
    ] 
  },
  { label: 'Блог',                to: '/blog' },
  { label: 'Контакты',            to: '/contacts' },
]

export const FOOTER_LINKS = [
  ...DIRECTIONS,
  { label: 'О клинике',                to: '/about' },
  { label: 'Бесплатное второе мнение', to: '/second-opinion' },
  { label: 'Цены и гарантии',          to: '/prices' },
  { label: 'Блог',                     to: '/blog' },
  { label: 'Контакты',                 to: '/contacts' },
]
