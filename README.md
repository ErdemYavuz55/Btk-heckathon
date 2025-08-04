# İnteraktif-Edu 🎓✨

AI destekli animasyonlu simülatörler ile eğitimi dönüştüren platform. Fizik, Matematik ve Kimya konularında canlı, interaktif deneyimler sunar.

## 🚀 Özellikler

- **🤖 AI Destekli Simülasyonlar**: Gemini API ile otomatik kod üretimi
- **🎯 Interaktif Kontroller**: Gerçek zamanlı parametre ayarları
- **🎨 Dinamik Temalar**: Fizik (mavi), Matematik (yeşil), Kimya (mor)
- **📱 Responsive Tasarım**: Mobil, tablet ve desktop uyumlu
- **🌟 Three.js Efektleri**: 3D arka plan animasyonları
- **🔒 Güvenli Sandbox**: İzole kod çalıştırma ortamı
- **🌐 Türkçe Arayüz**: Tam yerelleştirme desteği

## 🏗️ Teknoloji Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling & theming
- **Three.js** - 3D effects
- **p5.js** - Creative coding simulations

### Backend
- **Fastify** - Web framework
- **Google Gemini API** - AI code generation
- **Zod** - Schema validation

### Geliştirme
- **pnpm** - Package manager
- **Turbo** - Monorepo build system
- **Docker** - Containerization

## 📦 Kurulum

### Gereksinimler
- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

### 1️⃣ Depoyu Klonlayın
```bash
git clone <repository-url>
cd Btk-heckathon
```

### 2️⃣ Bağımlılıkları Yükleyin
```bash
pnpm install
```

### 3️⃣ Environment Variables
```bash
# infra/env.production.example dosyasını kopyalayın
cp infra/env.production.example .env

# Gemini API anahtarınızı ekleyin
GEMINI_API_KEY=your_api_key_here
```

## 🐳 Docker ile Çalıştırma

### Production Build
```bash
# 1. Infra dizinine gidin
cd infra

# 2. Environment variables'ı ayarlayın
export GEMINI_API_KEY=your_gemini_api_key_here

# 3. Docker servisleri başlatın
docker-compose up --build

# Arka planda çalıştırmak için:
docker-compose up --build -d
```

### Servisleri Durdurma
```bash
docker-compose down

# Volume'leri de temizlemek için:
docker-compose down -v
```

### Logları İzleme
```bash
# Tüm servislerin logları
docker-compose logs -f

# Belirli bir servisin logları
docker-compose logs -f frontend
docker-compose logs -f generator-api
docker-compose logs -f nginx
```

## 🛠️ Geliştirme Modu

### Local Development
```bash
# Shared schema build
pnpm build

# Frontend development server
pnpm --filter gateway-frontend dev

# API development server  
pnpm --filter generator-api dev
```

### Build Commands
```bash
# Tüm projeyi build et
pnpm build

# Sadece frontend
pnpm --filter gateway-frontend build

# Sadece API
pnpm --filter generator-api build
```

## 🌐 Erişim URL'leri

| Servis | URL | Açıklama |
|--------|-----|----------|
| **Frontend** | http://localhost | Ana uygulama |
| **API Health** | http://localhost/health | API sağlık kontrolü |
| **Nginx Status** | http://localhost/nginx_status | Load balancer durumu |

## 📁 Proje Yapısı

```
Btk-heckathon/
├── apps/
│   ├── gateway-frontend/     # Next.js frontend uygulaması
│   └── generator-api/        # Fastify API servisi
├── packages/
│   └── shared-schema/        # Paylaşılan TypeScript şemaları
├── infra/
│   ├── docker-compose.yml    # Docker orchestration
│   ├── Dockerfile.frontend   # Frontend container
│   ├── Dockerfile.api        # API container
│   ├── nginx.conf           # Load balancer config
│   └── env.production.example # Environment template
└── .dockerignore            # Docker ignore patterns
```

## 🔧 Konfigürasyon

### Docker Services
- **nginx**: Load balancer (Port 80)
- **frontend**: Next.js app (Internal: 3000)
- **generator-api**: Fastify API (Internal: 4000)

### Environment Variables
| Variable | Açıklama | Örnek |
|----------|----------|-------|
| `GEMINI_API_KEY` | Google Gemini API anahtarı | `AIza...` |
| `PORT` | API port numarası | `4000` |
| `GEN_API_URL` | API internal URL | `http://generator-api:4000` |

## 🚨 Sorun Giderme

### Docker Build Hataları
```bash
# Cache'i temizle
docker system prune -a

# Tekrar build et
docker-compose build --no-cache
```

### Port Çakışması
```bash
# Kullanılan portları kontrol et
docker ps
lsof -i :80

# Çakışan servisleri durdur
docker-compose down
```

### API Bağlantı Sorunları
```bash
# Container network'ü kontrol et
docker network ls
docker network inspect infra_interactive-edu

# Service discovery test
docker-compose exec frontend ping generator-api
```

## 📈 Performans

### Monitoring
```bash
# Container resource kullanımı
docker stats

# Disk kullanımı
docker system df
```

### Optimizasyon
- Multi-stage build ile küçük image boyutları
- Alpine Linux base images
- pnpm frozen lockfile ile hızlı install
- Nginx ile load balancing

## 🤝 Katkı

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje BTK Hackathon kapsamında geliştirilmiştir.

---

🎯 **İnteraktif-Edu ile eğitimi dönüştürün!** ✨
