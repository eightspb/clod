import { ArrowRight, Zap, Clock } from 'lucide-react'

export function VabSection() {
  return (
    <section className="section">
      <div className="container-clay">
        <div className="clay clay-card-mint p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
            <div>
            <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">
              Вакуумная аспирационная биопсия по показаниям
            </h2>
            <p className="text-clay-text text-lg mb-2">Помогаем пройти путь от диагностики до малоинвазивного лечения в одном месте.</p>
            <p className="text-clay-muted text-sm mb-5">Контроль под УЗИ, понятный маршрут для пациента и обсуждение дальнейшего наблюдения заранее.</p>
            <div className="flex flex-wrap gap-4 mt-2">
              <a href="/vab" className="clay btn-clay-white text-sm py-3 px-6 shadow-lg">
                Подробнее о ВАБ
                <ArrowRight size={16} />
              </a>
              <a href="/prices" className="clay btn-clay-secondary text-sm py-3 px-6 shadow-lg">
                Узнать стоимость
              </a>
            </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="bg-white rounded-2xl p-5 shadow-xl border border-white/80">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#EAF7F4] shadow-inner flex items-center justify-center flex-shrink-0">
                    <Zap size={24} className="text-[#2A9E80]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#1a2f26] mb-1.5 text-lg">ВАБ под УЗ-контролем</h3>
                    <p className="text-[#3D4A44] text-sm leading-relaxed font-medium">Малоинвазивная процедура в маммологии, где заранее обсуждаем показания, объём вмешательства и наблюдение.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-xl border border-white/80">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#EAF7F4] shadow-inner flex items-center justify-center flex-shrink-0">
                    <Clock size={24} className="text-[#2A9E80]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#1a2f26] mb-1.5 text-lg">Амбулаторно за 30 минут</h3>
                    <p className="text-[#3D4A44] text-sm leading-relaxed font-medium">Процедура проходит без госпитализации. Дальнейшие рекомендации обсуждаем сразу после неё.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
