# AI Agent Instructions

**Project:** Клиника Одинцова (`clod`)
**Last Updated:** 2026-03-30

## Context Loading Order

1. Read `CLAUDE.md` — project principles, methodology, design system
2. Read `README.md` — current state, structure, routes, deployment
3. Read the relevant `.cursor/rules/*.mdc` file for the domain you're working in
4. Read the target code before editing it
5. Read the closest existing tests before changing behavior

## Mandatory Behaviors

### Before Writing Code

- Understand whether the change belongs to presentation, domain logic, or infrastructure
- Read existing code in the target directory before modifying
- Follow existing Astro, React, and JavaScript patterns in the target area before introducing a new one
- Prefer improving the current structure over rewriting it
- Do not invent dependencies, commands, routes, or environment variables without checking the repository first
- Use extensive debug-logging when a problem is hard to fix

### TDD Workflow (Non-Negotiable)

1. Write a failing test first (Red) for bugs and new behavior
2. Write minimum implementation to pass (Green)
3. Refactor while keeping tests green
4. Run the smallest relevant validation first, then broader validation if risk justifies it
5. See `.cursor/rules/tdd-testing.mdc` for Angry Tests principles
6. See `.cursor/rules/coding-principles.mdc` for Elegant Objects rules

TDD is mandatory for changes in:
- `src/lib/**`
- `src/components/**`
- `src/pages/api/**`
- auth, upload, validation, analytics, filtering, and admin behavior

For purely editorial content or non-behavioral styling tweaks, use judgment and test the risky paths instead of forcing synthetic tests.

### Documentation Workflow

- Update `README.md` after meaningful changes to features, structure, commands, environment variables, or architectural conventions
- If a new environment variable is introduced, update `.env.example` in the same change
- If a new project rule is introduced, keep `.cursor/rules/`, `AGENTS.md`, and `CLAUDE.md` aligned
- Be verbose and direct in README.md and code documentation
- Keep documentation as short as possible, no code duplication in docs

### Pre-Deploy Check

- Before finalizing admin UI changes, verify that every state-changing API call includes CSRF/origin handling
- Before finalizing API changes, verify validation, auth, and rate limiting are intact

## Domain-Specific Rules

| Domain | Rule File | Scope |
|--------|-----------|-------|
| Project context | `.cursor/rules/core-stack.mdc` | Stack, architecture, delivery expectations |
| Coding rules | `.cursor/rules/coding-principles.mdc` | DDD-lite, Elegant Objects (adapted), fail fast, naming, module design |
| Tests | `.cursor/rules/tdd-testing.mdc` | Angry Tests, Red-Green-Refactor, unit and E2E boundaries |
| Astro + React | `.cursor/rules/astro-pages-and-react-islands.mdc` | Routing, islands, SEO, rendering boundaries |
| UI components | `.cursor/rules/react-patterns.mdc` | React component structure, styling, accessibility |
| Error handling | `.cursor/rules/error-handling.mdc` | Guards, validation, user-facing and server errors |
| API and security | `.cursor/rules/api-and-security.mdc` | Validation, CSRF/origin checks, uploads, secrets, rate limiting |
| Delivery and docs | `.cursor/rules/documentation-and-delivery.mdc` | README, env docs, validation checklist, pre-commit review |
| Git workflow | `.cursor/rules/git-workflow.mdc` | Safe git hygiene, change isolation, commit quality |

## Practical Route Map

When the change scope is unclear, start by identifying the affected area:

- `src/pages/**/*.astro` or `src/layouts/**`:
  - Read `astro-pages-and-react-islands.mdc`
  - Check SEO impact (meta, JSON-LD, canonical, headings)
  - Run `bun run build` to verify static generation
- `src/components/**/*.jsx`:
  - Read `react-patterns.mdc` + `error-handling.mdc`
  - Run `bun run test:run` for component tests
- `src/lib/**`:
  - Read `coding-principles.mdc`
  - TDD mandatory — write test first
  - Run `bun run test:run`
- `src/pages/api/**`:
  - Read `api-and-security.mdc`
  - TDD mandatory — write test first
  - Verify origin/auth/validation/rate-limiting
- `src/middleware.js`:
  - Read `api-and-security.mdc`
  - Security-sensitive — verify headers, CSRF, rate limits
- `src/styles/global.css` or `tailwind.config.js`:
  - Read `react-patterns.mdc`
  - Prefer clay utility classes over inline styles
- `docker-compose.yml`, `nginx*.conf`, `Dockerfile`, `scripts/**`:
  - Infrastructure-sensitive — verify deploy flow
  - Run `bun run build` to confirm build works
- `.env*`, secrets, credentials:
  - Never commit secrets
  - Update `.env.example` and `README.md`

## Key Architecture Constraints

- This is an **Astro 4** site with **React 18 islands**, not a SPA and not a Next.js app
- File-based routing lives in `src/pages/**/*.astro`
- Prefer **Astro-first** rendering for static and SEO-critical content
- Use React only for interactive islands, admin UI, or genuinely stateful widgets
- `src/lib/**` is the home for reusable domain logic and invariant checks
- `src/pages/api/**` contains transport-layer handlers, not presentation logic
- Public content is Russian-first and SEO-sensitive, so preserve metadata, canonical URLs, headings, and JSON-LD when touching pages
- Security-sensitive areas include admin auth, uploads, analytics endpoints, and any form that accepts user input
- Do not mix Astro routing with React Router or Next.js patterns
- Do not add TypeScript-only conventions to JavaScript code without migration plan

## What NOT to Do

- Do not add client-side React where Astro server rendering is enough
- Do not weaken validation, auth checks, rate limits, or security headers for convenience
- Do not add placeholder secrets or fake production credentials in committed code
- Do not bypass tests for behavior changes in `src/lib`, `src/components`, or `src/pages/api`
- Do not move domain logic into large UI components when it can live in `src/lib`
- Do not commit generated artifacts like `dist/` unless the user explicitly asks for it
- Do not create utility "god files" with unrelated static helpers — use focused modules
- Do not add blank lines inside function bodies (sign that the function does too much)
- Do not use inline comments — use JSDoc only for non-obvious "why"
- Do not add dependencies without first checking if the platform or current stack solves the problem
- Do not make unsupported legal, or compliance claims in public content
