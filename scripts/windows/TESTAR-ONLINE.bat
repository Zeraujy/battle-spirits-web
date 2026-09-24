@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."
title Battle Spirits v3 - Testar Online
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$c=Get-Content 'public\config\online-config.js' -Raw; $m=[regex]::Match($c,'serverUrl:\s*\"([^\"]+)\"'); if(-not $m.Success){throw 'URL não encontrada'}; $u=$m.Groups[1].Value.TrimEnd('/') + '/health'; Write-Host ('Testando: '+$u) -ForegroundColor Cyan; try{$r=Invoke-RestMethod -Uri $u -TimeoutSec 10; $r|ConvertTo-Json -Depth 5; Write-Host 'ONLINE OK' -ForegroundColor Green}catch{Write-Host ('FALHA: '+$_.Exception.Message) -ForegroundColor Red; exit 1}"
echo.
pause
