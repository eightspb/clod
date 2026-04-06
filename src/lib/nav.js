import { DOCTORS } from './doctors-data.js'
import { matchesFilter } from './filters.js'

export const DIRECTIONS = [
  {
    label: 'Маммология', to: '/mammology',
    conditions: [
      { label: 'Фиброаденома', to: '/fibroadenoma' },
      { label: 'Мастопатия', to: '/mastopatiya' },
      { label: 'Киста молочной железы', to: '/kista-molochnoy-zhelezy' },
    ]
  },
  {
    label: 'Гинекология', to: '/gynecology',
    conditions: [
      { label: 'Эрозия шейки матки', to: '/eroziya-sheyki-matki' },
      { label: 'Эндометриоз', to: '/endometrioz' },
      { label: 'Аденомиоз', to: '/adenomioz' },
    ]
  },
  {
    label: 'Эндокринология', to: '/endocrinology',
    conditions: [
      { label: 'Гипотиреоз', to: '/gipotireoz' },
      { label: 'Тиреоидит Хашимото', to: '/tireoidit-khashimoto' },
    ]
  },
  { label: 'Нутрициология', to: '/nutrition', conditions: [] },
]

export const VAB_ITEM = { label: 'ВАБ — основное направление', to: '/vab' }

const DOCTOR_GROUPS = [
  { id: 'mammology', label: 'Маммология', to: '/mammology' },
  { id: 'gynecology', label: 'Гинекология', to: '/gynecology' },
  { id: 'endocrinology', label: 'Эндокринология', to: '/endocrinology' },
  { id: 'nutrition', label: 'Нутрициология', to: '/nutrition' },
].map((group) => ({
  ...group,
  doctors: DOCTORS
    .filter((d) => matchesFilter(d, group.id))
    .map((d) => ({ name: d.name, slug: d.slug, photo: d.photo })),
}))

export const NAV_ITEMS = [
  {
    label: 'О клинике',
    children: [
      { label: 'О клинике', to: '/about' },
      { label: 'Наши результаты', to: '/nashi-rezultaty' },
      { label: 'Медиа / СМИ', to: '/media' },
      { label: 'Лицензии', to: '/licenses' },
    ]
  },
  { label: 'Направления', mega: true, children: DIRECTIONS, vab: VAB_ITEM },
  { label: 'Доктора', mega: 'doctors', to: '/doctors', groups: DOCTOR_GROUPS },
  {
    label: 'Пациентам',
    children: [
      { label: 'Бесплатное второе мнение', to: '/second-opinion' },
      { label: 'Для иногородних', to: '/dlya-inogorodnikh' },
      { label: 'Цены', to: '/prices' },
      { label: 'Форма для налоговой', to: '/tax-form' },
    ]
  },
  { label: 'Блог', to: '/blog' },
  { label: 'Контакты', to: '/contacts' },
]

export const FOOTER_LINKS = {
  directions: [
    ...DIRECTIONS.map((d) => ({ label: d.label, to: d.to })),
    VAB_ITEM,
  ],
  clinic: [
    { label: 'О клинике', to: '/about' },
    { label: 'Наши результаты', to: '/nashi-rezultaty' },
    { label: 'Медиа / СМИ', to: '/media' },
    { label: 'Лицензии', to: '/licenses' },
  ],
  patients: [
    { label: 'Бесплатное второе мнение', to: '/second-opinion' },
    { label: 'Для иногородних', to: '/dlya-inogorodnikh' },
    { label: 'Цены', to: '/prices' },
    { label: 'Форма для налоговой', to: '/tax-form' },
    { label: 'Доктора', to: '/doctors' },
    { label: 'Блог', to: '/blog' },
    { label: 'Контакты', to: '/contacts' },
  ],
}
