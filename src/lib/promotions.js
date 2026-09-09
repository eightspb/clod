/**
 * Current patient promotions. Content mirrors the offers published on the previous clinic site;
 * prices are editorial facts owned by the clinic and updated by hand.
 */
export const LAB_DISCOUNT = Object.freeze({
  id: 'lab-discount',
  title: 'Скидка 20% на анализы',
  percent: 20,
  days: Object.freeze(['вторник', 'среда']),
  short: 'Каждый вторник и среду лабораторные исследования в клинике стоят на 20% дешевле.',
  description: 'Скидка распространяется на весь перечень лабораторных исследований, которые выполняются в клинике по вторникам и средам: анализы крови, гормоны, биохимию, онкомаркеры и другие позиции прайс-листа. Скидка применяется при оплате в день забора материала и не суммируется с другими акциями.',
  conditions: Object.freeze([
    'Действует только по вторникам и средам в часы работы клиники',
    'Распространяется на исследования из раздела «Лабораторная диагностика» прайс-листа',
    'Не суммируется с другими скидками и специальными предложениями',
    'Подготовку к анализам и перечень доступных исследований уточняйте у администратора при записи',
  ]),
  href: '/prices/full#laboratory',
  hrefLabel: 'Стоимость анализов',
})

export const HEALTH_DAY = Object.freeze({
  id: 'health-day',
  title: 'День женского здоровья',
  weekday: 'понедельник',
  price: 7500,
  regularPrice: 9800,
  doctorSlug: 'zaharova',
  doctorName: 'Захарова Татьяна Николаевна',
  short: 'Каждый понедельник: три УЗИ и консультация гинеколога-эндокринолога за один визит.',
  description: 'Комплексная проверка женского здоровья за один визит. Программа помогает регулярно наблюдать молочные железы, органы малого таза и щитовидную железу и сразу обсудить результаты с врачом.',
  includes: Object.freeze([
    'УЗИ молочных желёз',
    'УЗИ органов малого таза',
    'УЗИ щитовидной железы',
    'Консультация гинеколога-эндокринолога',
  ]),
  conditions: Object.freeze([
    'Программа проводится по понедельникам по предварительной записи',
    'Приём ведёт акушер-гинеколог высшей категории Захарова Татьяна Николаевна',
    'Стоимость программы фиксированная и не суммируется с другими скидками',
  ]),
  href: '/doctors/zaharova',
  hrefLabel: 'О враче',
})

export const PROMOTIONS = Object.freeze([LAB_DISCOUNT, HEALTH_DAY])

/**
 * Formats a rouble amount with a thin-space thousands separator the way prices are shown on the site.
 */
export function formatRoubles(amount) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error(`Cannot format rouble amount ${amount}`)
  return `${amount.toLocaleString('ru-RU').replace(/\u00A0/g, '\u202F')} ₽`
}
