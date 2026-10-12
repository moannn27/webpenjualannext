# Stop Server Script for Web Next Penjualan
$ErrorActionPreference = 'SilentlyContinue'

$projectDir = (Resolve-Path "$PSScriptRoot\..").Path
$escapedDir = [regex]::Escape($projectDir)

Write-Host "[1/3] Membebaskan port 3000 & 3001..." -ForegroundColor Cyan
$connections = Get-NetTCPConnection -LocalPort 3000, 3001 -ErrorAction SilentlyContinue
foreach ($conn in $connections) {
    if ($conn.OwningProcess -and $conn.OwningProcess -ne 0) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "[2/3] Menutup jendela CMD server Next.js..." -ForegroundColor Cyan
$cmdProcesses = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'cmd.exe' -and (
        $_.CommandLine -like '*Next.js Dev Server*' -or
        $_.CommandLine -like '*next dev*' -or
        $_.CommandLine -like '*npm run dev*'
    ) -and $_.CommandLine -notlike '*stop-server*'
}

foreach ($proc in $cmdProcesses) {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "[3/3] Menghentikan proses Node.js Next.js..." -ForegroundColor Cyan
$nodeProcesses = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'node.exe' -and (
        $_.CommandLine -match $escapedDir -or
        $_.CommandLine -like '*next\dist\bin\next*' -or
        $_.CommandLine -like '*npm-cli.js* run dev*'
    )
}

foreach ($proc in $nodeProcesses) {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "[OK] Semua server dan jendela CMD berhasil dimatikan." -ForegroundColor Green
