<#
.SYNOPSIS
    Deploys all Supabase Edge Functions for PE Falcon Safaris.

.DESCRIPTION
    This script deploys the following Edge Functions:
      - packages
      - bookings
      - payments
      - currency
      - admin

    The script stops immediately if any function fails to deploy.

.PARAMETER NoVerifyJwt
    Skip JWT verification for deployed functions (default: true for development).

.EXAMPLE
    .\scripts\deploy-functions.ps1
    .\scripts\deploy-functions.ps1 -NoVerifyJwt:$false
#>

param(
    [switch]$NoVerifyJwt = $true
)

$ErrorActionPreference = "Stop"

$functions = @(
    "packages",
    "bookings",
    "payments",
    "currency",
    "admin"
)

$deployed = @()
$failed = @()

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PE Falcon Safaris - Edge Function Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Supabase CLI
try {
    $version = supabase --version 2>&1
    Write-Host "Supabase CLI: $version" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Supabase CLI not found. Install it with: npm install -g supabase" -ForegroundColor Red
    exit 1
}

# Check project link
$status = supabase status 2>&1
if ($status -match "Not linked") {
    Write-Host "ERROR: Project not linked. Run: supabase link --project-ref <ref>" -ForegroundColor Red
    exit 1
}

Write-Host ""

foreach ($fn in $functions) {
    Write-Host "Deploying: $fn..." -ForegroundColor Yellow -NoNewline

    $jwtFlag = if ($NoVerifyJwt) { "--no-verify-jwt" } else { "" }

    $result = supabase functions deploy $fn $jwtFlag 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
        $deployed += $fn
    } else {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        $failed += $fn
        Write-Host ""
        Write-Host "Deployment stopped. Fix the error and re-run this script." -ForegroundColor Red
        break
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($deployed.Count -gt 0) {
    Write-Host "Successfully deployed:" -ForegroundColor Green
    foreach ($fn in $deployed) {
        Write-Host "  - $fn" -ForegroundColor Green
    }
}

if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed:" -ForegroundColor Red
    foreach ($fn in $failed) {
        Write-Host "  - $fn" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Total: $($deployed.Count) deployed, $($failed.Count) failed" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host ""
    Write-Host "All $($functions.Count) functions deployed successfully!" -ForegroundColor Green
    exit 0
}
