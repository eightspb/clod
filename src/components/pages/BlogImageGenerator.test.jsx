import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { BlogImageGenerator } from './BlogImageGenerator.jsx'

const ARTICLES = Object.freeze([
  Object.freeze({ slug: 'vab-ili-operatsiya', title: 'ВАБ или операция — что выбрать?', description: '', category: 'Статьи', image: '', imageAlt: '', author: 'Одинцов' }),
])

describe('BlogImageGenerator', () => {
  it('renders on the server with the article list without a temporal dead zone crash', () => {
    expect(renderToString(<BlogImageGenerator articles={ARTICLES} />)).toContain('ВАБ или операция')
  })
})
