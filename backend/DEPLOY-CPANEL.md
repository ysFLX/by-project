# Maharet Yemek Laravel API cPanel Kurulum

Bu dosya backend tarafını cPanel MySQL ile çalıştırmak için kısa kontroldür.

## 1. Ortam Dosyası

cPanel üzerinde `backend/.env` oluştur ve `backend/.env.cpanel.example` içeriğini temel al.

Gerçek veritabanı bilgileri sadece `.env` dosyasına yazılmalı:

```env
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=cpanel_database_name
DB_USERNAME=cpanel_database_user
DB_PASSWORD=cpanel_database_password
```

Bu bilgileri GitHub'a veya repoya ekleme.

## 2. İlk Komutlar

SSH varsa backend klasöründe:

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --force
php artisan config:cache
php artisan route:cache
```

## 3. Bağlantı Kontrolü

API çalışınca şu endpoint veritabanı bağlantısını da test eder:

```text
/api/health
```

Beklenen cevap:

```json
{
  "status": "ok",
  "app": "Maharet Yemek",
  "database": "mysql"
}
```

## 4. Frontend API Adresi

Frontend `.env` dosyasında API adresi backend domainine çevrilmeli:

```env
VITE_API_BASE_URL=https://api.maharetyemek.com.tr/api
```

Sonra frontend için tekrar `npm run build` alınır.
