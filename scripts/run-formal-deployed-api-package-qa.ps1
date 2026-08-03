[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $RunnerArguments
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Block-FormalDeployedApiLauncher {
  [Console]::Error.WriteLine('{"verdict":"BLOCKED_BY_AUTHORITY","code":"LAUNCHER_REQUIRED"}')
  exit 2
}

foreach ($name in @(
  "NODE_OPTIONS",
  "NODE_PATH",
  "MATTER_FORMAL_QA_LAUNCH_ATTESTATION_PATH",
  "MATTER_FORMAL_QA_LAUNCH_TOKEN"
)) {
  if ([Environment]::GetEnvironmentVariable($name, "Process") -ne $null) {
    Block-FormalDeployedApiLauncher
  }
}

$launcherPath = (Resolve-Path -LiteralPath $PSCommandPath).Path
$runnerPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "internal/run-formal-deployed-api-package-qa.mjs")).Path
$nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction Stop
$nodePath = (Resolve-Path -LiteralPath $nodeCommand.Source).Path
if ((& $nodePath --version) -notmatch '^v22\.') { Block-FormalDeployedApiLauncher }
$attestationDirectory = Join-Path ([IO.Path]::GetTempPath()) ("matter-formal-launch-" + [Guid]::NewGuid().ToString("N"))
$attestationPath = Join-Path $attestationDirectory "attestation.json"
$token = [Guid]::NewGuid().ToString("D").ToLowerInvariant()
$createdAt = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", [Globalization.CultureInfo]::InvariantCulture)
New-Item -ItemType Directory -Path $attestationDirectory -ErrorAction Stop | Out-Null

try {
  [ordered]@{
    schema_version = "law-firm-os.formal-package-os-launcher.v1"
    created_at = $createdAt
    token = $token
    launcher_pid = $PID
    launcher_path = $launcherPath
    runner_path = $runnerPath
    node_path = $nodePath
    platform = "windows"
  } | ConvertTo-Json -Compress | Set-Content -LiteralPath $attestationPath -Encoding utf8NoBOM
  [Environment]::SetEnvironmentVariable("MATTER_FORMAL_QA_LAUNCH_ATTESTATION_PATH", $attestationPath, "Process")
  [Environment]::SetEnvironmentVariable("MATTER_FORMAL_QA_LAUNCH_TOKEN", $token, "Process")
  & $nodePath $runnerPath @RunnerArguments
  $status = $LASTEXITCODE
} finally {
  [Environment]::SetEnvironmentVariable("MATTER_FORMAL_QA_LAUNCH_ATTESTATION_PATH", $null, "Process")
  [Environment]::SetEnvironmentVariable("MATTER_FORMAL_QA_LAUNCH_TOKEN", $null, "Process")
  Remove-Item -LiteralPath $attestationPath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $attestationDirectory -Force -ErrorAction SilentlyContinue
}
exit $status
