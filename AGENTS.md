# AI Agent Instructions

**Project:** Клиника Одинцова (`clod`)
**Last Updated:** 2026-03-26

## Context Loading Order

1. Read `CLAUDE.md`
2. Read `README.md`
3. Read the relevant file in `.cursor/rules/`
4. Read the target code before editing it
5. Read the closest existing tests before changing behavior

## Mandatory Behaviors

### Before Writing Code

- Understand whether the change belongs to presentation, domain logic, or infrastructure
- Follow existing Astro, React, and JavaScript patterns in the target area before introducing a new one
- Prefer improving the current structure over rewriting it
- Do not invent dependencies, commands, routes, or environment variables without checking the repository first

### TDD Workflow

1. Reproduce a bug or feature expectation with a failing test first when behavior changes
2. Implement the minimum code needed to make the test pass
3. Refactor while keeping tests green
4. Run the smallest relevant validation first, then broader validation if risk justifies it

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

## Domain-Specific Rules

| Domain | Rule File | Scope |
|--------|-----------|-------|
| Project context | `.cursor/rules/core-stack.mdc` | Stack, architecture, delivery expectations |
| Coding rules | `.cursor/rules/coding-principles.mdc` | DDD-lite, fail fast, naming, module design |
| Tests | `.cursor/rules/tdd-testing.mdc` | Red-Green-Refactor, unit and E2E boundaries |
| Astro + React | `.cursor/rules/astro-pages-and-react-islands.mdc` | Routing, islands, SEO, rendering boundaries |
| UI components | `.cursor/rules/react-patterns.mdc` | React component structure, styling, accessibility |
| Error handling | `.cursor/rules/error-handling.mdc` | Guards, validation, user-facing and server errors |
| API and security | `.cursor/rules/api-and-security.mdc` | Validation, CSRF/origin checks, uploads, secrets |
| Delivery and docs | `.cursor/rules/documentation-and-delivery.mdc` | README, env docs, validation checklist |
| Git workflow | `.cursor/rules/git-workflow.mdc` | Safe git hygiene and change isolation |

## Key Architecture Constraints

- This is an **Astro 4** site with **React 18 islands**, not a SPA and not a Next.js app
- File-based routing lives in `src/pages/**/*.astro`
- Prefer **Astro-first** rendering for static and SEO-critical content
- Use React only for interactive islands, admin UI, or genuinely stateful widgets
- `src/lib/**` is the home for reusable domain logic and invariant checks
- `src/pages/api/**` contains transport-layer handlers, not presentation logic
- Public content is Russian-first and SEO-sensitive, so preserve metadata, canonical URLs, headings, and JSON-LD when touching pages
- Security-sensitive areas include admin auth, uploads, analytics endpoints, and any form that accepts user input

## What NOT to Do

- Do not add client-side React where Astro server rendering is enough
- Do not weaken validation, auth checks, rate limits, or security headers for convenience
- Do not add placeholder secrets or fake production credentials in committed code
- Do not bypass tests for behavior changes in `src/lib`, `src/components`, or `src/pages/api`
- Do not move domain logic into large UI components when it can live in `src/lib`
- Do not commit generated artifacts like `dist/` unless the user explicitly asks for it
