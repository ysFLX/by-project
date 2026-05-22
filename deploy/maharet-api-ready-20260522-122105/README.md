# BY Catering Backend

Laravel API uygulamasi. Mevcut catering API controller, model, route ve migration dosyalari Laravel iskeletinin icine yerlestirildi.

## Kurulum

```bash
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

Varsayilan API adresi:

```text
http://localhost:8000/api
```

Frontend icin:

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
