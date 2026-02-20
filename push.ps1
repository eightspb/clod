# push.ps1 — быстрый коммит и пуш на GitHub
# Использование:
#   .\push.ps1                        — коммит с датой/временем
#   .\push.ps1 "Описание изменений"   — коммит с вашим сообщением

param(
    [string]$Message = ""
)

# Автоматическое сообщение если не передано
if (-not $Message) {
    $Message = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

Write-Host ""
Write-Host ">>> Клиника Одинцова — Push to GitHub" -ForegroundColor Cyan
Write-Host ">>> Commit: $Message" -ForegroundColor Yellow
Write-Host ""

# Проверяем что мы в git-репозитории
if (-not (Test-Path ".git")) {
    Write-Host "ОШИБКА: Папка не является git-репозиторием." -ForegroundColor Red
    Write-Host "Запусти: git init" -ForegroundColor Yellow
    exit 1
}

# Добавляем всё
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА при git add" -ForegroundColor Red
    exit 1
}

# Проверяем есть ли что коммитить
$status = git status --porcelain
if (-not $status) {
    Write-Host "Нет изменений для коммита. Всё актуально." -ForegroundColor Green
    exit 0
}

# Коммит
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА при git commit" -ForegroundColor Red
    exit 1
}

# Пуш
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА при git push" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Готово! Запушено на GitHub: https://github.com/eightspb/clod" -ForegroundColor Green
Write-Host ""
