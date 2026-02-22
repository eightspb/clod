$port = 4321
$occupyingPids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    Where-Object { $_ -gt 0 }

foreach ($p in $occupyingPids) {
    Write-Host "Port $port is occupied by PID $p — killing it..."
    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
}

if ($occupyingPids) { Start-Sleep -Milliseconds 500 }

bun run astro dev --port $port
