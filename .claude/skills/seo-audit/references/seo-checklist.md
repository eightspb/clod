# SEO Checklist Reference -- Astro 4 Medical Clinic

Detailed checklist with severity levels for programmatic SEO audit.
Total: ~90 checks across 9 categories.

## Severity Definitions

| Level | Meaning | SEO Impact |
|-------|---------|------------|
| CRITICAL | Blocks indexing or causes major ranking loss | Immediate fix required |
| HIGH | Significant ranking or UX impact | Fix within current sprint |
| MEDIUM | Moderate impact, best practice violation | Plan to fix |
| LOW | Minor improvement opportunity | Nice to have |

---

## 1. Technical SEO -- Configuration (8 checks)

| # | Check | Severity | How to verify |
|---|-------|----------|---------------|
| T1 | `site` field in astro.config.mjs | CRITICAL | Read config, check for https URL |
| T2 | @astrojs/sitemap in integrations | CRITICAL | Grep for "sitemap" in config |
| T3 | trailingSlash configured | HIGH | Read config, check consistency |
| T4 | robots.txt exists and valid | CRITICAL | Read public/robots.txt |
| T5 | robots.txt Sitemap directive | HIGH | Grep for "Sitemap:" |
| T6 | robots.txt blocks /admin/, /api/ | HIGH | Grep for Disallow patterns |
| T7 | 404.astro exists | MEDIUM | Glob for 404.astro |
| T8 | Redirects for old URLs | MEDIUM | Read astro.config.mjs redirects |

## 2. Head & Meta Tags (14 checks per page)

| # | Check | Severity | Validation rule |
|---|-------|----------|-----------------|
| M1 | title exists | CRITICAL | Prop passed to Layout |
| M2 | title length 30-60 chars | HIGH | String length check |
| M3 | title unique across pages | CRITICAL | Collect all, check duplicates |
| M4 | description exists | CRITICAL | Prop passed to Layout |
| M5 | description length 120-160 chars | HIGH | String length check |
| M6 | description unique | HIGH | Collect all, check duplicates |
| M7 | keywords exists | MEDIUM | Prop passed to Layout |
| M8 | keywords contain geo markers | HIGH | Contains "СПб" or "Санкт-Петербург" |
| M9 | html lang="ru" | CRITICAL | Check Layout.astro |
| M10 | viewport meta | CRITICAL | Check Layout.astro |
| M11 | OG tags complete | HIGH | og:title, og:description, og:image, og:url |
| M12 | OG image file exists | MEDIUM | Check public/ for referenced file |
| M13 | Canonical URL correct | CRITICAL | Matches page route, uses https |
| M14 | No noindex on public pages | CRITICAL | Grep for noindex/nofollow |

## 3. Content & Headings (7 checks per page)

| # | Check | Severity | Validation rule |
|---|-------|----------|-----------------|
| H1 | Single H1 per page | CRITICAL | Count <h1> in page component |
| H2 | H1 contains primary keyword | HIGH | H1 text includes title keyword |
| H3 | No skipped heading levels | HIGH | H1->H2->H3 sequential |
| H4 | Meaningful content (>100 words) | HIGH | Word count in component |
| H5 | Blog: frontmatter complete | HIGH | title, description, publishDate, author |
| H6 | Blog: authorSlug valid | CRITICAL | Matches doctors-data.js slug |
| H7 | Blog: content >= 300 words | MEDIUM | Word count in .md body |

## 4. JSON-LD Structured Data (12 checks)

| # | Check | Severity | Validation rule |
|---|-------|----------|-----------------|
| S1 | MedicalBusiness on all pages | CRITICAL | Parse JSON-LD in Layout.astro |
| S2 | MedicalBusiness fields complete | CRITICAL | name, address, telephone, openingHours |
| S3 | Physician on doctor pages | CRITICAL | Parse JSON-LD in doctors/[slug].astro |
| S4 | Physician fields complete | HIGH | name, specialty, alumniOf, sameAs |
| S5 | MedicalCondition on condition pages | HIGH | Parse JSON-LD blocks |
| S6 | MedicalProcedure on /vab | HIGH | Parse JSON-LD blocks |
| S7 | FAQPage on FAQ sections | HIGH | Parse JSON-LD blocks |
| S8 | BreadcrumbList on inner pages | HIGH | Parse JSON-LD blocks |
| S9 | Blog Article/MedicalWebPage | HIGH | Parse JSON-LD in blog/[slug].astro |
| S10 | JSON parses without errors | CRITICAL | JSON.parse each block |
| S11 | No empty required fields | HIGH | Check name, @type, etc. |
| S12 | Data matches visible content | HIGH | Cross-reference contacts.js |

## 5. Internal Linking (6 checks)

| # | Check | Severity | Validation rule |
|---|-------|----------|-----------------|
| L1 | No orphan pages | CRITICAL | Every route has incoming link |
| L2 | No broken internal links | CRITICAL | Every href matches a route |
| L3 | Condition -> pillar cross-links | HIGH | Condition pages link to specialization |
| L4 | Pillar -> condition cross-links | HIGH | Specialization pages link to conditions |
| L5 | Blog cross-references | MEDIUM | RelatedArticles or inline links |
| L6 | CTA on every content page | MEDIUM | At least one booking/contact link |

## 6. Performance SEO (12 checks)

| # | Check | Severity | Validation rule |
|---|-------|----------|-----------------|
| P1 | Images have alt text | CRITICAL | Grep <img without alt |
| P2 | Images have width/height | HIGH | Grep <img without dimensions |
| P3 | Below-fold images lazy-loaded | HIGH | loading="lazy" present |
| P4 | Hero images NOT lazy | HIGH | LCP images eager or no loading attr |
| P5 | font-display: swap in @font-face | HIGH | Grep global.css |
| P6 | Fonts are .woff2 | HIGH | Check public/fonts/ extensions |
| P7 | Critical font preloaded | HIGH | link rel="preload" in Layout |
| P8 | tracker.js deferred | HIGH | Check Layout.astro script tag |
| P9 | Widgets use idle loading | MEDIUM | requestIdleCallback or client:idle |
| P10 | client:load vs client:idle ratio | MEDIUM | Count directives across .astro |
| P11 | No inline styles in JSX | MEDIUM | Grep for style={{ in .jsx |
| P12 | preconnect for external origins | MEDIUM | Check Layout.astro for preconnect |

## 7. Local / GEO SEO (7 checks)

| # | Check | Severity | Validation rule |
|---|-------|----------|-----------------|
| G1 | GEO meta tags present | HIGH | geo.region, geo.placename in Layout |
| G2 | geo.region = RU-SPE | HIGH | Exact match |
| G3 | NAP consistent (phone) | CRITICAL | contacts.js == Footer == Header == JSON-LD |
| G4 | NAP consistent (address) | CRITICAL | Same across all sources |
| G5 | NAP consistent (hours) | HIGH | Same across all sources |
| G6 | Local keywords in service pages | HIGH | title/description contain SPb |
| G7 | Map on contacts page | MEDIUM | Map component in Contacts.jsx |

## 8. E-E-A-T (YMYL Medical, 8 checks)

| # | Check | Severity | Validation rule |
|---|-------|----------|-----------------|
| E1 | Doctors have credentials | CRITICAL | degree or education in data |
| E2 | Doctors have external profiles | HIGH | proDoctorovUrl populated |
| E3 | Doctors have reviews | MEDIUM | reviews array non-empty |
| E4 | Doctors have dedicated pages | HIGH | /doctors/[slug] route exists |
| E5 | Blog authors are real doctors | CRITICAL | authorSlug resolves to doctor |
| E6 | MedicalBusiness sameAs populated | HIGH | Social links in JSON-LD |
| E7 | Doctor sameAs has proDoctorovUrl | HIGH | In Physician JSON-LD |
| E8 | Publications/credentials shown | MEDIUM | education, publications visible |

## 9. Accessibility as SEO (6 checks)

| # | Check | Severity | Validation rule |
|---|-------|----------|-----------------|
| A1 | Semantic HTML landmarks | HIGH | nav, main, article, section present |
| A2 | Icon buttons have aria-label | HIGH | Grep button without text content |
| A3 | Dialogs have role="dialog" | MEDIUM | Check modal components |
| A4 | Form inputs have labels | MEDIUM | input with label or aria-label |
| A5 | Skip navigation link | LOW | Check Layout for skip-to-content |
| A6 | Focus visible on interactive | MEDIUM | CSS focus-visible styles exist |

---

## Scoring Formula

```
score = 10 - (critical * 1.5) - (high * 0.5) - (medium * 0.15) - (low * 0.05)
score = max(1, min(10, round(score)))
```

Critical issues have outsized impact. A site with 0 critical, 0 high = score 10.
A site with 3 critical issues cannot score above 5.5.

---

## Medical / YMYL Specific Notes

Google applies stricter quality standards to YMYL (Your Money or Your Life) content,
which includes all medical/health pages. Key implications:

- E-E-A-T signals weigh MORE for medical content
- Author credentials (degree, publications) directly affect ranking
- External authority signals (proDoctorovUrl, sameAs) are essential
- Medical claims must be attributed to qualified professionals
- JSON-LD Physician schema with credentials is high-priority
- Content freshness matters more (outdated medical info = quality penalty)
- NAP consistency is critical for local medical search
