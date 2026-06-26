$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$ServerDir = Join-Path $ProjectRoot "server"
$ClientDir = Join-Path $ProjectRoot "client"
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
        port = if ($Name -eq "server") { 4000 } else { 3000 }
        log = $LogFile
    }
}

function Open-OperaClient {
    $nodeDir = Join-Path $env:ProgramFiles "nodejs"
    if (Test-Path $nodeDir) {
        $env:Path = "$nodeDir;$env:Path"
    }

    $openScript = Join-Path $PSScriptRoot "open-client-url.cjs"
    if (Test-Path $openScript) {
        Write-Host "Opening client in Opera..."
        & node $openScript
    } else {
        Write-Host "Open this URL manually: http://localhost:3000"
    }
}

Add-NodeToPath

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm not found. Install Node.js and restart your terminal."
}

if (-not (Test-Path $ServerDir)) { Write-Error "Server directory not found: $ServerDir" }
if (-not (Test-Path $ClientDir)) { Write-Error "Client directory not found: $ClientDir" }

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

if (Test-Path $StateFile) {
    $existing = Get-Content $StateFile -Raw | ConvertFrom-Json
    $serverUp = Test-ServerRunning -Port 4000
    $clientUp = Test-ServerRunning -Port 3000

    if ($serverUp -or $clientUp) {
        Write-Host "Dev servers appear to be running already."
        Write-Host "  API:    http://localhost:4000"
        Write-Host "  Client: http://localhost:3000"
        Write-Host "Run scripts/stop-dev.ps1 first if you want to restart them."
        exit 0
    }
}

$serverLog = Join-Path $LogsDir "server.log"
$clientLog = Join-Path $LogsDir "client.log"

Write-Host "Starting backend (port 4000)..."
$server = Start-DevProcess -Name "server" -WorkingDirectory $ServerDir -LogFile $serverLog

Write-Host "Starting frontend (port 3000)..."
$client = Start-DevProcess -Name "client" -WorkingDirectory $ClientDir -LogFile $clientLog

$state = @{
    startedAt = (Get-Date).ToString("o")
    processes = @($server, $client)
}

$state | ConvertTo-Json -Depth 4 | Set-Content $StateFile -Encoding UTF8

Open-OperaClient

Write-Host ""
Write-Host "PE Falcon Safaris dev servers started."
Write-Host "  API:    http://localhost:4000"
Write-Host "  Client: http://localhost:3000"
Write-Host ""
Write-Host "Logs:"
Write-Host "  $serverLog"
Write-Host "  $clientLog"
Write-Host ""
Write-Host "Stop with: scripts/stop-dev.ps1"
