#!/usr/bin/env bash
# seo-quick-check.sh -- Fast programmatic SEO checks for Astro project
# Usage: bash .claude/skills/seo-audit/scripts/seo-quick-check.sh [project_root]
#
# Runs lightweight grep/file checks and outputs findings in parseable format.
# Designed to be called by the SEO audit skill for quick automated passes.

set -uo pipefail

ROOT="${1:-.}"
ISSUES=0
PASSES=0

red() { printf '\033[0;31m%s\033[0m\n' "$1"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$1"; }
green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
info() { printf '  %s\n' "$1"; }

issue() {
  local severity="$1" msg="$2"
  case "$severity" in
    CRITICAL) red "[$severity] $msg" ;;
    HIGH)     yellow "[$severity] $msg" ;;
    MEDIUM)   info "[$severity] $msg" ;;
    LOW)      info "[$severity] $msg" ;;
  esac
  ISSUES=$((ISSUES + 1))
}

pass() {
  green "[PASS] $1"
  PASSES=$((PASSES + 1))
}

echo "============================================"
echo "  SEO Quick Check -- $(date +%Y-%m-%d)"
echo "  Project: $ROOT"
echo "============================================"
echo ""

# --- T1: site field in astro.config.mjs ---
echo "--- Configuration ---"
if grep -q "site:" "$ROOT/astro.config.mjs" 2>/dev/null || grep -q "site :" "$ROOT/astro.config.mjs" 2>/dev/null; then
  pass "site field configured in astro.config.mjs"
else
  issue "CRITICAL" "Missing 'site' field in astro.config.mjs"
fi

# --- T2: sitemap integration ---
if grep -q "sitemap" "$ROOT/astro.config.mjs" 2>/dev/null; then
  pass "@astrojs/sitemap integration found"
else
  issue "CRITICAL" "Missing @astrojs/sitemap integration"
fi

# --- T4: robots.txt ---
if [ -f "$ROOT/public/robots.txt" ]; then
  pass "robots.txt exists"
  if grep -qi "sitemap:" "$ROOT/public/robots.txt"; then
    pass "robots.txt has Sitemap directive"
  else
    issue "HIGH" "robots.txt missing Sitemap directive"
  fi
  if grep -q "Disallow: /admin" "$ROOT/public/robots.txt"; then
    pass "robots.txt blocks /admin/"
  else
    issue "HIGH" "robots.txt does not block /admin/"
  fi
  if grep -q "Disallow: /api" "$ROOT/public/robots.txt"; then
    pass "robots.txt blocks /api/"
  else
    issue "HIGH" "robots.txt does not block /api/"
  fi
else
  issue "CRITICAL" "robots.txt not found in public/"
fi

# --- T7: 404 page ---
if [ -f "$ROOT/src/pages/404.astro" ]; then
  pass "Custom 404 page exists"
else
  issue "MEDIUM" "Missing custom 404.astro page"
fi

# --- M9: html lang ---
echo ""
echo "--- Layout & Meta ---"
if grep -q 'lang="ru"' "$ROOT/src/layouts/Layout.astro" 2>/dev/null; then
  pass 'html lang="ru" set in Layout.astro'
else
  issue "CRITICAL" 'Missing lang="ru" on <html> in Layout.astro'
fi

# --- GEO meta tags ---
if grep -q "geo.region" "$ROOT/src/layouts/Layout.astro" 2>/dev/null; then
  pass "GEO meta tags found in Layout.astro"
else
  issue "HIGH" "Missing GEO meta tags in Layout.astro"
fi

# --- Canonical ---
if grep -q "canonical" "$ROOT/src/layouts/Layout.astro" 2>/dev/null; then
  pass "Canonical link found in Layout.astro"
else
  issue "CRITICAL" "Missing canonical link in Layout.astro"
fi

# --- OG tags ---
if grep -q "og:title" "$ROOT/src/layouts/Layout.astro" 2>/dev/null; then
  pass "Open Graph tags found in Layout.astro"
else
  issue "HIGH" "Missing Open Graph tags in Layout.astro"
fi

# --- JSON-LD MedicalBusiness ---
echo ""
echo "--- Structured Data ---"
if grep -q "MedicalBusiness" "$ROOT/src/layouts/Layout.astro" 2>/dev/null; then
  pass "MedicalBusiness JSON-LD found in Layout.astro"
else
  issue "CRITICAL" "Missing MedicalBusiness JSON-LD"
fi

# --- JSON-LD Physician ---
if grep -rq "Physician" "$ROOT/src/pages/doctors/" 2>/dev/null; then
  pass "Physician JSON-LD found in doctor pages"
else
  issue "CRITICAL" "Missing Physician JSON-LD in doctor pages"
fi

# --- JSON-LD BreadcrumbList ---
BREADCRUMB_COUNT=$(grep -rl "BreadcrumbList" "$ROOT/src/pages/" "$ROOT/src/components/" "$ROOT/src/utils/" 2>/dev/null | wc -l | tr -d ' ')
if [ "$BREADCRUMB_COUNT" -gt 0 ]; then
  pass "BreadcrumbList found in $BREADCRUMB_COUNT file(s)"
else
  issue "HIGH" "No BreadcrumbList JSON-LD found"
fi

# --- JSON-LD FAQPage ---
FAQ_COUNT=$(grep -rl "FAQPage" "$ROOT/src/pages/" "$ROOT/src/components/" "$ROOT/src/utils/" 2>/dev/null | wc -l | tr -d ' ')
if [ "$FAQ_COUNT" -gt 0 ]; then
  pass "FAQPage JSON-LD found in $FAQ_COUNT file(s)"
else
  issue "HIGH" "No FAQPage JSON-LD found"
fi

# --- Fonts ---
echo ""
echo "--- Performance ---"
if ls "$ROOT/public/fonts/"*.woff2 &>/dev/null; then
  WOFF2_COUNT=$(ls "$ROOT/public/fonts/"*.woff2 2>/dev/null | wc -l | tr -d ' ')
  pass "Self-hosted fonts: $WOFF2_COUNT .woff2 files found"
else
  issue "HIGH" "No self-hosted .woff2 fonts in public/fonts/"
fi

# --- font-display: swap ---
if grep -q "font-display.*swap" "$ROOT/src/styles/global.css" 2>/dev/null; then
  pass "font-display: swap found in global.css"
else
  issue "HIGH" "Missing font-display: swap in global.css @font-face"
fi

# --- Font preload ---
if grep -q 'rel="preload"' "$ROOT/src/layouts/Layout.astro" 2>/dev/null && grep -q 'as="font"' "$ROOT/src/layouts/Layout.astro" 2>/dev/null; then
  pass "Font preload found in Layout.astro"
else
  issue "HIGH" "Missing font preload in Layout.astro"
fi

# --- tracker.js defer ---
if grep -q 'defer' "$ROOT/src/layouts/Layout.astro" 2>/dev/null && grep -q 'tracker' "$ROOT/src/layouts/Layout.astro" 2>/dev/null; then
  pass "tracker.js loaded with defer"
else
  issue "HIGH" "tracker.js may not be deferred"
fi

# --- Images without alt ---
echo ""
echo "--- Images ---"
IMG_NO_ALT=$(grep -rn '<img ' "$ROOT/src/components/" "$ROOT/src/pages/" 2>/dev/null | grep -v 'alt=' | wc -l | tr -d ' ')
if [ "$IMG_NO_ALT" -eq 0 ]; then
  pass "All <img> tags have alt attribute"
else
  issue "CRITICAL" "$IMG_NO_ALT <img> tag(s) missing alt attribute"
fi

# --- Images without dimensions ---
IMG_NO_DIM=$(grep -rn '<img ' "$ROOT/src/components/" "$ROOT/src/pages/" 2>/dev/null | grep -v 'width=' | wc -l | tr -d ' ')
if [ "$IMG_NO_DIM" -eq 0 ]; then
  pass "All <img> tags have width/height"
else
  issue "HIGH" "$IMG_NO_DIM <img> tag(s) missing width/height attributes"
fi

# --- Inline styles ---
echo ""
echo "--- Code Quality ---"
INLINE_STYLES=$(grep -rn 'style={{' "$ROOT/src/components/pages/" 2>/dev/null | wc -l | tr -d ' ')
if [ "$INLINE_STYLES" -eq 0 ]; then
  pass "No inline styles in page components"
else
  issue "MEDIUM" "$INLINE_STYLES inline style(s) found in page components"
fi

# --- client:load count ---
CLIENT_LOAD=$(grep -rn 'client:load' "$ROOT/src/pages/" "$ROOT/src/layouts/" 2>/dev/null | wc -l | tr -d ' ')
CLIENT_IDLE=$(grep -rn 'client:idle' "$ROOT/src/pages/" "$ROOT/src/layouts/" 2>/dev/null | wc -l | tr -d ' ')
CLIENT_VISIBLE=$(grep -rn 'client:visible' "$ROOT/src/pages/" "$ROOT/src/layouts/" 2>/dev/null | wc -l | tr -d ' ')
info "Client directives: load=$CLIENT_LOAD, idle=$CLIENT_IDLE, visible=$CLIENT_VISIBLE"
if [ "$CLIENT_LOAD" -gt 10 ]; then
  issue "MEDIUM" "Excessive client:load usage ($CLIENT_LOAD). Consider client:idle/client:visible"
else
  pass "client:load usage reasonable ($CLIENT_LOAD)"
fi

# --- Blog posts check ---
echo ""
echo "--- Blog Content ---"
if [ -d "$ROOT/src/content/blog" ]; then
  BLOG_COUNT=$(ls "$ROOT/src/content/blog/"*.md 2>/dev/null | wc -l | tr -d ' ')
  info "Blog posts found: $BLOG_COUNT"

  # Check for missing authorSlug
  MISSING_AUTHOR=$(grep -rL "authorSlug" "$ROOT/src/content/blog/"*.md 2>/dev/null | wc -l | tr -d ' ')
  if [ "$MISSING_AUTHOR" -eq 0 ]; then
    pass "All blog posts have authorSlug"
  else
    issue "CRITICAL" "$MISSING_AUTHOR blog post(s) missing authorSlug (E-E-A-T)"
  fi

  # Check for missing keywords
  MISSING_KW=$(grep -rL "keywords" "$ROOT/src/content/blog/"*.md 2>/dev/null | wc -l | tr -d ' ')
  if [ "$MISSING_KW" -eq 0 ]; then
    pass "All blog posts have keywords"
  else
    issue "MEDIUM" "$MISSING_KW blog post(s) missing keywords"
  fi
else
  issue "MEDIUM" "No blog content directory found"
fi

# --- E-E-A-T: doctors data ---
echo ""
echo "--- E-E-A-T ---"
if [ -f "$ROOT/src/lib/doctors-data.js" ]; then
  DOCTORS_WITH_URL=$(grep -c "proDoctorovUrl" "$ROOT/src/lib/doctors-data.js" 2>/dev/null || echo 0)
  if [ "$DOCTORS_WITH_URL" -gt 0 ]; then
    pass "proDoctorovUrl found in doctors-data.js ($DOCTORS_WITH_URL entries)"
  else
    issue "HIGH" "No proDoctorovUrl in doctors-data.js (missing E-E-A-T signal)"
  fi
fi

# --- NAP: phone consistency ---
echo ""
echo "--- Local SEO ---"
if [ -f "$ROOT/src/lib/contacts.js" ]; then
  PHONE=$(grep -o "PHONE_NUMBER\s*=\s*['\"][^'\"]*['\"]" "$ROOT/src/lib/contacts.js" 2>/dev/null | head -1)
  if [ -n "$PHONE" ]; then
    pass "Phone number defined in contacts.js"
  else
    issue "CRITICAL" "PHONE_NUMBER not found in contacts.js"
  fi
fi

# --- Summary ---
echo ""
echo "============================================"
echo "  SUMMARY"
echo "  Issues: $ISSUES"
echo "  Passed: $PASSES"
echo "  Total checks: $((ISSUES + PASSES))"
echo "============================================"

exit 0
