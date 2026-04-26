@echo off
echo ========================================
echo   Yaoi - Gym Tracker - Modo Remoto
echo   (para usar fora de casa)
echo ========================================
echo.

:: Verificar se node_modules existe
if not exist "node_modules" (
    echo [AVISO] Dependencias nao instaladas. Rodando setup...
    call setup.bat
)

:: Instalar ngrok se necessario
echo Verificando ngrok...
npx @expo/ngrok --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando ngrok...
    npm install -g @expo/ngrok
)

:: Iniciar servidor de imagens em background
echo Iniciando servidor de imagens (porta 3333)...
start "Yaoi Images" /min cmd /c "node serve-images.js"
timeout /t 2 /nobreak >nul
echo [OK] Servidor de imagens rodando

:: Iniciar Expo com tunnel
echo.
echo Iniciando Expo com tunnel (acesso pela internet)...
echo O app vai funcionar de qualquer rede!
echo.
npx expo start --tunnel

:: Cleanup
taskkill /fi "windowtitle eq Yaoi Images" /f >nul 2>&1
