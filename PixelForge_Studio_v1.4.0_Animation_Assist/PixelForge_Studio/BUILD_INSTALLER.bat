@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo ==========================================
echo   PixelForge Studio v1.0.0 - Windows Installer Build
echo ==========================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed on this build computer.
  echo Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm was not found.
  pause
  exit /b 1
)
if not exist package.json (
  echo ERROR: package.json not found. Extract the full archive first.
  pause
  exit /b 1
)
echo [1/2] Installing build dependencies...
npm install
if errorlevel 1 goto failed
echo.
echo [2/2] Building Windows installer...
npm run test:all
if errorlevel 1 goto failed
npm run dist
if errorlevel 1 goto failed
echo.
echo SUCCESS. Check the release folder for the Setup.exe installer.
explorer "%~dp0release"
pause
exit /b 0
:failed
echo.
echo BUILD FAILED. Read the error messages above.
pause
exit /b 1
