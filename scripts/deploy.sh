#!/bin/sh
set -eu

remote_host="${DEPLOY_HOST:-clod}"
remote_dir="${DEPLOY_DIR:-/srv/clod}"

echo "Deploy: git pull, rebuild containers, reload nginx"
ssh "${remote_host}" "cd ${remote_dir} && git pull && docker compose up -d --build && docker compose exec -T nginx nginx -s reload"
echo "Deploy done. If the site still shows old content, do a hard refresh."
