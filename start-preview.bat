@echo off
setlocal
cd /d "%~dp0"

set "URL=http://127.0.0.1:8000"

powershell.exe -NoProfile -Command "try { Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  start "p5 preview server" "%~dp0run-server.bat"

  powershell.exe -NoProfile -Command "$deadline = (Get-Date).AddSeconds(10); while ((Get-Date) -lt $deadline) { try { Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 500 } }; exit 1"
  if errorlevel 1 (
    echo.
    echo Preview server did not start at %URL%
    pause
    exit /b 1
  )
)

start "" "%URL%"
