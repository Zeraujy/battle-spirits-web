@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."
title Battle Spirits v3 - Servidor Online

echo ================================================
echo  BATTLE SPIRITS ETERNAL SIMULATOR v3 - ONLINE
echo ================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado.
  echo Instale o Node.js e execute este arquivo novamente.
  pause
  exit /b 1
)

if not exist "node_modules\socket.io\package.json" (
  echo Dependencias nao encontradas. Executando npm install...
  call npm install
  if errorlevel 1 (
    echo [ERRO] Nao foi possivel instalar as dependencias.
    pause
    exit /b 1
  )
)

if not exist "server\.env" (
  if exist "server\.env.example" copy /y "server\.env.example" "server\.env" >nul
)

echo Iniciando servidor em HOST 0.0.0.0...
echo Feche esta janela para encerrar o servidor.
echo.
node --env-file-if-exists=server/.env server/index.mjs

echo.
echo O servidor foi encerrado.
pause
