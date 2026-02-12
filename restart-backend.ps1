param(
  [int]$Port = 0,
  [ValidateSet('dev', 'start')]
  [string]$Mode = 'dev',
  [switch]$Detached
)

$ErrorActionPreference = 'Stop'

function Get-BackendPortFromEnv {
  param([string]$EnvFilePath)

  if (-not (Test-Path -LiteralPath $EnvFilePath)) {
    return 3000
  }

  $portLine = Get-Content -LiteralPath $EnvFilePath |
    Where-Object { $_ -match '^\s*PORT\s*=' } |
    Select-Object -First 1

  if (-not $portLine) {
    return 3000
  }

  $raw = ($portLine -replace '^\s*PORT\s*=\s*', '').Trim()
  $raw = $raw.Trim('"').Trim("'")

  $parsed = 0
  if ([int]::TryParse($raw, [ref]$parsed) -and $parsed -ge 1 -and $parsed -le 65535) {
    return $parsed
  }

  return 3000
}

function Get-ListeningPidByPort {
  param([int]$TargetPort)

  $connection = Get-NetTCPConnection -State Listen -LocalPort $TargetPort -ErrorAction SilentlyContinue |
    Select-Object -First 1

  if ($connection) {
    return [int]$connection.OwningProcess
  }

  $line = (netstat -ano | Select-String ":$TargetPort" | Select-String 'LISTENING' | Select-Object -First 1)
  if (-not $line) {
    return $null
  }

  $parts = ($line.ToString() -split '\s+') | Where-Object { $_ -ne '' }
  if ($parts.Count -lt 1) {
    return $null
  }

  $candidate = 0
  if ([int]::TryParse($parts[-1], [ref]$candidate)) {
    return $candidate
  }

  return $null
}

$backendRoot = $PSScriptRoot
$envPath = Join-Path $backendRoot '.env'

if ($Port -le 0) {
  $Port = Get-BackendPortFromEnv -EnvFilePath $envPath
}

if ($Port -lt 1 -or $Port -gt 65535) {
  throw "Invalid port: $Port"
}

Write-Host "Using backend port: $Port"

$listeningPid = Get-ListeningPidByPort -TargetPort $Port
if ($listeningPid) {
  if ($listeningPid -eq $PID) {
    throw "Current shell process is listening on port $Port. Run this script from another terminal."
  }

  Write-Host "Stopping process on port $Port (PID: $listeningPid)..."
  Stop-Process -Id $listeningPid -Force
  Start-Sleep -Milliseconds 500
} else {
  Write-Host "No process currently listening on port $Port."
}

if ($Detached) {
  $npm = Get-Command npm.cmd -ErrorAction Stop
  $process = Start-Process -FilePath $npm.Source -ArgumentList @('run', $Mode) -WorkingDirectory $backendRoot -PassThru
  Write-Host "Started backend in detached mode (PID: $($process.Id)) using: npm run $Mode"
  return
}

Write-Host "Starting backend in foreground using: npm run $Mode"
Push-Location $backendRoot
try {
  npm run $Mode
} finally {
  Pop-Location
}
