$ErrorActionPreference = "Continue"

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$StateFile = Join-Path $PSScriptRoot ".dev-servers.json"

function Stop-PortListener {
    param([int]$Port)

    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    $stopped = 0

    foreach ($connection in $connections) {
        $processId = $connection.OwningProcess
        if ($processId -and $processId -ne 0) {
            try {
                Stop-Process -Id $processId -Force -ErrorAction Stop
                $stopped++
            } catch {
                try {
                    taskkill /PID $processId /T /F | Out-Null
                    $stopped++
                } catch {
                    Write-Warning "Could not stop process $processId on port $Port"
                }
            }
        }
    }

    return $stopped
}

function Stop-ProcessTree {
    param([int]$ProcessId)

    if (-not $ProcessId) { return $false }

    try {
        taskkill /PID $ProcessId /T /F | Out-Null
        return $true
    } catch {
        try {
            Stop-Process -Id $ProcessId -Force -ErrorAction Stop
            return $true
        } catch {
            return $false
        }
    }
}

Write-Host "Stopping PE Falcon Safaris dev servers..."

if (Test-Path $StateFile) {
    $state = Get-Content $StateFile -Raw | ConvertFrom-Json

    foreach ($entry in $state.processes) {
        Write-Host "Stopping $($entry.name) (PID $($entry.pid))..."
        Stop-ProcessTree -ProcessId $entry.pid | Out-Null
    }

    Remove-Item $StateFile -Force
}

$serverStopped = Stop-PortListener -Port 4000
$clientStopped = Stop-PortListener -Port 3000

Write-Host ""
if ($serverStopped -gt 0 -or $clientStopped -gt 0) {
    Write-Host "Dev servers stopped."
} else {
    Write-Host "No running dev servers found on ports 3000 or 4000."
}
