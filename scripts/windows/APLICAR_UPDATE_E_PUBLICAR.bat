@echo off
setlocal
cd /d "%~dp0\..\.."
title Battle Spirits - Aplicar Update e Publicar
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0project-manager.ps1" -Mode apply
endlocal
