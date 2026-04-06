import { ArrowRight, Shield, CheckCircle } from 'lucide-react'

export function SecondOpinionSection() {
  return (
    <section className="section">
      <div className="container-clay">
        <div className="clay clay-card-soft-peach p-0 relative overflow-hidden">
          <div className="blob-peach absolute -top-10 -right-10 w-40 h-40 opacity-20 pointer-events-none" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch">
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4 uppercase tracking-wider badge-specialty-peach">
                <Shield size={12} />
                Бесплатно
              </div>
              <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">
                Второе мнение по маммологии
              </h2>
              <p className="text-clay-muted leading-relaxed mb-4">
                Если вам назначили операцию — перепроверим документы, обсудим тактику и объясним, нужна ли она на самом деле.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-clay-peach flex-shrink-0" />
                  <span className="text-sm text-clay-dark">Разбираем снимки, заключения и результаты анализов</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-clay-peach flex-shrink-0" />
                  <span className="text-sm text-clay-dark">Объясняем следующий шаг понятным языком</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-clay-peach flex-shrink-0" />
                  <span className="text-sm text-clay-dark">Для пациентов из любого региона России</span>
                </div>
              </div>
              <a href="/second-opinion" className="clay btn-clay-primary gap-2">
                Проверить, нужна ли операция
                <ArrowRight size={16} />
              </a>
            </div>
            <img
              src="/images/vab-alternative.png"
              alt="Второе мнение по маммологии"
              width={400}
              height={400}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
