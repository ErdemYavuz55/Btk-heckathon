@echo off
echo 🚀 İnteraktif-Edu Development Mode
echo ==================================
echo.

echo 📦 Dependencies kontrol ediliyor...
if not exist "node_modules" (
    echo ⬇️ Dependencies yükleniyor...
    pnpm install
)

echo 🔨 Shared schema build ediliyor...
pnpm build

echo.
echo 🌟 Development serverleri başlatılıyor...
echo ┌─ Frontend: http://localhost:3000
echo └─ API:      http://localhost:4000
echo.
echo 💡 İpucu: Ctrl+C ile durdurun
echo.

REM Her iki serveri paralel başlat
start "Generator-API" cmd /k "cd apps\generator-api && pnpm dev"
start "Frontend" cmd /k "cd apps\gateway-frontend && pnpm dev"

echo ✅ Development serverleri başlatıldı!
echo 📝 Yeni terminalledr açıldı - değişikliklerinizi canlı görebilirsiniz
echo.
pause