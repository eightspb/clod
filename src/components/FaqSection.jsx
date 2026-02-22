/**
 * FaqSection - FAQ-аккордеон с автогенерацией FAQPage JSON-LD
 * @param {Array<{question: string, answer: string}>} items
 * @param {string} title - заголовок секции (по умолчанию "Частые вопросы")
 */
export function FaqSection({ items = [], title = 'Частые вопросы' }) {
  if (!items.length) return null

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <section className="mb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <h2 className="text-2xl font-bold text-clay-text mb-6">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <details key={item.question} className="clay-card group">
            <summary className="flex items-center justify-between p-5 cursor-pointer list-none font-medium text-clay-text select-none">
              <span>{item.question}</span>
              <span className="text-clay-teal text-xl font-light group-open:rotate-45 transition-transform duration-200 shrink-0 ml-3">
                +
              </span>
            </summary>
            <div className="px-5 pb-5 text-clay-muted leading-relaxed text-sm">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
