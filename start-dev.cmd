@echo off
setlocal
cd /d "%~dp0"

set "NODE_DIR=%ProgramFiles%\nodejs"
if exist "%NODE_DIR%\npm.cmd" (
  set "PATH=%NODE_DIR%;%PATH%"
)

echo Starting backend on http://localhost:4000...
start "PE Falcon API" /MIN cmd /k "cd /d "%~dp0server" && set PATH=%NODE_DIR%;%PATH% && npm run dev"

echo Starting frontend on http://localhost:3000...
start "PE Falcon Client" /MIN cmd /k "cd /d "%~dp0client" && set PATH=%NODE_DIR%;%PATH% && npm run dev"

echo Opening client in Opera...
node "%~dp0scripts\open-client-url.cjs"

echo.
echo PE Falcon Safaris dev servers started.
echo   API:    http://localhost:4000
echo   Client: http://localhost:3000
echo.
echo Stop with: stop-dev.cmd
