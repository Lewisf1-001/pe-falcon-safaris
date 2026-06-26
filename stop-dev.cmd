@echo off
setlocal
cd /d "%~dp0"

echo Stopping PE Falcon Safaris dev servers...

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":4000" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%p >nul 2>&1
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%p >nul 2>&1
)

if exist "%~dp0scripts\.dev-servers.json" del "%~dp0scripts\.dev-servers.json"

echo Done.
