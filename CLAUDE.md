# CLAUDE.md — clod project instructions

Operate as an autonomous senior builder: principal architect, senior full-stack engineer, senior DevOps engineer, senior security engineer, senior UX/UI designer, senior QA lead, and senior technical writer.

Always prefer creating real files over giving abstract advice.
Do not pause unless a true external dependency blocks progress.
Use pragmatic defaults and build production-minded solutions first.
Do not overengineer — choose a strong default and document it when a decision is not critical.

## Development Methodology: TDD + Elegant Objects (adapted)

This project follows **Test-Driven Development** and coding principles adapted from [yegor256/prompt](https://github.com/yegor256/prompt) and [yegor256/at](https://github.com/yegor256/at) (Angry Tests) for a JavaScript/Astro/React codebase.

### TDD Workflow (mandatory for behavior changes)

1. **Write a failing test first** that reproduces the bug or describes the new feature
2. Write the **minimum implementation** to make the test pass
3. **Refactor** while keeping all tests green
4. Every behavior change MUST be accompanied by tests

### Angry Tests Principles

- One assertion per test case; place it as the last statement
- Keep tests shorter than a dozen lines; aim for single-statement tests
- Name tests as full English sentences: `it('creates session cookie with valid credentials')`
- Never share mutable state between tests — no shared `beforeAll`/`beforeEach`
- Prepare clean state at the start; don't clean up after
- Favor fake objects and stubs over mock frameworks
- Use irregular inputs (non-ASCII, Unicode, edge cases) — no `"foo"`, `"bar"`
- Inline small fixtures; generate large fixtures at runtime
- Tests must pass without Internet; use ephemeral ports and timeouts
- Don't assert on side effects (logs), error message strings, or getters/setters

### Elegant Objects Principles (adapted for JS modules)

- **Fail fast:** throw errors early with rich context — never return silent fallbacks
- **Immutability:** favor `const`, `Object.freeze`, never mutate props, arguments, or shared objects
- **No utility "god files"** with unrelated static helpers — use focused modules
- **No `null` ping-pong** — prefer explicit validation and meaningful defaults over passing `null`/`undefined` through layers
- **No blank lines** inside function bodies (means the function does too much)
- **No inline comments** — code should be self-explanatory; use JSDoc only for non-obvious "why"
- Error/log messages: single sentence, no trailing period, include full context
- Composition over inheritance; keep modules small with one reason to change
- Variables: descriptive nouns; functions: verbs (CQRS-style naming)

## Project memory

@README.md

## Coding & testing rules

@AGENTS.md
@.cursor/rules/core-stack.mdc
@.cursor/rules/coding-principles.mdc
@.cursor/rules/tdd-testing.mdc
@.cursor/rules/astro-pages-and-react-islands.mdc
@.cursor/rules/react-patterns.mdc
@.cursor/rules/error-handling.mdc
@.cursor/rules/api-and-security.mdc
@.cursor/rules/documentation-and-delivery.mdc
@.cursor/rules/git-workflow.mdc
