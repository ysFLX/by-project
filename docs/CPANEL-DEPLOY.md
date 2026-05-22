# cPanel Deploy Notlari

Bu not, temiz proje klasorunden yeni cPanel paketi hazirlamak icindir.

## Frontend Paketi

1. Frontend klasorune gir:

```bash
cd frontend
```

2. Bagimliliklar yoksa kur:

```bash
npm install
```

3. Canli API adresini `frontend/.env` icinde ayarla:

```env
VITE_API_BASE_URL=https://cateringhizmet.com.tr/backend/api
```

4. Build al:

```bash
npm run build
```

5. `frontend/dist` icindeki dosyalari zipleyip cPanel `public_html` icine ac:

```text
public_html/index.html
public_html/.htaccess
public_html/assets/...
```

`dist` klasorunun kendisi `public_html/dist` olarak kalmamali.

## API Public Dosyalari

`deploy/public-html-backend` klasorundeki dosyalar cPanel tarafinda su klasore gider:

```text
public_html/backend
```

Beklenen ana dosyalar:

```text
public_html/backend/index.php
public_html/backend/.htaccess
```

## Laravel API Ana Klasoru

Laravel uygulamasi public_html disinda durmali:

```text
/home/catering/maharet-api
```

Bu klasore `backend` icindeki Laravel dosyalari yuklenir. `.env` canli veritabani bilgileriyle sunucuda olusturulur.

Kontrol:

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
