# Balp Instagram Analiz

Instagram takipci ve takip edilen analiz araci. Hesabini bagla, takipcilerini analiz et, cinsiyet ve firma hesabi tespiti yap.

## Ozellikler

- Instagram hesabi ile baglanti (login + GraphQL API)
- Takipci / Takip edilen karsilastirmasi
- Karsilikli takip analizi
- Seni takip eden ama sen etmiyorsun listesi
- Sen takip ediyorsun ama o etmiyor listesi
- Cinsiyet tespiti (Turk isimleri veritabani)
- Firma / Marka hesabi tespiti
- Aranabilir ve sayfalanabilir kullanici listeleri
- Grafik ve dashboard (Recharts)
- JWT ile kullanici yonetimi
- Analiz gecmisi kaydi

## Teknolojiler

**Backend:** Node.js, Express, JWT, bcrypt, JSON DB

**Frontend:** React, Recharts, Tailwind CSS

## Kurulum

### Backend

```bash
cd server
cp .env.example .env
npm install
node index.js
```

Sunucu http://localhost:3001 adresinde baslar.

### Frontend

```bash
cd client
npm install
npm start
```

Uygulama http://localhost:3000 adresinde acilir.

## API Endpoint'leri

| Method | Endpoint             | Aciklama                      |
|--------|---------------------|-------------------------------|
| POST   | /api/register       | Yeni kullanici kaydi          |
| POST   | /api/login          | Kullanici girisi              |
| GET    | /api/me             | Mevcut kullanici bilgisi      |
| POST   | /api/analyze        | Instagram analizi baslat      |
| POST   | /api/analyze-stream | Canli ilerlemeli analiz (SSE) |
| POST   | /api/analyze-json   | JSON dosyasi ile analiz       |
| GET    | /api/analyses       | Gecmis analizleri listele     |
| GET    | /api/analyses/:id   | Belirli analiz detayi         |

## Ekran Goruntuleri

1. **Giris / Kayit** - Balp hesabi ile oturum ac
2. **Instagram Bagla** - Instagram kullanici adi ve sifre ile baglan
3. **Dashboard** - Genel bakis, takip listeleri, cinsiyet analizi

---

**Balp Dijital** tarafindan gelistirilmistir.
