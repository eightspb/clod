import { ExternalLink } from 'lucide-react'
import { DOCTORS } from '../../lib/doctors-data.js'

const REVIEW_DOCTOR_SLUGS = ['odintsov', 'zaharova', 'kalinina', 'nevzorova']

const REVIEWS = REVIEW_DOCTOR_SLUGS.map((slug) => {
  const doctor = DOCTORS.find((entry) => entry.slug === slug)
  if (!doctor?.proDoctorovUrl || !doctor.reviews?.[0]) throw new Error(`Home reviews need a ProDoctorov-sourced review for doctor ${slug}`)
  return { doctor, review: doctor.reviews[0] }
})

export function ReviewsSection() {
  return (
    <section className="section">
      <div className="container-clay">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">
            Отзывы пациентов
          </h2>
          <p className="text-clay-muted max-w-xl mx-auto">
            Отзывы о врачах клиники, опубликованные пациентами на ПроДокторов
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {REVIEWS.map(({ doctor, review }) => (
            <article key={doctor.slug} className="clay clay-card p-6 flex flex-col gap-4">
              <p className="text-clay-muted text-sm leading-relaxed flex-1">{review.text}</p>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-bold text-clay-dark text-sm">{review.author || 'Пациентка'}</p>
                  <p className="text-xs text-clay-muted">
                    о враче <a href={`/doctors/${doctor.slug}`} className="underline">{doctor.name}</a>
                  </p>
                </div>
                <a
                  href={doctor.proDoctorovUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-clay-mint"
                >
                  Отзыв на ПроДокторов
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
