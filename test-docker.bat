@echo off
echo 🐳 Docker Production Test
echo ========================
echo.

echo ⚠️  Bu komut production-like ortamda test yapar
echo 🔄 Değişiklikleriniz Docker image'ına build edilecek
echo.
set /p confirm="Devam etmek istiyorsanız 'y' yazın: "
if /i not "%confirm%"=="y" (
    echo ❌ İptal edildi
    pause
    exit /b 0
)

echo.
echo 🛑 Mevcut container'ları durduruyor...
cd infra
docker-compose down

echo 🔨 Fresh build yapılıyor...
docker-compose build --no-cache

echo 🚀 Production test başlatılıyor...
docker-compose up -d

echo.
echo ✅ Production test hazır!
echo 📍 Test URL'leri:
echo    • Ana uygulama: http://localhost
echo    • API Health: http://localhost/health
echo.
echo 📋 Useful commands:
echo    • Logları izle: docker-compose logs -f
echo    • Durdur: docker-compose down
echo.
cd ..
pause