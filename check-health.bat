@echo off
echo 🏥 İnteraktif-Edu Sağlık Kontrolü
echo =================================
echo.

REM Docker durumunu kontrol et
echo 🐳 Docker servislerini kontrol ediliyor...
cd infra
docker-compose ps | findstr "Up" >nul
if %errorlevel% neq 0 (
    echo ❌ Docker servisleri çalışmıyor!
    echo    Şu komutu çalıştırın: docker-compose up -d
    cd ..
    pause
    exit /b 1
)

echo ✅ Docker servisleri çalışıyor
echo.

REM Frontend kontrolü
echo 🌐 Frontend kontrolü...
curl -s -o nul -w "%%{http_code}" http://localhost | findstr "200" >nul
if %errorlevel% equ 0 (
    echo ✅ Frontend erişilebilir (http://localhost)
) else (
    echo ❌ Frontend erişilemiyor
)

REM API health kontrolü
echo 🔧 API sağlık kontrolü...
curl -s -o nul -w "%%{http_code}" http://localhost/health | findstr "200" >nul
if %errorlevel% equ 0 (
    echo ✅ API çalışıyor (http://localhost/health)
) else (
    echo ❌ API çalışmıyor
)

echo.
echo 📊 Container durumları:
docker-compose ps

echo.
echo 🎯 Tüm kontroller tamamlandı!
cd ..
pause