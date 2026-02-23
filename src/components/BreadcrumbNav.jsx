import { ChevronRight, Home } from 'lucide-react'
import { ICON_SIZES, SITE_URL } from '../lib/constants.js'

/**
 * BreadcrumbNav - хлебные крошки с BreadcrumbList JSON-LD
 * @param {Array<{label: string, href?: string}>} items - массив крошек; последний элемент - текущая страница (без href)
 */
export function BreadcrumbNav({ items = [] }) {
  const allItems = [{ label: 'Главная', href: '/' }, ...items]

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav aria-label="Хлебные крошки" className="container-clay py-3">
        <ol itemScope itemType="https://schema.org/BreadcrumbList" className="flex flex-wrap items-center gap-1 text-sm text-clay-muted">
          {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1
            return (
              <li key={index} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="flex items-center gap-1">
                {index === 0 && (
                  <Home size={ICON_SIZES.sm} className="shrink-0 text-clay-muted" aria-hidden="true" />
                )}
                {item.href && !isLast ? (
                  <a
                    href={item.href}
                    itemProp="item"
                    className="hover:text-clay-text transition-colors duration-150"
                  >
                    <span itemProp="name">{item.label}</span>
                  </a>
                ) : (
                  <span itemProp="name" className={isLast ? 'text-clay-text font-medium' : ''} aria-current={isLast ? 'page' : undefined}>
                    {item.label}
                  </span>
                )}
                <meta itemProp="position" content={index + 1} />
                {!isLast && (
                  <ChevronRight size={ICON_SIZES.sm} className="shrink-0 text-clay-muted/60" aria-hidden="true" />
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
