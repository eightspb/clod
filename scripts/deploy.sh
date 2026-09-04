#!/bin/sh
set -eu

remote_host="${DEPLOY_HOST:-clod}"
remote_dir="${DEPLOY_DIR:-/srv/clod}"

run_remote() {
  ssh "${remote_host}" "$1"
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
run_remote "used=\$(df --output=pcent / | tail -1 | tr -dc '0-9'); echo \"    диск / занят на \${used}%\"; [ \"\${used}\" -le 80 ] || { echo 'Диск заполнен более чем на 80%: сборка образа рядом с базой небезопасна, освободите место' >&2; exit 1; }"
step_end_ok

step_begin 2 7 "git pull (обновление кода с GitHub)"
run_remote "cd ${remote_dir} && git pull"
step_end_ok

step_begin 3 7 "рендер nginx.conf из шаблона и проверка конфига"
run_remote "cd ${remote_dir} && sh scripts/render-nginx.sh https && docker compose run --rm --no-deps -T nginx nginx -t"
step_end_ok

step_begin 4 7 "docker system prune (очистка неиспользуемых образов и кэша)"
run_remote "docker system prune -af --filter 'until=24h' 2>/dev/null || true"
step_end_ok

step_begin 5 7 "docker compose up -d --build (сборка и перезапуск — может занять несколько минут)"
run_remote "cd ${remote_dir} && docker compose up -d --build"
step_end_ok

step_begin 6 7 "nginx -s reload (сброс кэша прокси; ждём готовности контейнера)"
reload_nginx_with_retry
step_end_ok

step_begin 7 7 "готово"
echo "    Сайт обновлён. Если в браузере видна старая версия — жёсткое обновление (Ctrl+F5 или Cmd+Shift+R)."
echo ""
