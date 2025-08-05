#!/bin/bash

echo "🏥 İnteraktif-Edu Sağlık Kontrolü"
echo "================================="
echo ""

# Docker durumunu kontrol et
echo "🐳 Docker servislerini kontrol ediliyor..."
if ! docker-compose -f infra/docker-compose.yml ps | grep -q "Up"; then
    echo "❌ Docker servisleri çalışmıyor!"
    echo "   Şu komutu çalıştırın: cd infra && docker-compose up -d"
    exit 1
fi

echo "✅ Docker servisleri çalışıyor"
echo ""

# Frontend kontrolü
echo "🌐 Frontend kontrolü..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    echo "✅ Frontend erişilebilir (http://localhost)"
else
    echo "❌ Frontend erişilemiyor"
fi

# API health kontrolü
echo "🔧 API sağlık kontrolü..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost/health | grep -q "200"; then
    echo "✅ API çalışıyor (http://localhost/health)"
else
    echo "❌ API çalışmıyor"
fi

echo ""
echo "📊 Container durumları:"
docker-compose -f infra/docker-compose.yml ps

echo ""
echo "🎯 Tüm kontroller tamamlandı!"