@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

echo Starting preview server at http://127.0.0.1:8000
"%NODE_EXE%" local-server.js

echo.
echo Preview server stopped.
pause
