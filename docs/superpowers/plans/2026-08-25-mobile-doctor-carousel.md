# Mobile Doctor Coverflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the nearly full-width mobile doctor slides with a circular layered coverflow of frontal transparent doctor silhouettes and one dimensional full-width information plinth.

**Architecture:** `MobileDoctorCarousel.jsx` remains the only interactive island and owns a discrete active index. Each doctor receives a circular visual position (`current`, `previous`, `next`, second neighbour, or hidden), while CSS turns those positions into the coverflow. Two-item results receive one inert visual clone to keep both sides balanced. A single information plinth renders outside the transparent portrait stack and changes with the active doctor.

**Tech Stack:** Astro 4, React 18, JavaScript, existing Lucide React icons, CSS variables, Vitest, Testing Library, Playwright CLI.

---

### Task 1: Specify the coverflow behaviour

**Files:**

- Modify: `src/components/MobileDoctorCarousel.test.jsx`
- Test: `src/components/MobileDoctorCarousel.test.jsx`

- [x] **Step 1: Write a failing circular-position test**

```jsx
it('keeps the previous and next doctors visible around the first doctor', () => {
  const { container } = render(<MobileDoctorCarousel doctors={DOCTORS} label="Объёмная карусель" />)
  const positions = Array.from(container.querySelectorAll('[data-coverflow-position]'), (slide) => slide.dataset.coverflowPosition)
  expect(positions).toEqual(['current', 'next', 'next-far', 'previous'])
})
```

- [x] **Step 2: Write a failing pointer-swipe test**

```jsx
it('moves to the next doctor after a horizontal pointer swipe', () => {
  render(<MobileDoctorCarousel doctors={DOCTORS} label="Свайп врачей" />)
  const stage = screen.getByRole('group', { name: 'Листать врачей' })
  fireEvent.pointerDown(stage, { pointerId: 7, clientX: 260, clientY: 140 })
  fireEvent.pointerUp(stage, { pointerId: 7, clientX: 160, clientY: 145 })
  expect(screen.getByRole('group', { name: /Каримов Руслан Фаридович/ })).toHaveAttribute('aria-current', 'true')
})
```

- [x] **Step 3: Change the active-link contract to one shared information area**

```jsx
it('renders one profile action for the active doctor', () => {
  render(<MobileDoctorCarousel doctors={DOCTORS} label="Профили врачей" />)
  expect(screen.getAllByRole('link', { name: /Профиль врача/ })).toHaveLength(1)
})
```

- [x] **Step 4: Verify RED**

Run: `bun run test:run -- src/components/MobileDoctorCarousel.test.jsx`

Expected: failures because the current component has no circular position contract, pointer swipe, or shared plinth.

### Task 2: Implement discrete circular coverflow state

**Files:**

- Modify: `src/components/MobileDoctorCarousel.jsx`
- Test: `src/components/MobileDoctorCarousel.test.jsx`

- [x] **Step 1: Add the circular position function**

```jsx
function coverflowPosition(index, activeIndex, length) {
  if (index === activeIndex) return 'current'
  const forward = (index - activeIndex + length) % length
  const backward = (activeIndex - index + length) % length
  if (forward === 1) return 'next'
  if (backward === 1) return 'previous'
  if (forward === 2) return 'next-far'
  if (backward === 2) return 'previous-far'
  return 'hidden'
}
```

- [x] **Step 2: Add discrete pointer gesture handling**

```jsx
const pointerStartRef = useRef(null)
function handlePointerDown(event) {
  if (!event.isPrimary) return
  pointerStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
}
function handlePointerUp(event) {
  const start = pointerStartRef.current
  pointerStartRef.current = null
  if (!start || start.pointerId !== event.pointerId) return
  const horizontal = event.clientX - start.x
  const vertical = event.clientY - start.y
  if (Math.abs(horizontal) < 48 || Math.abs(horizontal) <= Math.abs(vertical)) return
  moveTo(activeIndex + (horizontal < 0 ? 1 : -1))
}
```

- [x] **Step 3: Render the circular portrait stack and shared plinth**

```jsx
const activeDoctor = doctors[activeIndex]
const activeSpecialty = activeDoctor.specialization.split(',')[0].trim()
```

Each article receives `data-coverflow-position`, only visible positions receive a `<picture>`, the two-doctor case mirrors its neighbour, and `mobile-doctor-info` moves into one `mobile-doctor-plinth` after the portrait stack. Visible sources use the optimized transparent `photoMobile` derivative.

- [x] **Step 4: Verify GREEN**

Run: `bun run test:run -- src/components/MobileDoctorCarousel.test.jsx`

Expected: all component tests pass without warnings.

### Task 3: Build the dimensional responsive composition

**Files:**

- Modify: `src/styles/global.css`

- [x] **Step 1: Replace the scroll track geometry with a flat layered stage**

```css
.mobile-doctor-carousel-track {
  position: absolute;
  inset: 0 0 calc(var(--mobile-doctor-plinth-height) - 1.75rem);
  touch-action: pan-y;
}
.mobile-doctor-slide {
  position: absolute;
  top: 3.5rem;
  bottom: 0;
  left: 50%;
  width: min(70vw, 18.8rem);
}
```

- [x] **Step 2: Add frontal near and far depth states**

```css
.mobile-doctor-slide[data-coverflow-position='previous'] {
  transform: translate3d(calc(-50% - min(24vw, 7.25rem)), 1.15rem, 0) scale(.757576);
}
.mobile-doctor-slide[data-coverflow-position='next'] {
  transform: translate3d(calc(-50% + min(24vw, 7.25rem)), 1.15rem, 0) scale(.757576);
}
```

Second neighbours use `min(41vw, 12rem)`, `scale(.573921)`, a lower vertical position, and lower opacity. All layers remain front-facing with zero Z translation; slides have transparent backgrounds and hidden slides ignore pointer input.

- [x] **Step 3: Add one full-width dimensional plinth**

```css
.mobile-doctor-plinth {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  min-height: var(--mobile-doctor-plinth-height);
  border-radius: 2rem 2rem 0 0;
}
```

The complete rule uses existing surface and accent tokens, an upper lip, inner highlights, a tinted shadow, and solid transparency fallbacks.

- [x] **Step 4: Add reduced-motion geometry**

Under `prefers-reduced-motion: reduce`, remove transitions while keeping the same flat neighbour translations and scales so the cards remain spatially understandable.

### Task 4: Document and verify the finished carousel

**Files:**

- Modify: `README.md`
- Inspect: `/doctors` and `/`

- [x] **Step 1: Update the component map**

Change the carousel description from a full-screen swipe carousel to a circular mobile flat-projection coverflow with a shared information plinth.

- [x] **Step 2: Run targeted checks**

Run:

```bash
bun run test:run -- src/components/MobileDoctorCarousel.test.jsx src/components/pages/Doctors.test.jsx src/components/home/DoctorsSection.test.jsx
bunx eslint src/components/MobileDoctorCarousel.jsx src/components/MobileDoctorCarousel.test.jsx
bun run build
```

Expected: zero carousel-scoped failures and build exit code 0. Record unrelated repository-wide failures separately.

- [x] **Step 3: Perform browser QA**

Inspect the default and an alternate accent palette at 320 x 568, 375 x 812, and 430 x 932. Verify visible front-facing neighbours, exact depth scales, clean alpha edges, masked crop, control targets, pointer swipe, filter reset, StickyCTA clearance, and ThemeSwitcher clearance.

- [x] **Step 4: Review the scoped diff**

Confirm only the approved carousel, its tests, the scoped CSS block, its spec/plan, and README wording changed. Do not commit the dirty user-owned worktree.
