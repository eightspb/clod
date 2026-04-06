# Yandex SEO Reference for Medical Clinic Websites (2025-2026)

> Comprehensive reference for odintsovclinic.ru — compiled April 2026.
> Sources cited at the end of each section.

---

## Table of Contents

1. [Key Differences: Yandex vs Google SEO](#1-key-differences-yandex-vs-google-seo)
2. [IKS (Index of Site Quality)](#2-iks-index-of-site-quality)
3. [Yandex-Specific Meta Tags and Directives](#3-yandex-specific-meta-tags-and-directives)
4. [Turbo Pages — Status and Alternatives](#4-turbo-pages--status-and-alternatives)
5. [Yandex Webmaster Setup Checklist](#5-yandex-webmaster-setup-checklist)
6. [Yandex Structured Data / Schema.org Support](#6-yandex-structured-data--schemaorg-support)
7. [Local SEO in Yandex](#7-local-seo-in-yandex)
8. [Regional Targeting (Geotargeting)](#8-regional-targeting-geotargeting)
9. [Behavioral Factors (Yandex-Specific)](#9-behavioral-factors-yandex-specific)
10. [Commercial Ranking Factors for Medical Sites](#10-commercial-ranking-factors-for-medical-sites)
11. [YMYL and Medical Content in Yandex](#11-ymyl-and-medical-content-in-yandex)
12. [Yandex Indexing Specifics](#12-yandex-indexing-specifics)
13. [Actionable Checklist for odintsovclinic.ru](#13-actionable-checklist-for-odintsovclinicru)

---

## 1. Key Differences: Yandex vs Google SEO

| Factor | Google | Yandex |
|--------|--------|--------|
| **Backlinks** | Core ranking signal (PageRank) | Less weight; penalizes off-topic links; TIC/IKS replaced PageRank-like metric |
| **Behavioral signals** | Used but secondary | **Primary ranking factor** — CTR (0.8 weight), dwell time (0.75 weight), bounce rate |
| **Keyword matching** | Semantic/intent-first | Still values keyword density 1-3% alongside semantic understanding |
| **JavaScript rendering** | Full JS rendering | **Poor JS rendering** — SPAs without SSR/prerendering won't index (Astro SSG is fine) |
| **Indexing speed** | Hours for established sites | Days to weeks, especially for new sites |
| **Regional bias** | Global with local boost | **Strong regional bias** — geotargeted queries heavily favor local sites |
| **Content language** | Multilingual support | **Russian-first** — native Russian content required; Cyrillic domains get a boost |
| **Algorithm approach** | Universal core algo | **Query-type-specific algorithms** — commercial queries use entirely different factors than informational |
| **Link velocity** | Total volume matters | TIC scores reset monthly — link velocity > total volume |
| **Mobile** | Mobile-first indexing | Mobile important but separate Turbo (discontinued) — fast mobile pages still critical |
| **E-E-A-T** | Explicit guidelines | Proxima signals (since 2021) — similar to E-A-T but less documented |

**Key takeaway for Astro sites**: Yandex handles SSG/prerendered HTML well. The site's Astro hybrid architecture (SSG for public pages, SSR for admin) is ideal for Yandex indexing since all public pages are static HTML.

Sources:
- [SEO Sherpa: Yandex SEO in 2025](https://seosherpa.com/yandex-seo/)
- [Search Engine Journal: 10 Differences Yandex vs Google](https://www.searchenginejournal.com/9-biggest-differences-yandex-vs-google-seo/168628/)
- [Rayo: Yandex SEO Ranking Factors 2025](https://blog.rayo.work/seo/yandex-seo-ranking-factor/)
- [MoreLogin: Google vs Yandex Behavioral Factors](https://www.morelogin.com/blog/google-vs-yandex)

---

## 2. IKS (Index of Site Quality)

### What is IKS?

IKS (Индекс Качества Сайта) is Yandex's public metric showing how useful and convenient a website is for users. Introduced in August 2018, replacing the older TIC (Thematic Citation Index). Displayed as a number in Yandex Webmaster.

### How IKS is Calculated

Yandex uses data from its services and considers:

- **Audience size** — traffic volume to the site
- **User satisfaction** — behavioral metrics (time on site, bounce rate, return visits)
- **Trust level** — from both users and Yandex itself
- **Seasonal factors** — fluctuations may reflect demand patterns

**Important**: IKS itself is NOT a direct ranking factor, but the metrics that contribute to high IKS overlap heavily with ranking factors.

### How to Improve IKS

| Action | Details |
|--------|---------|
| **Quality content** | Unique, expert-written, answers user questions thoroughly |
| **Landing page quality** | Detailed service pages, comparisons, reviews, pricing |
| **Proper indexing** | Correct robots.txt, sitemap.xml, no duplicate pages |
| **Content optimization** | Proper `<title>`, `<h1>`-`<h6>`, `<meta description>`, Schema.org markup, image alt attributes |
| **Mobile optimization** | Responsive design, fast load on mobile devices |
| **User satisfaction** | Low bounce rate, high dwell time, return visits |
| **Brand searches** | Direct traffic and branded queries boost IKS |

### Where to Check IKS

- Yandex Webmaster > "My Sites" page
- Yandex Webmaster > Optimization > Quality Metrics
- Yandex site info search: `site:odintsovclinic.ru`

Sources:
- [Yandex Official: IKS Documentation](https://yandex.ru/support/webmaster/ru/site-quality-index)
- [SEO.RU: IKS Guide](https://seo.ru/blog/iks-v-yandekse-chto-eto-za-pokazatel-kak-ego-uznat-i-uvelichit/)
- [Rush Analytics: IKS](https://www.rush-analytics.ru/blog/chto-takoe-iks-sayta)
- [SEOPapa: IKS 2025](https://seopapa.com/blog/iks-sayta-2025-kak-povysit-indeks-kachestva-sayta-yandeksa-polnoe-rukovodstvo)

---

## 3. Yandex-Specific Meta Tags and Directives

### robots.txt Directives (Yandex-Specific)

```
# Yandex-specific User-agent block
User-agent: Yandex
Disallow: /admin/
Disallow: /api/

# Clean-param — tells Yandex to ignore URL parameters (UTM, session IDs)
Clean-param: utm_source&utm_medium&utm_campaign&utm_term&utm_content /
Clean-param: ref /
Clean-param: yclid /
Clean-param: fbclid /

# Crawl-delay — seconds between requests (protects server)
Crawl-delay: 1

# Sitemap (universal)
Sitemap: https://odintsovclinic.ru/sitemap-index.xml
```

#### Deprecated: Host directive
The `Host:` directive was previously used by Yandex to specify the preferred mirror (www vs non-www). **Now deprecated** — use 301 redirects instead and configure the preferred domain in Yandex Webmaster.

#### Clean-param
- Yandex-only directive (Google ignores it but shows a warning)
- Tells the crawler that URL parameters don't change page content
- Prevents duplicate indexing of `?utm_source=...` URLs
- **Alternative**: Use the new "GET Parameter Settings" tool in Yandex Webmaster UI (launched 2024)

### Meta Tags

```html
<!-- Standard (works for both Google and Yandex) -->
<meta name="description" content="...">
<meta name="keywords" content="...">

<!-- Yandex-specific verification -->
<meta name="yandex-verification" content="VERIFICATION_CODE">

<!-- GEO meta tags (important for Yandex local search) -->
<meta name="geo.region" content="RU-SPE">
<meta name="geo.placename" content="Санкт-Петербург">
<meta name="geo.position" content="59.9343;30.3351">
<meta name="ICBM" content="59.9343, 30.3351">

<!-- Robots indexing control -->
<meta name="robots" content="index, follow">

<!-- Open Graph (Yandex reads OG for snippet generation) -->
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
```

**Note on keywords meta tag**: Unlike Google which ignores `<meta name="keywords">`, Yandex historically gave it minor weight. Current consensus is it has negligible impact, but it doesn't hurt to include relevant keywords.

### robots.txt File Requirements (Yandex)

- Must be in the site root directory
- Must respond with HTTP 200
- **Max file size: 500 KB** (Yandex-specific limit)
- Use Punycode for Cyrillic domains
- URL-encode Cyrillic characters in paths

Sources:
- [Yandex Official: robots.txt](https://yandex.ru/support/webmaster/ru/controlling-robot/robots-txt)
- [Yandex Blog: Clean-param Settings](https://webmaster.yandex.ru/blog/clean-param)
- [Robotstxt.ru: Clean-param](https://robotstxt.ru/directives/clean-param)

---

## 4. Turbo Pages — Status and Alternatives

### Current Status: DISCONTINUED

**Yandex announced in February 2025 that Turbo Pages technology is being discontinued**, with full removal from search results in April 2025.

Reason: Mobile internet speeds have increased significantly, and most sites now have mobile-optimized versions, making Turbo Pages redundant.

### Impact on odintsovclinic.ru

- **No action needed** — the site never used Turbo Pages
- Astro SSG generates fast, static HTML pages by default
- Focus instead on Core Web Vitals and mobile performance

### Alternatives for Fast Mobile Experience

1. **AMP** — Google's equivalent, still active but declining in importance
2. **Native mobile optimization** — responsive design + fast loading (already implemented)
3. **Service Worker / PWA** — for offline and instant loading (optional)
4. **CDN** — for static asset delivery (nginx already handles caching)

Sources:
- [Habr: Yandex Turbo Pages Discontinued](https://habr.com/ru/news/880612/)
- [AdminVPS: Yandex Stopped Turbo Support](https://adminvps.ru/blog/yandeks-prekratil-podderzhku-turbo-stranicz-no-prodolzhaet-nagruzhat-servery/)
- [SEOPulses: Turbo Pages 2026](https://seopulses.ru/turbo-stranici-yandex-kak-podcluchit/)

---

## 5. Yandex Webmaster Setup Checklist

### Initial Setup

- [ ] Create account at [webmaster.yandex.ru](https://webmaster.yandex.ru)
- [ ] Add site: `https://odintsovclinic.ru`
- [ ] Verify ownership (meta tag, HTML file, or DNS record)
- [ ] Add `<meta name="yandex-verification" content="CODE">` to `Layout.astro`

### Core Configuration

- [ ] **Sitemap**: Submit `sitemap-index.xml` URL
- [ ] **Regional targeting**: Set region to "Санкт-Петербург" in Representation > Regionality
- [ ] **Preferred domain**: Confirm `https://odintsovclinic.ru` (non-www) as canonical
- [ ] **Link Yandex Metrica**: Connect Metrica counter for crawler data sharing
- [ ] **Enable crawling by counter**: Turn on "Обход по счетчикам" for faster page discovery
- [ ] **GET parameters**: Configure UTM and tracking params to ignore in indexation

### Ongoing Monitoring

- [ ] **Diagnostics**: Review the unified checklist (Errors + Recommendations) regularly
- [ ] **Indexing**: Monitor indexed pages count vs total pages
- [ ] **Search queries**: Track which queries bring traffic
- [ ] **IKS**: Monitor quality index trend
- [ ] **Structured data**: Check for markup errors in the validator
- [ ] **Security**: Monitor for malware/phishing warnings
- [ ] **Mobile**: Check mobile-friendly status

### Content Tools

- [ ] **Original texts**: Submit important articles to "Original Texts" before publishing (priority indexing)
- [ ] **Turbo pages**: SKIP — discontinued April 2025
- [ ] **Site links**: Review and configure sitelinks display
- [ ] **Snippets**: Configure structured snippets via Schema.org markup

Sources:
- [Kokoc: Yandex Webmaster 2025 Guide](https://kokoc.com/blog/webmaster-yandex-ru-polnoe-rukovodstvo/)
- [Team-B: Yandex Webmaster Setup](https://team-b.ru/blog/yandeks-vebmaster-rukovodstvo-po-nastroyke-i-ispolzovaniyu/)
- [PromoPult: Yandex Webmaster Guide](https://blog.promopult.ru/seo/yandex-webmaster.html)

---

## 6. Yandex Structured Data / Schema.org Support

### Supported Formats

Yandex supports structured data in these formats (in order of recommendation):
1. **JSON-LD** (officially supported since April 2021, recommended)
2. **Microdata** (HTML attributes)
3. **RDFa**
4. **Microformats**

### Schema.org Types Yandex Processes for Rich Snippets

| Type | Use Case | Rich Snippet Effect |
|------|----------|-------------------|
| **Organization** | Business info | Contact details, logo in search |
| **LocalBusiness** (and subtypes) | Local businesses | Address, phone, hours in snippet |
| **MedicalOrganization** / **MedicalClinic** | Medical sites | Enhanced medical business snippet |
| **Product** / **Offer** / **AggregateOffer** | Pricing | Price display in snippets |
| **AggregateRating** | Reviews | Star rating in snippets |
| **Recipe** | Recipes | Rich recipe cards |
| **Movie** / **TVSeries** | Entertainment | Film info cards |
| **VideoObject** | Videos | Video thumbnails |
| **ImageObject** | Images | Enhanced image results |
| **SoftwareApplication** | Apps | App info cards |
| **QAPage** | Q&A | Mobile Q&A format |
| **BreadcrumbList** | Navigation | Breadcrumb path in snippets |
| **Person** | People | Personal info |
| **Event** | Events | Event details |
| **PostalAddress** | Addresses | Address display |
| **ScholarlyArticle** / **Essay** | Academic | Article metadata |

### Medical-Specific Types (Schema.org)

While Yandex doesn't explicitly document enhanced snippets for all medical types, the validator accepts and processes:

- `MedicalBusiness` / `MedicalClinic` — use instead of generic `Organization`
- `MedicalOrganization` — parent type
- `Physician` — for doctor pages
- `MedicalCondition` — for condition/disease pages
- `MedicalProcedure` — for procedure pages (like VAB)
- `MedicalWebPage` — for medical content pages
- `FAQPage` — for FAQ sections (generates Q&A rich snippets)

**Validation**: Use Yandex's validator at https://webmaster.yandex.ru/tools/microtest/

### Required Properties for Organization/MedicalClinic

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  "name": "Required - full organization name",
  "url": "Required - website URL",
  "telephone": "Required - contact phone",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Required",
    "addressLocality": "Required - city",
    "addressRegion": "Required - region",
    "postalCode": "Required"
  }
}
```

Additional recommended properties:
- `geo` (GeoCoordinates) — lat/lng
- `openingHours` — business hours
- `aggregateRating` — rating display
- `priceRange` — price range indicator
- `hasMap` — link to map
- `sameAs` — social profiles

Sources:
- [Yandex Official: Schema.org Support](https://yandex.ru/support/webmaster/ru/schema-org/what-is-schema-org)
- [Yandex Official: JSON-LD](https://yandex.ru/support/webmaster/ru/json-ld/about)
- [Yandex Official: Organizations Markup](https://yandex.ru/support/webmaster/ru/supported-schemas/address-organization.html)
- [Yandex Validator](https://webmaster.yandex.ru/tools/microtest/)

---

## 7. Local SEO in Yandex

### Yandex Business (Яндекс Бизнес) — Priority Action

Yandex Business (formerly Yandex.Справочник) is the **most important local SEO tool** for Yandex. The organization card appears in Yandex Maps, Yandex Search local pack, and Navigator.

#### Required Card Optimization

| Field | Requirement |
|-------|-------------|
| **Name** | Exact legal name, no keyword stuffing |
| **Category** | Select all applicable categories (Медицинский центр, Маммолог, Гинеколог, etc.) |
| **Address** | Complete with postal code, city code |
| **Phone numbers** | All active phone numbers |
| **Website** | `https://odintsovclinic.ru` |
| **Working hours** | Exact hours per day |
| **Description** | 500-1000 chars with natural keywords |
| **Photos** | Clinic interior, exterior, doctors, equipment (min 5-10 photos) |
| **Services list** | All services with descriptions and prices |
| **Verification** | Request "blue checkmark" verification |

#### Doctor-Specific Cards (New August 2025)

Yandex now creates separate offers for each Doctor + Clinic + Service + Specialty combination. This means:
- Each doctor can appear in search for their specialty
- Real appointment conditions and prices are shown
- Doctor profiles on the site should match Yandex Business data

#### Reviews Strategy

- Clinics with ratings above 4.5 receive 35-40% more clicks
- Actively respond to ALL reviews (positive and negative)
- Encourage satisfied patients to leave reviews on Yandex Maps
- Reviews are a direct ranking factor in Yandex Maps

### Other Local Directories

| Platform | Priority | Action |
|----------|----------|--------|
| **Yandex Business** | Critical | Full profile, verification, reviews |
| **2GIS** | High | Full profile with services |
| **Google Business Profile** | High | For dual search engine coverage |
| **ProDoctorov** | High | Already linked — maintain ratings |
| **Zoon** | Medium | Create/claim profile |
| **Yell.ru** | Medium | Create/claim profile |
| **Flamp** | Medium | Monitor reviews |

### NAP Consistency

**NAP** (Name, Address, Phone) must be **identical** across all platforms:
- Same formatting of phone number
- Same exact address string
- Same business name

Sources:
- [Revvy: Business Card Setup 2025](https://revvy.ai/blog/tpost/2peuhrua61-oformlenie-biznesa-na-yandeks-kartah-v-2)
- [Altera-Media: Doctor Cards in Yandex](https://www.altera-media.com/information/expert/kartochki-s-vrachami-v-yandekse/)
- [Rush Analytics: Yandex Maps Promotion](https://www.rush-analytics.ru/blog/prodvizhenie-v-yandeks-kartakh)
- [Medesk: Medical SEO 2025](https://www.medesk.ru/blog/prodvizenie-medicinskih-saitov/)

---

## 8. Regional Targeting (Geotargeting)

### How Yandex Determines Region

Three sources (in priority order):
1. **Yandex Business** — automatic from organization registration
2. **Yandex Webmaster** — manual assignment
3. **Site content** — address, phone code, regional mentions

### Configuration

1. **Yandex Webmaster**: Представление в поиске > Региональность > Set to "Санкт-Петербург"
2. **Yandex Business**: Ensure clinic address is registered
3. **On-site signals**:
   - Full address on contact page and footer
   - Local phone code (+7 812)
   - Regional mentions in content ("в Санкт-Петербурге", "СПб")
   - GEO meta tags (`geo.region=RU-SPE`, `geo.placename=Санкт-Петербург`)

### Limits

- **1 region per domain** normally
- Up to **7 regions** possible via Yandex Webmaster for multi-location businesses
- Subdomains can have separate regional assignments (`spb.example.com`)
- Regional assignment does NOT exclude the site from other regions — it's a ranking boost for the target region

### Requirements for Regional Approval

- Contact information displayed prominently
- Site accessible and pages render properly
- No malware
- Complete address including postal code and city dialing code
- Content relevant to the assigned region

### Geo-Dependent vs Geo-Independent Queries

Yandex classifies queries as:
- **Geo-dependent**: "маммолог Санкт-Петербург", "клиника рядом" — regional bias applied
- **Geo-independent**: "что такое фиброаденома" — no regional bias

For medical clinics, ~60% of service queries are geo-dependent.

Sources:
- [Yandex Official: Regionality](https://yandex.ru/support/webmaster/ru/site-geography/site-region)
- [Akiwa: Regional Binding Guide](https://akiwa.ru/blog/privyazka-sayta-k-regionu-v-yandeks-vebmastere-otvety-na-populyarnye-voprosy/)
- [AreaLIdea: Region for Site](https://blog.arealidea.ru/seo-blitz/kak-ukazat-region-dlya-sayta/)

---

## 9. Behavioral Factors (Yandex-Specific)

### Why This Matters More for Yandex

Yandex's MatrixNet algorithm (updated with Vega v2 in March 2025) makes behavioral factors the **dominant ranking signal** — more important than links or on-page optimization.

### Key Behavioral Metrics

| Metric | Weight | How to Improve |
|--------|--------|----------------|
| **CTR in SERP** | ~0.8 | Optimize title/description, use structured data for rich snippets |
| **Dwell time** | ~0.75 | Engaging content, multimedia, internal links |
| **Bounce rate** | High | Fast loading, relevant content matching query intent |
| **Return to search** | High | Fully answer user's question on the page |
| **Direct visits** | Medium | Brand recognition, offline marketing |
| **Repeat visits** | Medium | Useful content that users bookmark/return to |
| **Pages per session** | Medium | Internal linking, related content blocks |
| **Scroll depth** | Medium | Content structure, visual hierarchy |

### Improvement Strategies for Medical Sites

1. **Fast loading**: Target <3 seconds (already optimized with Astro SSG)
2. **Rich content**: Include images, infographics, video fragments on service pages
3. **Internal linking**: Related articles block, doctor cross-links, condition-to-service links
4. **Snippet optimization**: Schema.org markup for star ratings, FAQ, breadcrumbs
5. **Answer user intent**: Each page should fully answer the query it targets
6. **Clear CTA**: Prominent appointment booking button reduces "return to search" behavior
7. **Mobile UX**: Fast, usable mobile experience (StickyCTA already implemented)

### What NOT to Do

- **Never "накрутка ПФ"** (behavioral factor manipulation) — Yandex actively detects and penalizes this
- Don't create doorway pages for different keywords
- Don't use aggressive pop-ups that increase bounce rate

Sources:
- [Kokoc: Behavioral Factors](https://kokoc.com/blog/povedencheskie-faktory-sajta/)
- [PromoPult: Behavioral Factor Optimization](https://blog.promopult.ru/seo/chto-takoe-povedencheskie-faktory-i-kak-ix-optimizirovat.html)
- [Ashmanov: Behavioral Factors in Yandex and Google](https://www.ashmanov.com/education/articles/povedencheskie-faktory/)
- [Habr: Behavioral Factors in Yandex](https://habr.com/ru/articles/902022/)

---

## 10. Commercial Ranking Factors for Medical Sites

Yandex applies **separate ranking algorithms for commercial queries**. For medical clinics, the following commercial factors are critical:

### Contact and Trust Signals

| Factor | Check |
|--------|-------|
| Multiple contact methods | Phone, email, messengers, online booking |
| Full legal information | ОГРН, ИНН, лицензия displayed |
| Physical address with map | Interactive or static map on contacts page |
| About page | Company history, mission, team |
| Privacy policy | Required by law and by Yandex |
| HTTPS | Mandatory for medical sites |
| License display | Medical license prominently shown |

### Service Page Requirements

| Factor | Check |
|--------|-------|
| Detailed service descriptions | Not just names but full content per service |
| Pricing information | Transparent prices or price ranges |
| Doctor assignment | Which doctor performs which service |
| Online booking | CTA button on every service page |
| Patient reviews | Real reviews with dates and names |
| FAQ sections | Common questions per service |

### E-E-A-T for Medical (Proxima Signals)

Since 2021, Yandex uses "Proxima" quality signals similar to Google's E-A-T:

| Signal | Implementation |
|--------|---------------|
| **Experience** | Doctor bios with personal experience, patient reviews |
| **Expertise** | Degrees, certifications, scientific publications |
| **Authoritativeness** | ProDoctorov ratings, media appearances, TV links |
| **Trustworthiness** | License display, real contact info, verified Yandex Business card |

### Specific Checks for Medical Clinics

- [ ] All doctors have full profile pages with photo, education, experience
- [ ] Scientific publications listed (Одинцов has publications — good)
- [ ] ProDoctorov links present and ratings visible
- [ ] TV/media appearances documented
- [ ] Medical license displayed on the site
- [ ] Prices are transparent (at least ranges)
- [ ] Online appointment booking available
- [ ] Multiple communication channels (phone, Telegram, VK)
- [ ] Patient reviews section with real reviews

Sources:
- [VC.ru: Commercial Factors for Medical Sites](https://vc.ru/seo/87061-faktory-ranzhirovaniya-medicinskih-saitov-po-kommercheskim-zaprosam)
- [WillDay: Commercial Factors 2026](https://willday.ru/blog/kommercheskie-faktory-ranzhirovaniya-polnyy-spisok/)
- [Pixel Tools: Commercial Factors Checklist](https://tools.pixelplus.ru/optimization/kommercheskie-faktory)
- [SiteClinic: Commercial Factors](https://siteclinic.ru/blog/internal-optimization/kommercheskie-faktory-ranzhirovaniya/)
- [Webolution: Medical SEO 2025](https://webolution.ru/blog/seo-prodvizhenie-saytov-meditsinskikh-tsentrov-i-klinik-v-2024-godu/)

---

## 11. YMYL and Medical Content in Yandex

### YMYL in Yandex Context

Medical websites fall under YMYL (Your Money or Your Life) category in both Google and Yandex. Yandex has progressively tightened quality requirements for medical content since 2021 with the introduction of Proxima quality signals.

### Requirements for Medical Content

1. **Author attribution**: Every article must have a named author who is a medical professional
   - Full name with credentials (степень, специализация)
   - Link to the doctor's profile page
   - Photo of the author
   - Contact information

2. **Evidence-based content**: Articles must reference:
   - Current clinical guidelines
   - Scientific research
   - Official medical protocols
   - No unsubstantiated claims

3. **Medical disclaimers**: Include on all medical content pages:
   - "Информация не является руководством к самолечению"
   - Recommendation to consult a doctor

4. **Freshness**: Medical content should show:
   - Publication date
   - Last updated date
   - Review/verification by a medical professional

5. **No harmful advice**: Never recommend:
   - Self-diagnosis
   - Self-medication
   - Stopping prescribed treatment
   - Alternative medicine as replacement for evidence-based treatment

### What odintsovclinic.ru Already Does Well

- Author attribution with `authorSlug` linking to doctor profiles
- Physician JSON-LD on doctor pages
- MedicalWebPage JSON-LD on blog articles
- ProDoctorov links for external E-E-A-T validation
- Scientific publications listed for Dr. Одинцов
- TV appearances documented

### Gaps to Address

- [ ] Add "Last reviewed" dates to medical articles
- [ ] Add explicit medical disclaimers to condition pages
- [ ] Consider adding references/citations to medical articles
- [ ] Ensure all blog articles have doctor-authors (not generic "clinic" authorship)

Sources:
- [PromoPult: SEO for YMYL](https://blog.promopult.ru/seo/seo-dlya-nishi-ymyl.html)
- [PR-CY: Medical YMYL Promotion](https://pr-cy.ru/news/p/7630-kak-prodvigat-sayty-v-meditsinskoy-tematike)
- [DigitalStrategy: Medical SEO YMYL](https://digitalstrategy.ru/blog/statya-seo-dlya-medicinskogo-centra/)
- [Rush Analytics: Medical SEO](https://www.rush-analytics.ru/blog/seo-dlya-medicinskih-saytov)

---

## 12. Yandex Indexing Specifics

### robots.txt Best Practices for Yandex

```
User-agent: Yandex
Disallow: /admin/
Disallow: /api/
Disallow: /blog-images
Clean-param: utm_source&utm_medium&utm_campaign&utm_term&utm_content /
Clean-param: yclid /
Clean-param: fbclid /
Clean-param: gclid /
Crawl-delay: 1

User-agent: *
Disallow: /admin/
Disallow: /api/

Sitemap: https://odintsovclinic.ru/sitemap-index.xml
```

### Key Indexing Differences

| Aspect | Detail |
|--------|--------|
| **Indexing speed** | Slower than Google — days to weeks for new pages |
| **robots.txt size** | Max 500 KB (vs no practical limit for Google) |
| **Clean-param** | Yandex-only directive to handle URL parameters |
| **Host** | Deprecated — use 301 redirects + Webmaster settings |
| **JavaScript** | Cannot render client-side JS well — SSG/SSR required |
| **Crawl-delay** | Respected by Yandex (Google ignores it) |
| **Sitemap** | Standard support; submit via Webmaster for faster indexing |
| **Original texts** | Yandex Webmaster tool to claim content authorship before indexing |

### Speeding Up Indexation

1. Submit sitemap in Yandex Webmaster
2. Enable "crawling by counter" (Metrica integration)
3. Use "Original texts" tool for important new articles
4. Request re-indexing of specific URLs in Webmaster
5. Ensure internal linking reaches all pages within 3 clicks
6. Regular content updates signal an active site

### Common Indexing Problems

- Pages with `noindex` or hidden behind JS
- Duplicate content (www vs non-www, http vs https, trailing slashes)
- Soft 404 pages (200 status but empty content)
- Server errors (5xx) during crawl
- Extremely slow server response (>5s)
- robots.txt blocking important pages

Sources:
- [Yandex Official: robots.txt](https://yandex.ru/support/webmaster/ru/controlling-robot/robots-txt)
- [Rush Analytics: robots.txt Errors](https://www.rush-analytics.ru/blog/oshibki-v-robots)
- [Intelsib: robots.txt Configuration](https://intelsib.ru/article/nastroyka-robots-txt/)

---

## 13. Actionable Checklist for odintsovclinic.ru

### Priority 1 — Yandex Webmaster Setup

- [ ] Register site in Yandex Webmaster
- [ ] Add `<meta name="yandex-verification">` to `Layout.astro`
- [ ] Set region to "Санкт-Петербург"
- [ ] Submit sitemap URL
- [ ] Connect Yandex Metrica counter
- [ ] Enable "Обход по счетчикам" (crawling by counter)
- [ ] Review and fix any Diagnostics errors

### Priority 2 — Yandex Business

- [ ] Create/claim organization card in Yandex Business
- [ ] Fill ALL fields (name, address, phones, hours, description, photos)
- [ ] Add all service categories (Маммология, Гинекология, Эндокринология, Нутрициология)
- [ ] Upload clinic photos (interior, exterior, equipment)
- [ ] Add all doctors with specialties
- [ ] Request verification (blue checkmark)
- [ ] Set up review monitoring and response process

### Priority 3 — Technical SEO for Yandex

- [ ] Update `robots.txt` with Yandex-specific directives (Clean-param, Crawl-delay)
- [ ] Verify all pages render as static HTML (no JS-only content)
- [ ] Validate structured data at https://webmaster.yandex.ru/tools/microtest/
- [ ] Check for duplicate URLs (trailing slashes, www redirects)
- [ ] Verify page load speed <3 seconds on mobile
- [ ] Confirm proper 301 redirects from old URLs

### Priority 4 — Content & E-E-A-T

- [ ] Add medical disclaimers to condition pages and blog articles
- [ ] Add "Last reviewed: [date]" to medical articles
- [ ] Ensure all blog articles have doctor-author attribution
- [ ] Submit important articles to "Original texts" before publishing
- [ ] Add references/citations to key medical articles
- [ ] Review content for unsupported medical claims

### Priority 5 — Structured Data Enhancement

- [ ] Validate all JSON-LD markup in Yandex validator
- [ ] Ensure MedicalBusiness has all required properties for Yandex snippets
- [ ] Ensure FAQPage markup on FAQ sections for mobile rich results
- [ ] Ensure BreadcrumbList markup on all inner pages
- [ ] Consider adding AggregateRating to the main page (from ProDoctorov data)

### Priority 6 — Behavioral Optimization

- [ ] Install Yandex Metrica (in addition to existing analytics)
- [ ] Monitor bounce rate, dwell time, pages/session
- [ ] Optimize meta titles/descriptions for higher CTR in Yandex SERP
- [ ] Ensure every service page has a clear CTA
- [ ] Monitor "return to search" patterns via Metrica

---

## Appendix: Yandex SEO Tools

| Tool | URL | Purpose |
|------|-----|---------|
| Yandex Webmaster | https://webmaster.yandex.ru | Site management, indexing, diagnostics |
| Yandex Metrica | https://metrika.yandex.ru | Analytics, behavioral data |
| Yandex Business | https://business.yandex.ru | Organization card, local SEO |
| Structured Data Validator | https://webmaster.yandex.ru/tools/microtest/ | Markup validation |
| Yandex XML | https://xml.yandex.ru | SERP position checking |
| Yandex Wordstat | https://wordstat.yandex.ru | Keyword research |
| Yandex Audit Tool | Webmaster > Diagnostics | Technical audit checklist |
