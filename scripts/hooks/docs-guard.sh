#!/usr/bin/env bash
# Claude Code Stop hook: block finishing a task when code changed but docs did not.
# Reads the hook payload from stdin; exits 0 silently when nothing needs attention.
set -euo pipefail
payload="$(cat)"
if [ "$(printf '%s' "$payload" | jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
changed="$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } 2>/dev/null | sort -u)"
[ -z "$changed" ] && exit 0
code="$(printf '%s\n' "$changed" | grep -E '^(src/|scripts/|public/|e2e/|astro\.config\.mjs|package\.json|Dockerfile|docker-compose\.yml|nginx.*\.conf|\.env\.example|\.github/)' | grep -vE '\.(test|spec)\.[jt]sx?$' || true)"
[ -z "$code" ] && exit 0
docs="$(printf '%s\n' "$changed" | grep -E '^(README\.md|AGENTS\.md|CLAUDE\.md|CONTEXT\.md|docs/|\.cursor/rules/|\.env\.example)' || true)"
[ -n "$docs" ] && exit 0
list="$(printf '%s\n' "$code" | head -15 | tr '\n' ' ')"
jq -cn --arg list "$list" '{
  decision: "block",
  reason: ("Изменён код без обновления документации: " + $list + ". Перед завершением обнови README.md (и при необходимости AGENTS.md, docs/, .env.example) согласно разделу «Обновление этого файла», либо явно объясни пользователю, почему документация не требует правок")
}'
