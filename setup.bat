@echo off
echo ========================================
echo   Yaoi - Gym Tracker - Setup Inicial
echo ========================================
echo.

:: Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Baixe em: https://nodejs.org
    echo Instale a versao LTS e rode este script novamente.
    pause
    exit /b 1
)
echo [OK] Node.js encontrado

:: Verificar Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Git nao encontrado. Opcional, mas recomendado.
)

:: Instalar dependencias
echo.
echo Instalando dependencias (pode demorar alguns minutos)...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas

:: Abrir porta no firewall para servidor de imagens
echo.
echo Configurando firewall para servidor de imagens (porta 3333)...
netsh advfirewall firewall add rule name="Yaoi Image Server" dir=in action=allow protocol=TCP localport=3333 >nul 2>&1
echo [OK] Firewall configurado

echo.
echo ========================================
echo   Setup concluido com sucesso!
echo   Execute "iniciar.bat" para rodar o app
echo ========================================
pause
