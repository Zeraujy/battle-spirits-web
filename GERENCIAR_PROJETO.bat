@echo off
setlocal
cd /d "%~dp0"
title Battle Spirits - Gerenciador do Projeto

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\project-manager.ps1"
set "BS_EXIT=%ERRORLEVEL%"

if not "%BS_EXIT%"=="0" (
  echo.
  echo ============================================================
  echo O GERENCIADOR TERMINOU COM ERRO: %BS_EXIT%
  echo A janela ficara aberta para voce ler a mensagem acima.
  echo ============================================================
  echo.
  pause
)

endlocal & exit /b %BS_EXIT%
