---
description: Comprehensive SEO audit for Astro 7 medical clinic site (technical SEO, E-E-A-T, JSON-LD, Core Web Vitals, local/GEO SEO, Yandex SEO)
allowed-tools: Bash, Read, Glob, Grep, Agent, Write, Edit
---

## Context

- Project root: !`pwd`
- Public pages count: !`ls src/pages/*.astro src/pages/**/*.astro 2>/dev/null | grep -v admin | grep -v api | grep -v blog-images | wc -l`
- Blog posts count: !`ls src/content/blog/*.md 2>/dev/null | wc -l`
- Doctors count: !`grep -c "slug:" src/lib/doctors-data.js 2>/dev/null || echo 0`

## Arguments

$ARGUMENTS

## Instructions

Read the full skill instructions from `.claude/skills/seo-audit/SKILL.md` and execute the audit according to the requested scope.

Reference files available:
- `.claude/skills/seo-audit/references/seo-checklist.md` — detailed checklist with ~90 checks and severity levels
- `.claude/skills/seo-audit/references/YANDEX_SEO.md` — Yandex-specific SEO requirements (IKS, Webmaster, behavioral factors, Proxima, structured data)
- `.claude/skills/seo-audit/scripts/seo-quick-check.sh` — fast automated pre-scan (run first for a quick overview)
- `.claude/skills/seo-audit/scripts/audit.ts` — cheerio-based HTML parser for JSON-LD and meta tag validation

### Workflow

1. Run the quick-check script first: `bash .claude/skills/seo-audit/scripts/seo-quick-check.sh .`
2. Based on arguments, run the relevant audit phases from SKILL.md
3. For deep HTML/JSON-LD analysis, use the audit.ts script: `bun .claude/skills/seo-audit/scripts/audit.ts`
4. Produce a structured report with severity ratings and actionable fixes
5. Calculate overall SEO score (1-10)

### Argument Handling

- No argument or `full` — run all audit phases
- `page <path>` — audit a single page
- `blog` — audit only blog content
- `schema` — audit only JSON-LD structured data
- `links` — audit only internal linking
- `yandex` — audit Yandex-specific requirements
- `fix` — run audit and auto-fix safe issues
- `quick` — run only the quick-check script

### Report Format

Output as markdown with severity table, grouped issues (CRITICAL > HIGH > MEDIUM > LOW), passed checks, and prioritized recommendations.
