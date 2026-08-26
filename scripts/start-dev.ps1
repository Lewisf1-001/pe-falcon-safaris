$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$ClientDir = Join-Path $ProjectRoot "client"
$AdminDir = Join-Path $ProjectRoot "admin"
$StateFile = Join-Path $PSScriptRoot ".dev-servers.json"
$LogsDir = Join-Path $PSScriptRoot "logs"

function Add-NodeToPath {
    $nodeDir = Join-Path $env:ProgramFiles "nodejs"
    if (Test-Path $nodeDir) {
        $env:Path = "$nodeDir;$env:Path"
    }
}

function Test-ServerRunning {
    param([int]$Port)

    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1

    return $null -ne $connection
}

function Start-DevProcess {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$LogFile
    )

    $command = @"
Set-Location '$WorkingDirectory'
`$env:Path = '$((Join-Path $env:ProgramFiles 'nodejs'));' + `$env:Path
npm run dev *>&1 | Tee-Object -FilePath '$LogFile'
"@

    $process = Start-Process powershell.exe -ArgumentList @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-Command", $command
    ) -PassThru -WindowStyle Minimized

    return @{
        name = $Name
        pid = $process.Id
        port = if ($Name -eq "admin") { 3001 } else { 3000 }
        log = $LogFile
    }
}

function Open-ChromeClient {
    $nodeDir = Join-Path $env:ProgramFiles "nodejs"
    if (Test-Path $nodeDir) {
        $env:Path = "$nodeDir;$env:Path"
    }

    $openScript = Join-Path $PSScriptRoot "open-client-url.cjs"
    if (Test-Path $openScript) {
        Write-Host "Opening client in Chrome..."
        & node $openScript
    } else {
        Write-Host "Open this URL manually: http://localhost:3000"
    }
}

Add-NodeToPath

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm not found. Install Node.js and restart your terminal."
}

if (-not (Test-Path $ClientDir)) { Write-Error "Client directory not found: $ClientDir" }
if (-not (Test-Path $AdminDir)) { Write-Error "Admin directory not found: $AdminDir" }

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

if (Test-Path $StateFile) {
    $existing = Get-Content $StateFile -Raw | ConvertFrom-Json
    $clientUp = Test-ServerRunning -Port 3000
    $adminUp = Test-ServerRunning -Port 3001

    if ($clientUp -or $adminUp) {
        Write-Host "Dev servers appear to be running already."
        Write-Host "  Client: http://localhost:3000"
        Write-Host "  Admin:  http://localhost:3001"
        Write-Host "Run scripts/stop-dev.ps1 first if you want to restart them."
        exit 0
    }
}

$clientLog = Join-Path $LogsDir "client.log"
$adminLog = Join-Path $LogsDir "admin.log"

Write-Host "Starting client (port 3000)..."
$client = Start-DevProcess -Name "client" -WorkingDirectory $ClientDir -LogFile $clientLog

Write-Host "Starting admin (port 3001)..."
$admin = Start-DevProcess -Name "admin" -WorkingDirectory $AdminDir -LogFile $adminLog

$state = @{
    startedAt = (Get-Date).ToString("o")
    processes = @($client, $admin)
}

$state | ConvertTo-Json -Depth 4 | Set-Content $StateFile -Encoding UTF8

Open-ChromeClient

Write-Host ""
Write-Host "PE Falcon Safaris dev servers started."
Write-Host "  Client: http://localhost:3000"
Write-Host "  Admin:  http://localhost:3001"
Write-Host ""
Write-Host "Logs:"
Write-Host "  $clientLog"
Write-Host "  $adminLog"
Write-Host ""
Write-Host "Stop with: scripts/stop-dev.ps1"
