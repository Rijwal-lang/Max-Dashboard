@echo off
setlocal
set "ROOT=%~dp0.."
set "URL=http://127.0.0.1:8765/index.html"

where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher ^(py^) was not found.
  echo Install Python 3 to use the local kiosk launcher.
  pause
  exit /b 1
)

start "" /b py -m http.server 8765 --bind 127.0.0.1 --directory "%ROOT%"
timeout /t 1 /nobreak >nul

curl.exe --silent --show-error --fail "%URL%" >nul 2>nul
if errorlevel 1 (
  echo The local dashboard server did not start on port 8765.
  pause
  exit /b 1
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --kiosk "%URL%"
  exit /b
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --kiosk "%URL%"
  exit /b
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
  start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --kiosk "%URL%"
  exit /b
)

echo Google Chrome was not found.
echo The dashboard server is running at %URL%
pause
