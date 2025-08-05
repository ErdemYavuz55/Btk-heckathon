#!/bin/bash

echo "🎓 İnteraktif-Edu Docker Setup"
echo "================================"

# Environment dosyasını kontrol et
if [ ! -f "infra/.env" ]; then
    echo "📝 Environment dosyası oluşturuluyor..."
    cp infra/env.production.example infra/.env
    echo ""
    echo "⚠️  UYARI: infra/.env dosyasında GEMINI_API_KEY'inizi ayarlamayı unutmayın!"
    echo ""
    read -p "API anahtarınızı girmek için Enter'a basın..."
    
    # API anahtarını sor
    echo -n "Gemini API anahtarınızı girin: "
    read -s api_key
    echo ""
    
    # .env dosyasını güncelle
    sed -i.bak "s/your_gemini_api_key_here/$api_key/" infra/.env
    echo "✅ API anahtarı ayarlandı!"
fi

echo "🐳 Docker servisleri başlatılıyor..."
cd infra

# Docker compose'u başlat
docker-compose up --build -d

echo ""
echo "🚀 Setup tamamlandı!"
echo ""
echo "📍 Erişim URL'leri:"
echo "   • Ana uygulama: http://localhost"
echo "   • API Health: http://localhost/health"
echo ""
echo "📋 Yararlı komutlar:"
echo "   • Logları izle: docker-compose logs -f"
echo "   • Servisleri durdur: docker-compose down"
echo "   • Durumu kontrol et: docker-compose ps"