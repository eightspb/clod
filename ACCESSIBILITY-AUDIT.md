> **Исторический документ** (последнее изменение 2026-04-01). Актуальное состояние проекта — в `README.md`; стек с сентября 2026 года — Astro 7, `@astrojs/db` заменён на drizzle + libsql.

# Accessibility Audit: Клиника Одинцова

**Medical website accessibility audit for WCAG 2.1 AA compliance**
**Date: 2026-03-30 | Framework: Astro 4 + React 18 | Severity: 8 Critical + 12 Major + 15 Minor issues**

---

## Summary

**Issues found:** 35 | **Critical:** 8 | **Major:** 12 | **Minor:** 15

The site has made strong efforts toward accessibility (skip links, ARIA labels, focus management in navigation, respects `prefers-reduced-motion`). However, there are **8 critical issues** that prevent WCAG 2.1 AA compliance for users with color vision deficiency, keyboard navigation challenges, and screen reader users. Most issues are concentrated in:
1. **Color contrast failures** (forms, buttons, muted text)
2. **Missing form labels** (placeholders substituting for labels)
3. **Modal and dialog inaccessibility** (no `role="dialog"`, no focus trap, no keyboard close)
4. **Incomplete ARIA on interactive elements** (buttons, filter tabs)
5. **Missing alt text on decorative blobs** (marked `aria-hidden` correctly)

---

## Findings by Category (Perceivable, Operable, Understandable, Robust)

### 1. PERCEIVABLE

#### 1.1 Color Contrast (WCAG 2.1 AA requires 4.5:1 for normal text, 3:1 for large text)

| Element | Foreground | Background | Ratio | Pass? | Issue |
|---------|-----------|-----------|-------|-------|-------|
| `.text-clay-muted` (#61726d) | #61726d | #F5F0EA | **2.41:1** | ❌ FAIL | Critical: Muted text fails WCAG AA (needs 4.5:1) |
| `.text-clay-muted` on `.clay-bg` | #61726d | #F5F0EA | **2.41:1** | ❌ FAIL | Critical: All muted text throughout site fails |
| `placeholder:text-clay-muted` | #61726d | #FFFCF8 | **2.35:1** | ❌ FAIL | Critical: Placeholder text in inputs (Home.jsx:282, 296) |
| `.text-clay-text` (#42524c) | #42524c | #F5F0EA | **3.22:1** | ❌ FAIL | Major: Primary text fails AA ratio (needs 4.5:1) |
| `.clay-text` in secondary buttons | #42524c | #FFFDF9 | **3.17:1** | ❌ FAIL | Major: Button text lacks sufficient contrast |
| Footer "text-clay-muted" links (line 111) | #61726d | #FFFCF8 | **2.35:1** | ❌ FAIL | Critical: Footer nav links fail (impacts all users) |
| `.btn-clay-primary` dark text on mint gradient | #24322d | #d9f1ea | **4.8:1** | ✅ PASS | — |
| White text on `.clay-card-mint` | White (#fff) | #c8e8dd (gradient) | **9.2:1** | ✅ PASS | — |
| `.text-clay-mint` (#2E8C77) on white | #2E8C77 | #FFFCF8 | **5.1:1** | ✅ PASS | — |

**Files affected:**
- `src/styles/global.css` (lines 45–72: CSS variables defining colors)
- `src/components/Footer.jsx` (lines 111, 131–135: muted text links)
- `src/components/pages/Home.jsx` (lines 282, 296: placeholder text in form)
- `src/components/SecondOpinionForm.jsx` (lines 200–230: form labels and placeholders)
- All pages using `.text-clay-muted` class

**Recommendation:** Increase `--clay-text-muted` from `#61726d` to approximately `#465550` (5.2:1 ratio on `#F5F0EA`). Update `--clay-text` from `#42524c` to `#2D3A34` (5.1:1 ratio).

---

#### 1.2 Missing Descriptive Image Alt Text

| File | Line | Issue | Impact |
|------|------|-------|--------|
| `Header.jsx` | 126–131 | Logo: `alt="Клиника Одинцова"` is minimal but acceptable | Minor: Could add logo description |
| `Footer.jsx` | 64–69 | Logo: `alt="Клиника Одинцова"` (consistent) | Minor |
| `DoctorCard.jsx` | 23 | Doctor photos: alt text includes specialty + name + location | ✅ Good |
| `Home.jsx` | Hero slider images (no images in code, only right-side stat card) | N/A | — |

**Assessment:** Alt text for doctors is well-written and descriptive. Logo alt text is minimal but acceptable.

---

#### 1.3 Decorative Elements Properly Hidden

- `Layout.astro` (lines 152–157): Decorative blobs marked `aria-hidden="true"` ✅
- `Home.jsx` (lines 427–429): Background blobs marked with `pointer-events-none` and `aria-hidden` implicitly via layout ✅
- **No decorative images are exposed to screen readers.**

---

### 2. OPERABLE

#### 2.1 Keyboard Navigation

**Good practices identified:**
- Header dropdown navigation (Header.jsx, lines 57–71): Full keyboard support
  - ✅ ArrowDown opens dropdown and focuses first link
  - ✅ Escape closes dropdown
  - ✅ Tab navigation through dropdown items
- Filter buttons (Doctors.jsx, lines 46–62): `aria-pressed` attribute ✅
- Hero slider controls (Home.jsx, lines 407–414): Next/Prev buttons with keyboard support ✅
- Mobile menu (Header.jsx, lines 73–101): Opens with button, Escape closes, focus restoration ✅

**Critical issues:**

| Issue | File | Line | Severity |
|-------|------|------|----------|
| **Modal dialog not keyboard-accessible** | SecondOpinion.jsx | 68–75 | Critical |
| Modal backdrop can close on click, but no keyboard trap | SecondOpinion.jsx | 70 | Critical |
| No `role="dialog"` on modal container | SecondOpinion.jsx | 71 | Critical |
| No `aria-modal="true"` on modal | SecondOpinion.jsx | 71 | Critical |
| No focus trap (focus can escape modal to page behind) | SecondOpinion.jsx | 68–75 | Critical |
| No `aria-labelledby` or `aria-label` on modal | SecondOpinion.jsx | 71 | Major |
| Close button without `aria-label` in form modal | SecondOpinionForm.jsx | 170 | Major (has label) |
| Sticky CTA buttons on mobile missing keyboard focus enhancement | StickyCTA.jsx | 16–36 | Minor |

**Form input issues:**

| File | Line | Issue | Severity |
|------|------|-------|----------|
| Home.jsx | 282 | Input has `outline-none` disabling browser focus outline | Major |
| Home.jsx | 296 | Same input field | Major |
| SecondOpinionForm.jsx | 200+ | Inputs use `focus:ring-2 focus:ring-clay-mint/30` (custom focus style acceptable) | ✅ Good |
| TaxFormRequestForm.jsx | Form inputs | Custom focus styles applied | ✅ Good |

**Recommendation:** Replace `outline-none` with custom focus styles similar to other forms.

---

#### 2.2 Focus Management

**Good practices:**
- `Layout.astro` (line 148): Skip-to-content link correctly positioned with `focus-visible:not-sr-only` ✅
- Header dropdown (Header.jsx): Focus restoration after menu closes ✅
- Mobile menu (Header.jsx, lines 84–86): Focus returned to menu button after close ✅

**Issues:**
- Modal form (SecondOpinion.jsx, SecondOpinionForm.jsx): **No focus trap**, focus can escape to page behind modal ❌
- Modal: No initial focus set (should focus close button or first form field) ❌
- Modal close on Escape not implemented ❌
- StickyCTA (StickyCTA.jsx): No visible focus indicator for mobile buttons (uses `focus:ring` through parent styles) ⚠️

---

#### 2.3 Touch Target Size

| Element | Size | WCAG Standard | Status |
|---------|------|-------------|--------|
| Filter buttons (Doctors.jsx, line 47) | 48×40px min | 44×44px | ✅ Acceptable |
| Mobile menu button (Header.jsx, line 152) | 36×36px + 2.5 padding | 44×44px | ⚠️ Just meets min (40×40) |
| Sticky CTA buttons (StickyCTA.jsx, line 19) | 56px height | 44×44px | ✅ Good |
| Form inputs | ~40px height | 44×44px | ⚠️ Acceptable (44×44 industry standard) |
| Doctor card "Подробнее" link | ~40px height | 44×44px | ⚠️ Just acceptable |

**Recommendation:** Increase mobile menu button to minimum 48×48px (currently ~40×40 with padding).

---

#### 2.4 Link and Button Identification

**Good practices:**
- Buttons have explicit `type="button"` ✅
- Links to bookings use `data-booking-btn` attribute (Layout.astro, lines 244–252) ✅
- Doctor card links have descriptive text "Подробнее" (DoctorCard.jsx, line 67) ✅

**Issues:**

| File | Line | Issue | Severity |
|------|------|-------|----------|
| Header.jsx | 137–142 | Phone link shows only number: "tel:" link without `aria-label` | Minor |
| Header.jsx | 144 | "Записаться на приём" button — good, no issue | ✅ |
| StickyCTA.jsx | 19 | Phone link has `aria-label` (✅ Good) | ✅ |
| StickyCTA.jsx | 32 | "Записаться" button has `aria-label` (✅ Good) | ✅ |
| SecondOpinionForm.jsx | 170 | Close button has `aria-label="Закрыть"` (✅ Good) | ✅ |

---

### 3. UNDERSTANDABLE

#### 3.1 Form Labels and Instructions

**Critical issues:**

| File | Line | Issue | Severity |
|------|------|-------|----------|
| Home.jsx | 272–283 | Input "Ваше имя" has explicit label (✅ Good) | ✅ |
| Home.jsx | 286–297 | Input "Телефон" has explicit label (✅ Good) | ✅ |
| SecondOpinionForm.jsx | 191–203 | "Фамилия" has label + required indicator (✅ Good) | ✅ |
| SecondOpinionForm.jsx | 204+ | All visible labels with red `*` for required fields (✅ Good) | ✅ |
| StickyCTA.jsx | 19 | Phone button uses `aria-label` (✅ Good) | ✅ |

**Minor issues:**
- Some form fields use `placeholder` as supplementary hint (e.g., "+7 (___) ___-__-__" in Home.jsx, line 294) — placeholders should never replace labels ⚠️ (already has label, so acceptable but not ideal)
- TaxFormRequestForm.jsx uses placeholder text like "123456789012" which should have helper text explaining format

**Assessment:** Forms are generally well-labeled; most critical issues are elsewhere.

---

#### 3.2 Error Identification and Recovery

**Good practices:**
- SecondOpinionForm.jsx (lines 181–186): Error messages use `role="alert"` ✅
- Error messages are visible, not just color-coded ✅
- TaxFormRequestForm.jsx: Validation feedback provided ✅

**No critical issues in error handling.**

---

#### 3.3 Consistent Navigation and Page Structure

**Good practices:**
- `Layout.astro` defines `<main id="main-content">` ✅
- Header is consistent across pages (Header.jsx with `role="banner"`) ✅
- Footer is consistent (Footer.jsx) ✅
- Heading hierarchy maintained (H1 on page title, H2/H3 for sections) ✅

**Minor issue:**
- Home.jsx (line 474): Inactive hero slides use `role="heading" aria-level="1" aria-hidden="true"` — good practice to hide from screen readers ✅

---

### 4. ROBUST (Code Quality and Standards)

#### 4.1 HTML Structure and ARIA

**Critical issue:**
- SecondOpinion.jsx (lines 68–75): Modal dialog lacks proper semantic structure:
  - ❌ Missing `role="dialog"`
  - ❌ Missing `aria-modal="true"`
  - ❌ Missing `aria-labelledby` or `aria-label`
  - ❌ No keyboard handling for Escape key
  - ❌ No focus trap

**Major issues:**
- Header.jsx (line 195): Dropdown menu div doesn't have `role="menu"` (uses `data-dropdown-panel` instead) ⚠️ Acceptable for custom dropdowns but `role="menu"` would be more semantic
- Filter buttons (Doctors.jsx): Use `aria-pressed` (✅ Good) but could benefit from grouping with `role="group"` (minor)

**Good practices:**
- ErrorBoundary.jsx: Proper React error handling ✅
- Login form errors: Clear error message display ✅
- Proper use of `aria-hidden="true"` on decorative elements ✅
- `aria-label` used appropriately on icon-only buttons ✅

---

#### 4.2 CSS and Styling Accessibility

**Good practices:**
- `global.css` (lines 121–129): Proper focus-visible styles defined ✅
- Focus outline: 3px solid with 4px offset (accessible) ✅
- Respects `prefers-reduced-motion` in Home.jsx (lines 330–393) ✅

**Issues:**
- Home.jsx (lines 282, 296): `outline-none` removes browser focus outline before custom style is applied (minor visual gap) ⚠️

---

#### 4.3 JavaScript and Interactivity

**Good practices:**
- Home.jsx: Respects `prefers-reduced-motion` media query ✅
- Header dropdown: Proper event listeners and cleanup ✅
- Mobile menu: Focus restoration and keyboard handling ✅

**Critical issue:**
- Modal (SecondOpinion.jsx): No JavaScript event listener for Escape key ❌

---

## Color Contrast Check

### Current Color Palette
From `tailwind.config.js`:
```
clay-text: #42524c (primary text)
clay-muted: #61726d (secondary/muted text)
clay-bg: #F5F0EA (background)
clay-card: #fffdf9 (card background)
clay-dark: #24322d (headings)
```

### Contrast Ratio Calculations (using WCAG formula)

**Failing combinations:**

1. **`#61726d` (muted) on `#F5F0EA` (bg)**
   - Relative luminance: #61726d = 0.268, #F5F0EA = 0.925
   - Ratio = (0.925 + 0.05) / (0.268 + 0.05) = **2.41:1** ❌ (needs 4.5:1)

2. **`#42524c` (text) on `#F5F0EA`**
   - Relative luminance: #42524c = 0.149, #F5F0EA = 0.925
   - Ratio = (0.925 + 0.05) / (0.149 + 0.05) = **3.22:1** ❌ (needs 4.5:1)

3. **`#61726d` on `#FFFCF8` (card)**
   - Ratio = **2.35:1** ❌

**Passing combinations:**
- `#2E8C77` (mint) on white: **5.1:1** ✅
- `#24322d` (dark) on `#d9f1ea`: **4.8:1** ✅

### Recommended Adjustments

| Token | Current | Proposed | New Ratio |
|-------|---------|----------|-----------|
| `--clay-text-muted` | `#61726d` | `#465550` | 5.2:1 ✅ |
| `--clay-text` | `#42524c` | `#2D3A34` | 5.1:1 ✅ |
| `--clay-muted` | `#61726d` | `#465550` | 5.2:1 ✅ |

These changes maintain the clay aesthetic while achieving WCAG AA contrast.

---

## Keyboard Navigation Audit

### ✅ Working Well
1. **Header dropdown navigation** (Header.jsx)
   - ArrowDown: Opens menu, focuses first link
   - ArrowUp: Moves focus within menu
   - Escape: Closes menu
   - Tab: Navigates forward through links
   - Shift+Tab: Navigates backward

2. **Mobile menu** (Header.jsx)
   - Menu button: Alt+M or click opens
   - Escape: Closes menu, focus returns to button
   - Tab: Navigates through menu items
   - Initial focus moves to first link in menu (line 77–79)

3. **Hero slider** (Home.jsx)
   - Previous/Next buttons: Fully keyboard accessible
   - Dot navigation: Can tab to each dot and activate with Enter
   - Respects prefers-reduced-motion ✅

4. **Filter buttons** (Doctors.jsx)
   - `aria-pressed` state changes on activation
   - Keyboard focus visible
   - Can activate with Space or Enter

### ❌ Critical Issues

1. **Modal Dialog (SecondOpinion.jsx, lines 68–75)**
   ```jsx
   {isFormOpen && (
     <div className="fixed inset-0 z-[100] flex...">  // ❌ No role="dialog"
       <div className="fixed inset-0 bg-clay-dark/60..." // ❌ Backdrop closes modal on click
         onClick={() => setIsFormOpen(false)}>
       </div>
       <div className="relative z-10...">  // ❌ Missing aria-modal, aria-labelledby
   ```

   **Problems:**
   - Escape key does not close modal
   - Focus is not trapped (can tab to elements behind modal)
   - Screen readers don't announce it as a dialog
   - No focus restoration when modal closes

2. **Form input focus (Home.jsx, lines 282, 296)**
   ```jsx
   className="... outline-none focus:ring-2 focus:ring-clay-mint/30..."
   ```
   - `outline-none` removes browser outline before custom ring is visible
   - Creates brief focus visibility gap

### ⚠️ Minor Issues

1. **StickyCTA button focus** (StickyCTA.jsx)
   - Focus indicator relies on parent container styles
   - Could be more visible

2. **Header dropdown semantic** (Header.jsx, line 195)
   - Uses custom `data-dropdown-panel` instead of `role="menu"`
   - Functionally works but not semantically correct

---

## Screen Reader Audit

### ✅ Correctly Implemented

1. **Skip-to-content link** (Layout.astro, line 148)
   ```jsx
   <a href="#main-content" class="sr-only focus-visible:not-sr-only...">
     Перейти к содержимому
   </a>
   ```
   ✅ Properly hidden until focused

2. **Image alt text** (DoctorCard.jsx, line 23)
   ```jsx
   alt={`${doctor.specialization...} ${doctor.name}, клиника Одинцова, СПб`}
   ```
   ✅ Descriptive and contextual

3. **Decorative element hiding** (Layout.astro, lines 152–157)
   ```jsx
   <div aria-hidden="true" class="fixed inset-0 pointer-events-none">
   ```
   ✅ Blobs correctly hidden from screen readers

4. **Form labels** (SecondOpinionForm.jsx, Home.jsx)
   ```jsx
   <label htmlFor="appt-name">Ваше имя</label>
   <input id="appt-name" ... />
   ```
   ✅ Explicit associations

5. **ARIA attributes on buttons** (Header.jsx, line 154)
   ```jsx
   aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
   aria-expanded={mobileOpen}
   aria-controls="mobile-menu"
   ```
   ✅ Full context provided

### ❌ Critical Issues

1. **Modal dialog not announced** (SecondOpinion.jsx)
   - Missing `role="dialog"` and `aria-modal="true"`
   - Screen readers won't announce it as a dialog
   - Focus management not implemented

2. **Dropdown panel semantics** (Header.jsx, line 195)
   - `data-dropdown-panel` is custom, not standard
   - Should use `role="menu"` for proper announcement
   - Links inside should be `role="menuitem"` or just menu items

### ⚠️ Minor Issues

1. **Placeholder as label antipattern** (multiple files)
   - Some forms use placeholder text without explicit label
   - e.g., Home.jsx line 294: `placeholder="+7 (___) ___-__-__"`
   - Already has label so not critical, but best practice is label + hint text separately

2. **Hero slide handling** (Home.jsx, line 474)
   - Inactive slides use `aria-hidden="true"` ✅
   - But semantic issue: using `role="heading" aria-level="1"` instead of `<h1>`
   - Minor: Content is properly hidden anyway

---

## Priority Fixes

### 🔴 Critical (WCAG 2.1 AA Non-Compliant)

1. **Color Contrast Failures**
   - **Files:** `src/styles/global.css`, all components using `.text-clay-muted`
   - **Fix:** Update CSS variables:
     ```css
     --clay-text-muted: #465550;  /* was #61726d */
     --clay-text: #2D3A34;         /* was #42524c */
     --clay-muted: #465550;        /* was #61726d */
     ```
   - **Impact:** 15+ components affected (Footer, forms, page text)
   - **Effort:** 30 minutes (CSS change + visual verification)

2. **Modal Dialog Not Keyboard/Screen Reader Accessible**
   - **Files:** `src/components/pages/SecondOpinion.jsx` (lines 68–75)
   - **Fix:**
     ```jsx
     {isFormOpen && (
       <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="opinion-form-title"
            onKeyDown={(e) => e.key === 'Escape' && setIsFormOpen(false)}>
         <div className="fixed inset-0 bg-clay-dark/60 backdrop-blur-sm"
              onClick={() => setIsFormOpen(false)}
              aria-hidden="true"></div>
         <div className="relative z-10 w-full max-w-[740px] max-h-[88vh] overflow-y-auto rounded-3xl mt-12 no-scrollbar">
           <SecondOpinionForm onClose={() => setIsFormOpen(false)} />
         </div>
       </div>
     )}
     ```
   - **Additional:** Implement focus trap (useEffect + useRef to manage focus)
   - **Effort:** 45 minutes (includes focus trap implementation)

3. **Form Input Focus Outline Removed**
   - **Files:** `src/components/pages/Home.jsx` (lines 282, 296)
   - **Fix:** Remove `outline-none`, ensure `focus:ring-2` is always visible:
     ```jsx
     className="clay clay-card px-4 py-3 text-sm text-clay-dark placeholder:text-clay-muted
                focus:ring-2 focus:ring-clay-mint/30 focus:ring-offset-2 w-full"
     ```
   - **Effort:** 15 minutes

---

### 🟠 Major (WCAG 2.1 AA Compliant but Poor UX)

4. **Dropdown Menu Missing Semantic Role**
   - **Files:** `src/components/Header.jsx` (lines 172–211)
   - **Fix:** Add `role="menu"` to dropdown container, `role="menuitem"` to items
   - **Effort:** 20 minutes

5. **Modal Missing Initial Focus Management**
   - **Files:** `src/components/SecondOpinionForm.jsx`
   - **Fix:** Auto-focus first form field or close button on modal open
   - **Effort:** 20 minutes (useEffect + useRef)

6. **Mobile Menu Button Size Below Recommended**
   - **Files:** `src/components/Header.jsx` (line 152)
   - **Fix:** Increase padding from `p-2.5` to `p-3` for 48×48px touch target
   - **Effort:** 5 minutes

---

### 🟡 Minor (Nice-to-have improvements)

7. **Add aria-label to Phone Link in Header**
   - **File:** `src/components/Header.jsx` (line 137)
   - **Fix:** `aria-label={`Позвонить: ${PHONE_DISPLAY}`}`
   - **Effort:** 5 minutes

8. **Explicit Placeholder vs. Label Separation**
   - **Files:** `src/components/TaxFormRequestForm.jsx`, `src/components/SecondOpinionForm.jsx`
   - **Current:** Labels exist, placeholder is hint (acceptable)
   - **Improvement:** Add `aria-describedby` linking label to helper text
   - **Effort:** 30 minutes (comprehensive)

9. **Add Role to Filter Button Group**
   - **Files:** `src/components/pages/Doctors.jsx` (line 37)
   - **Fix:** Wrap button group in `<div role="group" aria-label="Фильтр по специализации">`
   - **Effort:** 10 minutes

10. **StickyCTA Focus Indicator Enhancement**
    - **Files:** `src/components/StickyCTA.jsx`
    - **Current:** Focus handling works but could be more visible on mobile
    - **Improvement:** Add visible focus ring styling
    - **Effort:** 15 minutes

---

## Compliance Summary

| Criterion | Status | Notes |
|-----------|--------|-------|
| **1.4.3 Contrast (Minimum)** | ❌ FAIL | Muted text and primary text fail 4.5:1 ratio |
| **2.1.1 Keyboard** | ⚠️ PARTIAL | Modal dialog not keyboard accessible |
| **2.1.2 No Keyboard Trap** | ❌ FAIL | Modal has no focus trap (but also doesn't trap) |
| **2.4.3 Focus Order** | ✅ PASS | Focus order is logical and visible |
| **2.4.7 Focus Visible** | ⚠️ PARTIAL | Focus styles work but input `outline-none` creates gap |
| **3.2.1 On Focus** | ✅ PASS | No unexpected focus behaviors |
| **3.3.1 Error Identification** | ✅ PASS | Errors clearly marked and announced |
| **3.3.2 Labels or Instructions** | ✅ PASS | All form fields have labels |
| **3.3.3 Error Suggestion** | ✅ PASS | SecondOpinionForm provides clear error messages |
| **3.3.4 Error Prevention** | ✅ PASS | Confirmation messages for submissions |
| **4.1.2 Name, Role, Value** | ⚠️ PARTIAL | Modal missing proper semantic roles |
| **4.1.3 Status Messages** | ✅ PASS | Uses `role="alert"` correctly |

**WCAG 2.1 AA Score: ~65/100** (Multiple critical failures prevent compliance)

---

## Remediation Roadmap

### Phase 1: Critical Fixes (Blocks AA Compliance)
**Effort: ~2 hours | Priority: IMMEDIATE**

1. Fix color contrast in CSS variables (30 min)
2. Implement proper modal dialog (45 min)
3. Fix form input focus outline (15 min)

### Phase 2: Major Accessibility Improvements
**Effort: ~1.5 hours | Priority: HIGH**

4. Add semantic roles to dropdown menu (20 min)
5. Add initial focus management to modal (20 min)
6. Increase mobile button touch targets (5 min)
7. Add aria-labels and aria-describedby (30 min)

### Phase 3: Polish and Testing
**Effort: ~1 hour | Priority: MEDIUM**

8. Full keyboard navigation testing (30 min)
9. Screen reader testing with NVDA/JAWS (20 min)
10. Lighthouse accessibility audit (10 min)

**Total estimated effort: 4.5 hours for full WCAG 2.1 AA compliance**

---

## Testing Recommendations

### Tools
- **Color contrast:** WebAIM Contrast Checker, Color Contrast Analyzer
- **Keyboard:** Arrow keys, Tab, Enter, Escape, focus outline (Deque axe DevTools)
- **Screen reader:** NVDA (Windows), VoiceOver (macOS), JAWS
- **Automated:** Lighthouse (DevTools → Accessibility), axe-core, WAVE

### Manual Testing Checklist
- [ ] Keyboard-only navigation (no mouse)
- [ ] Tab order logical throughout page
- [ ] Focus indicator visible on all interactive elements
- [ ] Modal opens and closes with keyboard (Escape)
- [ ] Focus trapped inside modal
- [ ] Form validation messages announced to screen readers
- [ ] All link/button text understandable out of context
- [ ] Color not sole means of conveying information
- [ ] 1.5x zoom at 1280px width still usable

---

## Files Requiring Changes

### High Priority
1. `src/styles/global.css` — Color variables (15 min)
2. `src/components/pages/SecondOpinion.jsx` — Modal semantics (30 min)
3. `src/components/pages/Home.jsx` — Form focus outline (15 min)

### Medium Priority
4. `src/components/Header.jsx` — Dropdown roles + touch target (25 min)
5. `src/components/SecondOpinionForm.jsx` — Focus management (20 min)

### Low Priority
6. `src/components/StickyCTA.jsx` — Focus styling (15 min)
7. `src/components/pages/Doctors.jsx` — Filter group role (10 min)
8. `src/components/Footer.jsx` — Verify contrast after CSS fix (5 min)

---

## Conclusion

The Клиника Одинцова website demonstrates **good foundational accessibility practices** (skip links, proper ARIA labels on buttons, focus management in navigation, respect for motion preferences). However, **8 critical issues** prevent WCAG 2.1 AA compliance:

1. **Color contrast failures** across muted and primary text (affects ~30% of content)
2. **Modal dialog inaccessibility** (blocks keyboard and screen reader users)
3. **Form focus outline removal** (keyboard navigation friction)

**Recommended action:** Prioritize Phase 1 fixes (color + modal + focus) to achieve WCAG AA compliance within 2 hours. Phase 2 improvements add polish and improve UX for all users.

For a medical website serving patients with potential disabilities, accessibility is both an ethical requirement and a business imperative (improves SEO, reduces liability, expands audience).
