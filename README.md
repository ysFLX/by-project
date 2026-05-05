# Maharet Yemek

React frontend ve Laravel API iki temiz klasorde tutulur:

- `frontend/`: React + Vite SPA.
- `backend/`: Laravel API.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

`frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## Backend

Backend resmi Laravel iskeleti uzerine kuruldu. Calistirmak icin PHP 8.3+ ve Composer gerekir.

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

MySQL ayarlari `backend/.env.example` icinde hazir:

```env
DB_CONNECTION=mysql
DB_DATABASE=maharet_yemek
DB_USERNAME=maharet_user
DB_PASSWORD=
```

cPanel kurulum notları için:

```text
backend/DEPLOY-CPANEL.md
```

## Akis

1. Catering firmasi `/catering` panelinden sirket uyelik kodu olusturur.
2. Sirket `/giris` uzerinden kodla girer.
3. Gunluk yemek kisi sayisi girilir.
4. Catering panelinde toplam porsiyon ve sirket bazli talepler gorunur.
5. Yemek yenildikten sonra sirket toplama onayi verir.
6. Catering firmasi talebi `Toplandi` durumuna alir.
