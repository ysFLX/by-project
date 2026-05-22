# Maharet Yemek

Maharet Yemek, kurumsal catering operasyonu icin hazirlanmis React frontend ve Laravel API projesidir.

## Proje Yapisi

```text
backend/                 Laravel API
frontend/                React + Vite arayuz
deploy/public-html-backend/
                         cPanel public_html/backend giris dosyalari
```

Projeyi ziplerken kaynak teslimi icin `backend`, `frontend`, `deploy/public-html-backend`, `.github`, `.gitignore` ve README dosyalari yeterlidir. `node_modules`, `vendor`, `dist` ve eski deploy zipleri kaynak paketine dahil edilmez.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Canli API adresi icin `frontend/.env`:

```env
VITE_API_BASE_URL=https://cateringhizmet.com.tr/backend/api
```

## Backend

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

Yerel API adresi:

```text
http://localhost:8000/api
```

## cPanel

Detayli kurulum icin:

```text
docs/CPANEL-DEPLOY.md
backend/DEPLOY-CPANEL.md
```

Canli kontrol adresi:

```text
https://cateringhizmet.com.tr/backend/api/health
```
