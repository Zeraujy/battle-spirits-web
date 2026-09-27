@echo off
setlocal
cd /d "%~dp0..\.."
title BATTLE SPIRITS KAIHOU - GERAR APLICATIVO WINDOWS

echo ======================================================
echo   BATTLE SPIRITS KAIHOU - GERAR APLICATIVO WINDOWS
echo ======================================================
echo.
where node >nul 2>&1 || (echo ERRO: Node.js nao encontrado.& pause & exit /b 1)
where npm >nul 2>&1 || (echo ERRO: npm nao encontrado.& pause & exit /b 1)

echo [1/5] Instalando dependencias...
call npm install || goto :erro

echo [2/5] Validando projeto...
call npm run verify || goto :erro

echo [3/5] Rodando testes...
call npm test || goto :erro

echo [4/5] Gerando frontend e executaveis...
call npm run dist:win || goto :erro

echo [5/5] Finalizado.
echo.
echo Confira a pasta release.
echo Instalador esperado: Battle-Spirits-Windows-Setup.exe
echo O instalador expoe apenas o executavel principal do jogo. O updater e interno e o servidor permanece remoto.
echo.
pause
exit /b 0

:erro
echo.
echo ======================================================
echo   O BUILD FALHOU. O ERRO ESTA ACIMA.
echo ======================================================
echo.
pause
exit /b 1
