@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0..\.."
title Battle Spirits Eternal Simulator v3

echo ================================================
echo  BATTLE SPIRITS ETERNAL SIMULATOR - v3.6.1
echo ================================================
echo.
where node >nul 2>&1 || (echo [ERRO] Node.js nao encontrado.& pause & exit /b 1)

echo [1/4] Instalando/verificando dependencias...
call npm install
if errorlevel 1 (pause & exit /b 1)

echo.
echo [2/4] Verificando estrutura v3...
call npm run verify:v3
if errorlevel 1 (pause & exit /b 1)

echo.
echo [3/4] Testando engine...
call npm test
if errorlevel 1 (pause & exit /b 1)

echo.
echo [4/4] Abrindo simulador...
call npm run dev
