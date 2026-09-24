@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."
title Battle Spirits v3 - Configurar Online
powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\tools\Configurar-Online.ps1"
echo.
pause
