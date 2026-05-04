# BY Catering

Catering firmalarının yemek dağıttıkları şirketlerden günlük kişi sayısı alması ve yemek sonrası tabak toplama onayını takip etmesi için MVP.

## Hedef Mimari

- `asd/`: React + Vite SPA frontend.
- `backend/`: Laravel API için model, controller, route ve MySQL migration dosyaları.
- MySQL/MariaDB verisi phpMyAdmin üzerinden yönetilebilir.

> Not: Bu bilgisayarda `php` ve `composer` PATH'te görünmediği için Laravel uygulamasını otomatik kuramadım. `backend/README.md` içinde Laravel kurulum adımları var.

## Ürün Akışı

1. Catering firması `/catering` panelinden yemek verdiği şirket için üyelik kodu oluşturur.
2. Şirket bu kodla `/giris` üzerinden kendi ekranına girer.
3. Şirket sabah “bugün kaç kişilik yemek alınacak?” alanını doldurur.
4. Catering panelinde toplam porsiyon ve şirket bazlı talepler görünür.
5. Yemek yendikten sonra şirket “Yemek yenildi, tabaklar toplanabilir” butonuna basar.
6. Catering firması panelde toplanabilir şirketleri görür ve topladığında “Toplandı” durumuna alır.

## React Frontend

```bash
cd asd
npm install
npm run dev
```

`asd/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## Laravel Backend

```bash
composer create-project laravel/laravel backend-app
```

Sonra `backend/` içindeki `app`, `database`, `routes` dosyalarını Laravel uygulamasına taşı.

`.env` MySQL örneği:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=by_catering
DB_USERNAME=root
DB_PASSWORD=
```

```bash
php artisan migrate
php artisan serve
```
