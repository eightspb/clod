#!/bin/sh
set -eu

remote_host="${DEPLOY_HOST:-clod}"
remote_dir="${DEPLOY_DIR:-/srv/clod}"
image="${DEPLOY_IMAGE:-ghcr.io/eightspb/clod}"
image_wait_seconds="${DEPLOY_IMAGE_WAIT_SECONDS:-1200}"
build_on_host="${DEPLOY_BUILD_ON_HOST:-0}"

run_remote() {
  ssh "${remote_host}" "$1"
}

# Образ собирает GitHub Actions (job «Docker image») и публикует в GHCR с тегом sha-<7 символов>.
# Хост только скачивает образ, чей тег совпадает с HEAD после git pull, и ждёт его,
# если CI ещё не закончил. DEPLOY_BUILD_ON_HOST=1 — аварийный путь со сборкой на сервере.
wait_for_image() {
  ssh "${remote_host}" sh -s <<EOF
set -eu
cd "${remote_dir}"
tag="sha-\$(git rev-parse --short=7 HEAD)"
ref="${image}:\$tag"
waited=0
until docker manifest inspect "\$ref" >/dev/null 2>&1; do
  if [ "\$waited" -ge "${image_wait_seconds}" ]; then
    echo "Образ \$ref не появился в реестре за ${image_wait_seconds} с: проверьте job «Docker image» в GitHub Actions и доступ хоста к GHCR (публичный пакет или docker login ghcr.io)" >&2
    exit 1
  fi
  if [ "\$((waited % 60))" -eq 0 ]; then
    echo "    ждём \$ref в реестре ... \${waited}s"
  fi
  sleep 15
  waited=\$((waited + 15))
done
if grep -q '^CLOD_IMAGE_TAG=' .env; then
  sed -i "s#^CLOD_IMAGE_TAG=.*#CLOD_IMAGE_TAG=\$tag#" .env
else
  printf '\nCLOD_IMAGE_TAG=%s\n' "\$tag" >> .env
fi
echo "    образ \$ref найден, CLOD_IMAGE_TAG=\$tag записан в .env"
EOF
}

# exec возможен только в состоянии running; при restarting Docker отказывает — ждём running, затем reload.
reload_nginx_with_retry() {
  ssh "${remote_host}" sh -s <<EOF
set -eu
cd "${remote_dir}"

i=0
max=60
while [ "\$i" -lt "\$max" ]; do
  cid=\$(docker compose ps -q nginx 2>/dev/null || true)
  if [ -n "\$cid" ]; then
    status=\$(docker inspect -f '{{.State.Status}}' "\$cid" 2>/dev/null || echo "")
    if [ "\$status" = "running" ]; then
      if docker compose exec -T nginx nginx -s reload; then
        exit 0
      fi
      echo "nginx is running but reload failed, retry \$((i + 1))/\$max..."
    else
      if [ "\$((i % 5))" -eq 0 ]; then
        echo "nginx state: \${status:-unknown} (need running) ... \$((i + 1))/\$max"
      fi
    fi
  else
    if [ "\$((i % 5))" -eq 0 ]; then
      echo "nginx container not listed yet ... \$((i + 1))/\$max"
    fi
  fi
  i=\$((i + 1))
  sleep 2
done

echo ""
echo "=== nginx reload failed after \$((max * 2))s ==="
echo "If state stays 'restarting', nginx crashes on start — check nginx.conf (HTTP default vs nginx.https.conf), SSL paths, and logs below."
echo ""
docker compose ps
echo ""
docker compose logs --tail 40 nginx
exit 1
EOF
}

step_begin() {
  _step_num="$1"
  _step_total="$2"
  _step_label="$3"
  printf '\n'
  printf '━━━ [%s/%s] %s ━━━\n' "${_step_num}" "${_step_total}" "${_step_label}"
}

step_end_ok() {
  printf '    … ok\n'
}

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Deploy → ${remote_host}:${remote_dir}"
echo "═══════════════════════════════════════════════════════════"

step_begin 1 7 "проверка свободного места на диске сервера"
run_remote "used=\$(df --output=pcent / | tail -1 | tr -dc '0-9'); echo \"    диск / занят на \${used}%\"; [ \"\${used}\" -le 80 ] || { echo 'Диск заполнен более чем на 80%: скачивание образа рядом с базой небезопасно, освободите место' >&2; exit 1; }"
step_end_ok

step_begin 2 7 "git pull (обновление кода с GitHub)"
run_remote "cd ${remote_dir} && git pull"
step_end_ok

step_begin 3 7 "рендер nginx.conf из шаблона и проверка конфига"
run_remote "cd ${remote_dir} && sh scripts/render-nginx.sh https && docker compose run --rm --no-deps -T nginx nginx -t"
step_end_ok

if [ "${build_on_host}" = "1" ]; then
  step_begin 4 7 "аварийная сборка образа на хосте (DEPLOY_BUILD_ON_HOST=1)"
  run_remote "cd ${remote_dir} && sed -i '/^CLOD_IMAGE_TAG=/d' .env && docker compose build app"
  step_end_ok
else
  step_begin 4 7 "ожидание образа из GitHub Actions в GHCR (тег sha-<HEAD>)"
  wait_for_image
  step_end_ok
fi

step_begin 5 7 "docker compose pull + up -d (перезапуск без сборки на хосте)"
if [ "${build_on_host}" = "1" ]; then
  run_remote "cd ${remote_dir} && docker compose up -d --no-build"
else
  run_remote "cd ${remote_dir} && docker compose pull --quiet app && docker compose up -d --no-build"
fi
step_end_ok

step_begin 6 7 "nginx -s reload (сброс кэша прокси; ждём готовности контейнера)"
reload_nginx_with_retry
step_end_ok

run_remote "docker image prune -af --filter 'until=24h' >/dev/null 2>&1 || true"

step_begin 7 7 "готово"
echo "    Сайт обновлён. Если в браузере видна старая версия — жёсткое обновление (Ctrl+F5 или Cmd+Shift+R)."
echo ""
