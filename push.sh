#!/bin/sh
set -eu

message="${1:-}"

if [ -z "${message}" ]; then
  message="Update: $(date '+%Y-%m-%d %H:%M')"
fi

echo
echo ">>> Clinica Odintsova - Push to GitHub"
echo ">>> Commit: ${message}"
echo

if [ ! -d ".git" ]; then
  echo "ERROR: Current directory is not a git repository." >&2
  exit 1
fi

git add .

if [ -z "$(git status --porcelain)" ]; then
  echo "No changes to commit."
  exit 0
fi

git commit -m "${message}"
git push origin main

echo
echo "Done: pushed to GitHub."
echo
