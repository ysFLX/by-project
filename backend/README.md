# BY Catering Laravel Backend

Bu klasör Laravel API tarafına taşınacak dosyaları içerir. Bu makinede `php` ve `composer` PATH'te olmadığı için Laravel uygulamasını otomatik scaffold edemedim.

## Kurulum

1. PHP 8.3+ ve Composer kur.
2. Gerçek Laravel uygulamasını oluştur:

```bash
composer create-project laravel/laravel backend-app
```

3. Bu klasördeki `app`, `database` ve `routes` içeriklerini `backend-app` içine taşı.
4. `backend-app/.env` içinde MySQL bağlantısını ayarla:

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=by_catering
DB_USERNAME=root
DB_PASSWORD=
```

5. Migration çalıştır:

```bash
php artisan migrate
php artisan serve
```

React frontend için API adresi:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## API

- `GET /api/client-companies`
- `POST /api/client-companies`
- `GET /api/client-companies/{companyCode}`
- `GET /api/meal-requests?serviceDate=YYYY-MM-DD&companyCode=...`
- `POST /api/meal-requests`
- `PATCH /api/meal-requests/{requestNo}`
