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
    ]
  },
  {
    label: 'Эндокринология', to: '/endocrinology',
    conditions: [
      { label: 'Гипотиреоз', to: '/gipotireoz' },
    ]
  },
  { label: 'Нутрициология', to: '/nutrition', conditions: [] },
]

export const VAB_ITEM = { label: 'ВАБ — основное направление', to: '/vab' }

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
  { label: 'Доктора', to: '/doctors' },
  {
    label: 'Пациентам',
    children: [
      { label: 'Бесплатное второе мнение', to: '/second-opinion' },
      { label: 'Для иногородних', to: '/dlya-inogorodnikh' },
      { label: 'Цены', to: '/prices' },
      { label: 'Акции', to: '/promotions' },
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
    { label: 'Акции', to: '/promotions' },
    { label: 'Форма для налоговой', to: '/tax-form' },
    { label: 'Доктора', to: '/doctors' },
    { label: 'Блог', to: '/blog' },
    { label: 'Контакты', to: '/contacts' },
  ],
}
