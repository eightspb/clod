---
name: seo-audit
description: >
  Comprehensive SEO audit for Astro 4 medical clinic site.
  Analyzes technical SEO, content quality, E-E-A-T signals,
  structured data (JSON-LD), Core Web Vitals factors,
  local/GEO SEO, and accessibility.
  Trigger: "SEO audit", "check SEO", "analyze SEO",
  "SEO report", "improve SEO", "SEO score".
allowed-tools: Bash, Read, Glob, Grep, Agent, Write, Edit
---

# SEO Audit Skill

Perform a deep, programmatic SEO audit of the Astro 4 medical clinic site by reading source files. Produce a structured report with severity ratings and actionable fixes. Optionally auto-fix issues when safe.

## When to Use

- User asks to audit, check, analyze, or improve SEO
- User asks for an SEO report or score
- User mentions meta tags, JSON-LD, structured data, headings, Core Web Vitals, E-E-A-T
- Before a major deploy or content push
- After adding new pages, blog posts, or doctor profiles

## Arguments

- No argument or `full` -- run all audit phases
- `page <path>` -- audit a single page (e.g., `/seo-audit page /mammology`)
- `blog` -- audit only blog content collection
- `schema` -- audit only JSON-LD structured data
- `links` -- audit only internal linking
- `fix` -- run audit and auto-fix safe issues (meta length, missing alt, etc.)

## Audit Phases

Run phases sequentially. Collect findings into a report array with severity levels: CRITICAL, HIGH, MEDIUM, LOW. At the end, produce a summary table sorted by severity and an overall SEO score (1-10).

---

### Phase 1: Configuration & Routing

Read `astro.config.mjs` and verify:

1. `site` field is set (absolute URL with https)
2. `@astrojs/sitemap` is in integrations
3. `trailingSlash` is configured consistently
4. Redirects cover known old URLs

Read `public/robots.txt` and verify:

5. File exists and is not empty
6. `Sitemap:` directive points to correct sitemap URL
7. `/admin/` and `/api/` are disallowed
8. No accidental `Disallow: /` for public paths

Collect all public routes:

9. Glob `src/pages/**/*.astro`, excluding `admin/`, `api/`, `404.astro`, `blog-images.astro`
10. Build a route map: file path -> URL path

---

### Phase 2: Head & Meta Tags

For each public page (`.astro` file from Phase 1):

1. Read the file, extract props passed to `Layout` component:
   - `title` -- exists, 30-60 chars, unique across pages
   - `description` -- exists, 120-160 chars, unique across pages
   - `keywords` -- exists, contains geo markers ("СПб" or "Санкт-Петербург")
   - `ogImage` -- exists, file in `public/` is present
   - `canonicalUrl` -- if set, uses https and matches route

2. Check `Layout.astro` head section (once):
   - `<html lang="ru">` attribute
   - `<meta charset="UTF-8">`
   - `<meta name="viewport">`
   - GEO meta tags: `geo.region`, `geo.placename`, `geo.position`, `ICBM`
   - OG tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:locale`
   - Twitter Card tags
   - Canonical `<link rel="canonical">`
   - Favicon `<link rel="icon">`
   - Font preload `<link rel="preload">` for critical fonts
   - `font-display: swap` in preloaded font references

3. Check for `noindex`/`nofollow` on public pages (should NOT be present).

---

### Phase 3: Content & Heading Hierarchy

For each public page React component (`src/components/pages/*.jsx`):

1. Count `<h1>` tags -- exactly 1 per component
2. Check heading order: no skipped levels (H1 -> H3 without H2)
3. Verify H1 contains primary keyword from the page title/keywords
4. Check for meaningful content (component is not empty/stub)

For blog posts (`src/content/blog/*.md`):

5. Frontmatter validation:
   - `title` -- exists, 30-70 chars
   - `description` -- exists, 120-160 chars
   - `keywords` -- exists, contains geo markers
   - `publishDate` -- exists, valid date, not in the future
   - `author` and `authorSlug` -- exist, `authorSlug` matches a doctor in `doctors-data.js`
   - `category` and `tags` -- exist, non-empty
6. Content has at least one H2 heading
7. Content length >= 300 words

---

### Phase 4: Structured Data (JSON-LD)

Parse `<script type="application/ld+json">` blocks in `.astro` files:

1. **Global MedicalBusiness** (`Layout.astro`):
   - Has `@type: MedicalBusiness`
   - Contains: name, address (PostalAddress with streetAddress, addressLocality, postalCode, addressRegion), telephone, openingHours, priceRange, aggregateRating, geo (GeoCoordinates), sameAs
   - Phone matches `contacts.js` `PHONE_NUMBER`
   - Address matches `contacts.js` `ADDRESS`

2. **Physician** (`doctors/[slug].astro`):
   - Has `@type: Physician`
   - Contains: name, medicalSpecialty, alumniOf, worksFor, sameAs
   - `honorificSuffix` populated if doctor has `degree`
   - `worksFor.address` includes `addressRegion`

3. **MedicalCondition** (condition pages):
   - Has `@type: MedicalCondition`
   - Contains: name, associatedAnatomy or signOrSymptom or possibleTreatment

4. **MedicalProcedure** (`vab.astro`):
   - Has `@type: MedicalProcedure`
   - Contains: name, procedureType, howPerformed

5. **FAQPage** (pages with FAQ sections):
   - Has `@type: FAQPage`
   - `mainEntity` array is non-empty
   - Each item has `@type: Question` + `acceptedAnswer` with `@type: Answer`

6. **BreadcrumbList** (all internal pages):
   - Has `@type: BreadcrumbList`
   - `itemListElement` uses absolute URLs
   - Position numbers are sequential starting at 1

7. **Blog articles** (`blog/[slug].astro`):
   - Has `MedicalWebPage` or `Article`
   - Contains: headline, author (Physician reference), datePublished

8. **JSON validity**: all JSON-LD blocks parse without errors; no empty required fields.

---

### Phase 5: Internal Linking

1. Collect all navigation links from:
   - `src/lib/nav.js` (NAV_ITEMS, FOOTER_LINKS)
   - `src/components/Header.jsx`
   - `src/components/Footer.jsx`

2. Verify every public route from Phase 1 is reachable from at least one navigation source (no orphan pages).

3. Grep all `href="/"` patterns in `src/components/pages/*.jsx` and `src/content/blog/*.md`:
   - Every internal link target (`/path`) matches an existing route
   - Flag any broken links

4. Check cross-linking:
   - Condition pages link back to their pillar specialization page
   - Pillar pages link to their condition pages
   - Blog posts have `RelatedArticles` or cross-references

5. Check that each content page has at least one CTA link (to `/contacts`, booking, or phone).

---

### Phase 6: Performance SEO (Source-Level)

1. **Images** -- grep `<img` in `.jsx` and `.astro` files:
   - `alt` attribute present and non-empty (except decorative `alt=""`)
   - `width` and `height` attributes present
   - `loading="lazy"` on below-the-fold images
   - Hero/LCP images do NOT have `loading="lazy"`; prefer `fetchPriority="high"`

2. **Fonts** -- check `src/styles/global.css`:
   - All `@font-face` declarations include `font-display: swap`
   - Font files are `.woff2` format in `public/fonts/`
   - Layout.astro preloads critical fonts with `<link rel="preload">`

3. **Script loading**:
   - `tracker.js` loaded with `defer`
   - Third-party widgets use `requestIdleCallback` or `client:idle`
   - Count `client:load` vs `client:idle` usage; flag excessive `client:load`

4. **CSS**:
   - No inline styles in `.jsx` components (only CSS variables and utility classes)
   - No unused large CSS imports

---

### Phase 7: Local / GEO SEO

1. **NAP consistency** -- extract phone, address, hours from:
   - `src/lib/contacts.js`
   - `src/components/Footer.jsx`
   - `src/components/Header.jsx`
   - JSON-LD in `Layout.astro`
   - `Contacts.jsx`

   All must match exactly.

2. **GEO meta tags** in `Layout.astro`:
   - `geo.region` = `RU-SPE`
   - `geo.placename` = `Санкт-Петербург`
   - `geo.position` and `ICBM` present and valid coordinates

3. **Local keywords**: title/description of main service pages contain "Санкт-Петербург" or "СПб".

4. **Map**: `/contacts` page contains map integration.

---

### Phase 8: E-E-A-T Signals (YMYL Medical)

1. **Doctor profiles** -- for each doctor in `doctors-data.js`:
   - Has `degree` or `education` entries (credential proof)
   - Has `proDoctorovUrl` (external authority)
   - Has `reviews` (social proof)
   - Has dedicated page (`/doctors/[slug]`)

2. **Blog authorship**:
   - Every blog post `authorSlug` resolves to a real doctor
   - Doctor's page exists and has Physician JSON-LD

3. **External signals**:
   - `sameAs` in MedicalBusiness JSON-LD contains social links (VK, etc.)
   - Doctor `sameAs` includes proDoctorovUrl

---

### Phase 9: Accessibility (SEO-Relevant)

1. **Semantic HTML**: check for `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`, `<header>` in Layout and page components.

2. **ARIA**: buttons/icon-only elements have `aria-label`; dialogs have `role="dialog"`.

3. **Form labels**: all `<input>` have associated `<label>` or `aria-label`.

4. **Skip navigation**: check for skip-to-content link in Layout.

---

## Report Format

After all phases, produce a report:

```
# SEO Audit Report -- [date]

## Score: X/10

## Summary
| Severity | Count |
|----------|-------|
| CRITICAL | N     |
| HIGH     | N     |
| MEDIUM   | N     |
| LOW      | N     |
| PASS     | N     |

## Critical Issues
1. [CRITICAL] Description -- file:line -- fix suggestion

## High Issues
1. [HIGH] Description -- file:line -- fix suggestion

## Medium Issues
...

## Low Issues
...

## Passed Checks
- [PASS] Description (N items checked)

## Recommendations
Prioritized list of improvements with estimated SEO impact.
```

## Auto-Fix Rules (when `fix` argument is passed)

Safe to auto-fix without confirmation:

- Add missing `alt=""` to decorative images
- Add `width`/`height` to images where dimensions are known
- Add `loading="lazy"` to below-the-fold images
- Add missing `font-display: swap` to `@font-face`
- Trim title/description to recommended length limits
- Add missing geo markers to keywords
- Fix heading hierarchy (promote/demote levels)

Require confirmation before fixing:

- Rewriting title or description content
- Adding/modifying JSON-LD blocks
- Changing navigation structure
- Modifying redirects

## Tips for Running

- Full audit: `/seo-audit` or `/seo-audit full`
- Single page: `/seo-audit page /mammology`
- Blog only: `/seo-audit blog`
- Schema only: `/seo-audit schema`
- Links only: `/seo-audit links`
- Audit + fix: `/seo-audit fix`
