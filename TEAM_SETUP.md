# 👥 Ekip İçin Hızlı Docker Kurulumu

Bu kısa rehber, projeyi Docker ile hızlıca çalıştırmanız için hazırlanmıştır.

## 🚀 Hızlı Başlangıç

### Seçenek 1: Otomatik Setup (Önerilen)

**Windows için:**
```batch
# Proje klasörüne gidin ve çalıştırın:
setup.bat
```

**Mac/Linux için:**
```bash
# Executable hale getirin ve çalıştırın:
chmod +x setup.sh
./setup.sh
```

### Seçenek 2: Manuel Setup

1. **Environment dosyasını hazırlayın:**
```bash
cp infra/env.production.example infra/.env
```

2. **Gemini API anahtarınızı ekleyin:**
   - `infra/.env` dosyasını açın
   - `GEMINI_API_KEY=your_gemini_api_key_here` satırında `your_gemini_api_key_here` kısmını gerçek API anahtarınızla değiştirin

3. **Docker servisleri başlatın:**
```bash
cd infra
docker-compose up --build
```

## 📍 Erişim

- **Ana uygulama:** http://localhost
- **API Health Check:** http://localhost/health

## 🛠️ Yararlı Komutlar

```bash
# Logları canlı izle
docker-compose logs -f

# Belirli servisin logları
docker-compose logs -f frontend
docker-compose logs -f generator-api

# Servisleri durdur
docker-compose down

# Durumu kontrol et
docker-compose ps

# Cache temizle (sorun durumunda)
docker system prune -a
```

## 🆘 Sorun mu yaşıyorsunuz?

1. **Port 80 zaten kullanımda:**
   - Bilgisayarınızda çalışan web server'ı durdurun
   - Veya `docker-compose.yml`'de nginx portunu değiştirin

2. **Docker build hatası:**
   ```bash
   docker system prune -a
   docker-compose build --no-cache
   ```

3. **API bağlantı sorunu:**
   - `.env` dosyasında `GEMINI_API_KEY` doğru mu kontrol edin
   - Container network'ü: `docker network inspect infra_interactive-edu`

## 📋 Gereksinimler

- Docker Desktop yüklü olmalı
- Gemini API anahtarı (Google AI Studio'dan alabilirsiniz)
- En az 4GB RAM (Docker için)