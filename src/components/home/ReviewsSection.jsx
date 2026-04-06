import { Star, User } from 'lucide-react'

const REVIEWS = [
  {
    id: 1,
    name: 'Анна Петрова',
    date: '12 января 2025',
    rating: 5,
    text: 'Обратилась с направлением на операцию из другой клиники. Здесь спокойно перепроверили документы, объяснили варианты и предложили малоинвазивное решение по показаниям.',
  },
  {
    id: 2,
    name: 'Марина Соколова',
    date: '3 февраля 2025',
    rating: 5,
    text: 'На приёме по гинекологии всё объяснили спокойно, без давления и лишних назначений. Понравилось, что сразу обозначили следующий шаг.',
  },
  {
    id: 3,
    name: 'Елена Кузнецова',
    date: '18 февраля 2025',
    rating: 5,
    text: 'Эндокринолог помогла собрать анализы в понятную картину и дала спокойный план наблюдения. Всё прошло без спешки и лишних обещаний.',
  },
  {
    id: 4,
    name: 'Ольга Иванова',
    date: '5 марта 2025',
    rating: 5,
    text: 'На приёме по нутрициологии разобрали питание и дефициты без жёстких схем. Понравился спокойный, уважительный тон.',
  },
]

function ReviewStars({ count = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={14} fill="currentColor" className="text-clay-peach" />
      ))}
    </div>
  )
}

export function ReviewsSection() {
  return (
    <section className="section">
      <div className="container-clay">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">
            Отзывы пациентов
          </h2>
          <p className="text-clay-muted max-w-xl mx-auto">
            Реальные истории людей, которые выбрали доказательную медицину
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {REVIEWS.map((review) => (
            <div key={review.id} className="clay clay-card p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="icon-circle-peach flex-shrink-0">
                    <User size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-clay-dark text-sm">{review.name}</p>
                    <p className="text-xs text-clay-muted">{review.date}</p>
                  </div>
                </div>
                <ReviewStars count={review.rating} />
              </div>
              <p className="text-clay-muted text-sm leading-relaxed flex-1">{review.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
