@echo off
setlocal
cd /d "%~dp0..\.."
set "OLD=%~1"
if "%OLD%"=="" set /p OLD=Digite o caminho completo da pasta do simulador antigo: 
node scripts/migrate-existing-project.mjs "%OLD%"
pause
