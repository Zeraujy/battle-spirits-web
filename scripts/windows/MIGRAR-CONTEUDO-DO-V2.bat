@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."
title Battle Spirits v3 - Migrar Conteudo
powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\tools\Migrar-Conteudo-V2.ps1"
echo.
pause
