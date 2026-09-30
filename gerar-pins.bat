@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Preparando o gerador gratuito...
  call npm install
  if errorlevel 1 pause & exit /b 1
)
node gerar-pins.mjs
echo.
pause
