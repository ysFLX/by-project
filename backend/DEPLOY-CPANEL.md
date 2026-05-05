# Maharet Yemek Laravel API cPanel Kurulum

Bu dosya backend tarafini cPanel MySQL ile calistirmak icin kisa kontroldur.

## Gecici Klasor Duzeni

Subdomain DNS beklemeden calismak icin gecici kurulum:

```text
/home/catering/maharet-api
/home/catering/public_html/backend
```

Laravel dosyalarinin tamami `maharet-api` icinde kalir. Ana sitenin altinda sadece public giris dosyalari bulunur:

```text
/home/catering/public_html/backend/index.php
/home/catering/public_html/backend/.htaccess
```

Test adresi:

```text
https://cateringhizmet.com.tr/backend/api/health
```

## 1. Ortam Dosyasi

cPanel uzerinde `maharet-api/.env` dosyasi bulunmali.

Gercek veritabani bilgileri sadece `.env` dosyasina yazilmali:

```env
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=cpanel_database_name
DB_USERNAME=cpanel_database_user
DB_PASSWORD=cpanel_database_password
```

Bu bilgileri GitHub'a veya repoya ekleme.

## 2. SSH veya cPanel Terminal Varsa

`maharet-api` klasorunde:

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --force
php artisan config:cache
php artisan route:cache
```

Bu paket `vendor` klasoruyle hazir geldigi icin Composer yoksa bile uygulama acilabilir. Yine de SSH varsa yukaridaki komutlar en temiz kurulumdur.

## 3. SSH Yoksa

SSH veya cPanel Terminal yoksa phpMyAdmin'de su dosyayi ice aktar:

```text
database/maharet_schema.sql
```

Bu dosya uygulamanin ana tablolarini olusturur:

```text
client_companies
meal_requests
meal_request_counters
```

## 4. Baglanti Kontrolu

API calisinca su endpoint veritabani baglantisini da test eder:

```text
https://cateringhizmet.com.tr/backend/api/health
```

Beklenen cevap:

```json
{
  "status": "ok",
  "app": "Maharet Yemek",
  "database": "mysql"
}
```

## 5. Frontend API Adresi

Frontend `.env` dosyasinda API adresi backend domainine cevrilmeli:

```env
VITE_API_BASE_URL=https://cateringhizmet.com.tr/backend/api
```

Sonra frontend icin tekrar `npm run build` alinir.
