#!/bin/sh
# Rolls production back to the previously deployed image in one command: swaps
# CLOD_IMAGE_TAG and CLOD_PREVIOUS_IMAGE_TAG in the server .env, recreates only the app
# container from the already-present image and runs the same smoke gate as the deploy.
# Code-only rollback: additive schema changes stay in place, see docs/runbooks/backup-restore.md.
#   DEPLOY_HOST  ssh alias (default clod)
#   DEPLOY_DIR   repository directory on the host (default /srv/clod)
set -eu

remote_host="${DEPLOY_HOST:-clod}"
remote_dir="${DEPLOY_DIR:-/srv/clod}"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Rollback → ${remote_host}:${remote_dir}"
echo "═══════════════════════════════════════════════════════════"

ssh "${remote_host}" sh -s <<EOF
set -eu
cd "${remote_dir}"
current="\$(sed -n 's/^CLOD_IMAGE_TAG=//p' .env | tail -1)"
previous="\$(sed -n 's/^CLOD_PREVIOUS_IMAGE_TAG=//p' .env | tail -1)"
[ -n "\$previous" ] || { echo "rollback: CLOD_PREVIOUS_IMAGE_TAG is not set in .env — nothing to roll back to" >&2; exit 1; }
[ "\$previous" != "\$current" ] || { echo "rollback: CLOD_PREVIOUS_IMAGE_TAG equals CLOD_IMAGE_TAG (\$current) — nothing to roll back to" >&2; exit 1; }
echo "    \${current:-<unset>} -> \$previous"
sed -i "s#^CLOD_IMAGE_TAG=.*#CLOD_IMAGE_TAG=\$previous#" .env
sed -i "s#^CLOD_PREVIOUS_IMAGE_TAG=.*#CLOD_PREVIOUS_IMAGE_TAG=\$current#" .env
docker compose up -d --no-build app
sh scripts/smoke.sh
echo "    production now runs \$previous; the failed tag \$current stays as CLOD_PREVIOUS_IMAGE_TAG"
EOF
