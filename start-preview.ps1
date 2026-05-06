$projectRoot = Split-Path -Parent $PSCommandPath
$url = "http://127.0.0.1:8000"

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
  throw "Node.js is not installed or not available in PATH."
}

function Test-PreviewReady {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

if (-not (Test-PreviewReady)) {
  $escapedRoot = $projectRoot.Replace("'", "''")
  $serverCommand = "Set-Location -LiteralPath '$escapedRoot'; node local-server.js"

  Start-Process `
    -FilePath "powershell.exe" `
    -WorkingDirectory $projectRoot `
    -ArgumentList "-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $serverCommand

  for ($attempt = 0; $attempt -lt 10; $attempt++) {
    Start-Sleep -Seconds 1
    if (Test-PreviewReady) {
      break
    }
  }
}

if (-not (Test-PreviewReady)) {
  throw "Preview server did not become ready at $url."
}

Start-Process $url
