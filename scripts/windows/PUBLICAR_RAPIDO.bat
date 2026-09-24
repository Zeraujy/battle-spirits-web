@echo off
setlocal
cd /d "%~dp0\..\.."
title Battle Spirits - Publicar Rapido
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0project-manager.ps1" -Mode publish
endlocal
