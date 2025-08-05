#!/bin/bash

echo "🚀 İnteraktif-Edu Development Mode"
echo "=================================="
echo ""

echo "📦 Dependencies kontrol ediliyor..."
if [ ! -d "node_modules" ]; then
    echo "⬇️ Dependencies yükleniyor..."
    pnpm install
fi

echo "🔨 Shared schema build ediliyor..."
pnpm build

echo ""
echo "🌟 Development serverleri başlatılıyor..."
echo "┌─ Frontend: http://localhost:3000"
echo "└─ API:      http://localhost:4000"
echo ""
echo "💡 İpucu: Ctrl+C ile durdurun"
echo ""

# Her iki serveri paralel başlat
pnpm dev