# Деплой на VPS: подтянуть код из GitHub и пересобрать контейнеры.
# Подключение к серверу: ssh clod (см. DEPLOY-BEGET.md)
# После сборки: перезагрузка Nginx (сброс кэша соединений) и опциональная очистка кэша браузера через заголовки.

$ErrorActionPreference = "Stop"
Write-Host "Deploy: git pull, build, nginx reload" -ForegroundColor Cyan
ssh clod "cd /srv/clod && git pull && docker compose up -d --build && docker compose exec -T nginx nginx -s reload"
if ($LASTEXITCODE -eq 0) {
  Write-Host "Deploy done. If the site still shows old content, do a hard refresh (Ctrl+F5) or clear browser cache." -ForegroundColor Green
} else {
  Write-Host "Deploy failed (exit code $LASTEXITCODE)." -ForegroundColor Red
  exit $LASTEXITCODE
}
