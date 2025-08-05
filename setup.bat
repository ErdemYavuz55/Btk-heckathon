@echo off
echo 🎓 İnteraktif-Edu Docker Setup
echo ================================
echo.

REM Environment dosyasını kontrol et
if not exist "infra\.env" (
    echo 📝 Environment dosyası oluşturuluyor...
    copy "infra\env.production.example" "infra\.env" >nul
    echo.
    echo ⚠️  UYARI: infra\.env dosyasında GEMINI_API_KEY'inizi ayarlamayı unutmayın!
    echo.
    
    set /p api_key="Gemini API anahtarınızı girin: "
    
    REM .env dosyasını güncelle (PowerShell kullanarak)
    powershell -Command "(Get-Content 'infra\.env') -replace 'your_gemini_api_key_here', '%api_key%' | Set-Content 'infra\.env'"
    echo ✅ API anahtarı ayarlandı!
)

echo 🐳 Docker servisleri başlatılıyor...
cd infra

REM Docker compose'u başlat
docker-compose up --build -d

echo.
echo 🚀 Setup tamamlandı!
echo.
echo 📍 Erişim URL'leri:
echo    • Ana uygulama: http://localhost
echo    • API Health: http://localhost/health
echo.
echo 📋 Yararlı komutlar:
echo    • Logları izle: docker-compose logs -f
echo    • Servisleri durdur: docker-compose down
echo    • Durumu kontrol et: docker-compose ps

pause