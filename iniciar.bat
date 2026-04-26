@echo off
echo ========================================
echo   Yaoi - Gym Tracker - Iniciando...
echo ========================================
echo.

:: Verificar se node_modules existe
if not exist "node_modules" (
    echo [AVISO] Dependencias nao instaladas. Rodando setup...
    call setup.bat
)

:: Iniciar servidor de imagens em background
echo Iniciando servidor de imagens (porta 3333)...
start "Yaoi Images" /min cmd /c "node serve-images.js"
timeout /t 2 /nobreak >nul
echo [OK] Servidor de imagens rodando

:: Iniciar Expo
echo.
echo Iniciando Expo (escaneie o QR code no Expo Go)...
echo Para usar fora de casa, feche esta janela e rode:
echo   npx expo start --tunnel
echo.
npx expo start

:: Quando Expo fechar, matar o servidor de imagens
taskkill /fi "windowtitle eq Yaoi Images" /f >nul 2>&1
