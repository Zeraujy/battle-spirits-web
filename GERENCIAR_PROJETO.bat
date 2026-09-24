@echo off
setlocal
cd /d "%~dp0"
title Battle Spirits - Gerenciador do Projeto
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\project-manager.ps1"
endlocal
