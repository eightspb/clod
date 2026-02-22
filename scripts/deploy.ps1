# Деплой на VPS: подтянуть код из GitHub и пересобрать контейнеры.
# Подключение к серверу: ssh clod (см. DEPLOY-BEGET.md)

$ErrorActionPreference = "Stop"
Write-Host "Deploy: ssh clod -> git pull && docker compose up -d --build" -ForegroundColor Cyan
ssh clod "cd /srv/clod && git pull && docker compose up -d --build"
if ($LASTEXITCODE -eq 0) {
  Write-Host "Deploy done." -ForegroundColor Green
} else {
  Write-Host "Deploy failed (exit code $LASTEXITCODE)." -ForegroundColor Red
  exit $LASTEXITCODE
}
