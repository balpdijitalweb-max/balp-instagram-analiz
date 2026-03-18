# Balp Instagram Analiz - Kurulum Rehberi

## Proje Yapisi

```
balp-instagram-analiz/
├── server/              # Backend (Node.js + Express)
│   ├── index.js         # Ana sunucu - API endpoint'leri
│   ├── instagram.js     # Instagram API baglantisi & analiz motoru
│   ├── db.js            # SQLite veritabani
│   ├── package.json
│   └── .env.example
├── client/              # Frontend (React)
│   ├── src/
│   │   └── api.js       # Backend API istemcisi
│   └── package.json
└── KURULUM.md
```

## Gereksinimler

- Node.js 18+
- npm veya yarn

## Hizli Kurulum

### 1. Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Sunucu http://localhost:3001 adresinde baslar.

### 2. Frontend

```bash
cd client
npm install
npm start
```

Uygulama http://localhost:3000 adresinde acilir.

## API Endpoint'leri

| Method | Endpoint             | Aciklama                          |
|--------|---------------------|-----------------------------------|
| POST   | /api/register       | Yeni kullanici kaydi              |
| POST   | /api/login          | Kullanici girisi                  |
| GET    | /api/me             | Mevcut kullanici bilgisi          |
| POST   | /api/analyze        | Instagram analizi baslat          |
| POST   | /api/analyze-stream | Canli ilerlemeli analiz (SSE)     |
| POST   | /api/analyze-json   | JSON dosyasi ile analiz           |
| GET    | /api/analyses       | Gecmis analizleri listele         |
| GET    | /api/analyses/:id   | Belirli analiz detayi             |

## Nasil Calisir

1. Kullanici Balp hesabi olusturur
2. Instagram kullanici adi ve sifresi ile baglanir
3. Backend, Instagram GraphQL API uzerinden verileri ceker:
   - Takipci listesi (edge_followed_by)
   - Takip edilen listesi (edge_follow)
4. Karsilastirma yapilir:
   - Karsilikli takip
   - Seni takip eden ama sen etmiyorsun
   - Sen takip ediyorsun ama o etmiyor
5. Cinsiyet ve firma hesabi tespiti (isim analizi)
6. Sonuclar dashboard'da gosterilir ve veritabanina kaydedilir

## Guvenlik Notlari

- Instagram sifreleri KAYDEDILMEZ, sadece anlık API baglantisi icin kullanilir
- Kullanici sifreleri bcrypt ile hashlenir
- JWT token ile oturum yonetimi
- SQLite veritabani yerel olarak calisir

## Production Icin Oneriler

- SQLite yerine PostgreSQL kullanin
- Redis ile rate limiting ekleyin
- HTTPS zorunlu killin
- Instagram 2FA destegi ekleyin
- Proxy rotasyonu ile rate limit asin
- Docker ile containerize edin
