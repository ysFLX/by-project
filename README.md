# BY Project

QR kod ile masa siparişi alan kafe/restoran MVP başlangıç projesi.

## Ne var?

- `/masa/[tableNo]`: Müşteri menü, ürün detayı, sepet ve sipariş oluşturma akışı.
- `/takip/[orderNo]`: Müşteri sipariş durum takip ekranı.
- `/kasa`: Kasadaki bilgisayar için sipariş kabul ve durum paneli.
- `/mutfak`: Mutfak hazırlık ekranı.
- `/ekran`: Hazır sipariş numaralarının müşteriye gösterildiği ekran.
- `/admin`: Menü, masa/QR ve işletme ayarları için ilk yönetici ekranı.
- `/api/orders`: Geçici sipariş API'si.
- `/api/menu`: Örnek menü API'si.

## Çalıştırma

```bash
npm install
npm run dev
```

Sonra tarayıcıda:

```text
http://localhost:3000
```

## Bildirim mantığı

SMS ücretli olduğu için ilk aşamada daha mantıklı seçenekler:

1. Müşteri siparişten sonra `/takip/A42` gibi bir takip sayfasında kalır.
2. Kasa/mutfak siparişi `Hazır` yapınca takip ekranı bunu otomatik yenileyerek gösterir.
3. Müşteri izin verirse tarayıcı bildirimi gönderilir. Bu MVP içinde eklendi.
4. Daha sonraki aşamada PWA Web Push, Firebase, Supabase Realtime veya Pusher ile sayfa kapalıyken de bildirim kurulabilir.

## Önemli not

Bu ilk temel sürümde siparişler server hafızasında tutuluyor. Development için iyi, ama canlı kullanım için veritabanı gerekir. Bir sonraki sağlam adım Prisma + PostgreSQL veya Supabase ile kalıcı sipariş tablosu kurmak.
