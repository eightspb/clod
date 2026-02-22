$port = 4321
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "Port $port is occupied by PID $process — killing it..."
    Stop-Process -Id $process -Force
    Start-Sleep -Milliseconds 500
}

bun run astro dev --port $port
