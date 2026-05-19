#requires -Version 5
<#
.SYNOPSIS
  Frontend regression test for JOOLA Pulse.

.DESCRIPTION
  Runs (in order, stops on first failure unless -Continue):
    1. TypeScript typecheck (npx tsc --noEmit)
    2. Production build (next build)
    3. Route smoke — HTTP status check for every documented route
    4. Playwright E2E — browser smoke if dev server is running

  Writes c:\tmp\joola-qa-passed.flag on PASS (consumed by pre-push gate + /end-session).
  Exit 0 on success, non-zero on failure.

.PARAMETER SkipBuild
  Skip `next build`. Typecheck still runs.

.PARAMETER SkipRoutes
  Skip HTTP route smoke. Use when no dev server is running.

.PARAMETER SkipPlaywright
  Skip Playwright E2E tests.

.PARAMETER DevUrl
  Base URL for route/Playwright smoke. Default http://localhost:3000.

.PARAMETER Continue
  Don't stop on first failure — run all stages and report at the end.
#>

[CmdletBinding()]
param(
  [switch] $SkipBuild,
  [switch] $SkipRoutes,
  [switch] $SkipPlaywright,
  [string] $DevUrl = 'http://localhost:3000',
  [switch] $Continue
)

$ErrorActionPreference = 'Stop'

$frontendRoot = Split-Path -Parent $PSScriptRoot
Set-Location $frontendRoot

$results = @()
$startedAt = Get-Date

function Record($name, $ok, $detail) {
  $script:results += [pscustomobject]@{ Stage = $name; Ok = $ok; Detail = $detail }
  $icon = if ($ok) { '[PASS]' } else { '[FAIL]' }
  Write-Host "$icon $name $(if ($detail) { "- $detail" })"
  if (-not $ok -and -not $Continue) {
    Write-Host ''
    Write-Host "Regression aborted at: $name" -ForegroundColor Red
    exit 1
  }
}

function Test-DevServer {
  try {
    Invoke-WebRequest -Uri "$DevUrl/overview" -Method Head -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop | Out-Null
    return $true
  } catch { return $false }
}

Write-Host '=== JOOLA Pulse Frontend Regression ===' -ForegroundColor Cyan
Write-Host "Root: $frontendRoot"
Write-Host "Started: $startedAt"
Write-Host ''

# --- Stage 1: typecheck ---
Write-Host '--- Stage 1: TypeScript typecheck ---' -ForegroundColor Yellow
$tscOutput = & npx --no-install tsc --noEmit 2>&1
$tscOk = ($LASTEXITCODE -eq 0)
$tscDetail = if ($tscOk) { 'tsc --noEmit exit 0' } else { ($tscOutput | Select-Object -Last 5) -join '; ' }
Record 'typecheck' $tscOk $tscDetail

# --- Stage 2: production build ---
if (-not $SkipBuild) {
  Write-Host ''
  Write-Host '--- Stage 2: next build ---' -ForegroundColor Yellow
  $buildOutput = & npm run build 2>&1
  $buildOk = ($LASTEXITCODE -eq 0)
  $buildDetail = if ($buildOk) { 'next build succeeded' } else { ($buildOutput | Select-Object -Last 10) -join '; ' }
  Record 'build' $buildOk $buildDetail
} else {
  Write-Host '--- Stage 2: skipped (-SkipBuild) ---' -ForegroundColor DarkGray
}

# --- Stage 3: route smoke ---
if (-not $SkipRoutes) {
  Write-Host ''
  Write-Host "--- Stage 3: route smoke ($DevUrl) ---" -ForegroundColor Yellow

  if (-not (Test-DevServer)) {
    Write-Host "Dev server not reachable at $DevUrl - skipping (OK in CI)" -ForegroundColor DarkGray
    Record 'route-smoke' $true 'skipped (no dev server)'
  } else {
    $routes = @(
      @{ path = '/';                expected = 307 },
      @{ path = '/overview';        expected = 200 },
      @{ path = '/weekly-digest';   expected = 200 },
      @{ path = '/posts';           expected = 200 },
      @{ path = '/comments';        expected = 200 },
      @{ path = '/fans';            expected = 200 },
      @{ path = '/complaints';      expected = 200 },
      @{ path = '/instagram';       expected = 307 },
      @{ path = '/youtube';         expected = 200 },
      @{ path = '/tiktok';          expected = 200 },
      @{ path = '/twitter';         expected = 200 },
      @{ path = '/reddit';          expected = 200 },
      @{ path = '/influencers';     expected = 200 },
      @{ path = '/seo-analyze';     expected = 200 },
      @{ path = '/seo-dashboard';   expected = 200 },
      @{ path = '/seo-news';        expected = 200 },
      @{ path = '/__definitely_not_a_route__'; expected = 404 }
    )

    $routeFails = @()
    foreach ($r in $routes) {
      try {
        $resp = Invoke-WebRequest -Uri "$DevUrl$($r.path)" `
                                  -MaximumRedirection 0 `
                                  -SkipHttpErrorCheck `
                                  -UseBasicParsing `
                                  -ErrorAction Stop `
                                  -TimeoutSec 10
        $code = $resp.StatusCode
      } catch {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
      }
      if ($code -eq $r.expected) {
        Write-Host "  [ok] $($r.path) -> $code"
      } else {
        Write-Host "  [FAIL] $($r.path) -> $code (expected $($r.expected))" -ForegroundColor Red
        $routeFails += "$($r.path):$code"
      }
    }
    $routesOk = ($routeFails.Count -eq 0)
    $routesDetail = if ($routesOk) { "$($routes.Count) routes OK" } else { "$($routeFails.Count) failed: $($routeFails -join ', ')" }
    Record 'route-smoke' $routesOk $routesDetail
  }
} else {
  Write-Host '--- Stage 3: skipped (-SkipRoutes) ---' -ForegroundColor DarkGray
}

# --- Stage 4: Playwright E2E ---
if (-not $SkipPlaywright) {
  Write-Host ''
  Write-Host "--- Stage 4: Playwright E2E ($DevUrl) ---" -ForegroundColor Yellow

  $pwBin = Join-Path $frontendRoot 'node_modules\.bin\playwright.cmd'
  if (-not (Test-Path $pwBin)) {
    Write-Host "Playwright not installed - run: npm install" -ForegroundColor DarkGray
    Record 'playwright' $true 'skipped (not installed)'
  } elseif (-not (Test-DevServer)) {
    Write-Host "Dev server not reachable at $DevUrl - skipping Playwright" -ForegroundColor DarkGray
    Record 'playwright' $true 'skipped (no dev server)'
  } else {
    $env:PLAYWRIGHT_BASE_URL = $DevUrl
    $pwOutput = & npx playwright test e2e/ --reporter=line 2>&1
    $pwOk = ($LASTEXITCODE -eq 0)
    $pwDetail = if ($pwOk) { 'all E2E tests passed' } else { ($pwOutput | Select-Object -Last 5) -join '; ' }
    Record 'playwright' $pwOk $pwDetail
    if (-not $pwOk) {
      Write-Host ''
      Write-Host '--- Playwright output ---' -ForegroundColor DarkGray
      $pwOutput | Select-Object -Last 20 | ForEach-Object { Write-Host "  $_" }
    }
  }
} else {
  Write-Host '--- Stage 4: skipped (-SkipPlaywright) ---' -ForegroundColor DarkGray
}

# --- Summary ---
$finishedAt = Get-Date
$elapsed = ($finishedAt - $startedAt).TotalSeconds
$failed = ($results | Where-Object { -not $_.Ok } | Measure-Object).Count

Write-Host ''
Write-Host '=== Summary ===' -ForegroundColor Cyan
foreach ($r in $results) {
  $icon = if ($r.Ok) { '[PASS]' } else { '[FAIL]' }
  Write-Host "$icon $($r.Stage) - $($r.Detail)"
}
Write-Host ''
Write-Host ("Elapsed: {0:N1}s  Failed: $failed/$($results.Count)" -f $elapsed)

# Write/clear QA pass flag — consumed by scripts/deploy-frontend.ps1 and /end-session
$flagPath = 'c:\tmp\joola-qa-passed.flag'
$null = New-Item -Path 'c:\tmp' -ItemType Directory -Force -ErrorAction SilentlyContinue
if ($failed -gt 0) {
  Remove-Item $flagPath -ErrorAction SilentlyContinue
  exit 1
} else {
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') frontend PASS" | Set-Content -Path $flagPath -Encoding UTF8
  Write-Host "QA pass flag written: $flagPath" -ForegroundColor Green
  exit 0
}
