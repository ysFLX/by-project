# BY Catering

Catering firmalarının yemek dağıttıkları şirketlerden günlük kişi sayısı alması ve yemek sonrası tabak toplama onayını takip etmesi için MVP.

## Yeni Akış

- `/`: Catering ürün tanıtımı ve ana yönlendirme.
- `/catering`: Catering firmasının operasyon paneli. Şirket üyeliği oluşturur, günlük porsiyon toplamını ve toplama durumunu görür.
- `/giris`: Yemek alan şirketin üyelik koduyla giriş ekranı.
- `/uye/[companyCode]`: Şirketin bugünkü kişi sayısını girdiği ve yemek sonrası “tabaklar toplanabilir” onayı verdiği alan.
- `/api/client-companies`: Şirket üyeliklerini listeler ve oluşturur.
- `/api/meal-requests`: Günlük yemek taleplerini listeler ve kişi sayısı gönderir.
- `/api/meal-requests/[requestNo]`: Yemek yenildi/toplandı durumunu günceller.

## MVP Mantığı

1. Catering firması `/catering` panelinden yemek verdiği şirket için üyelik kodu oluşturur.
2. Şirket bu kodla `/giris` üzerinden kendi ekranına girer.
3. Şirket sabah “bugün kaç kişilik yemek alınacak?” alanını doldurur.
4. Catering panelinde toplam porsiyon ve şirket bazlı talepler görünür.
5. Yemek yendikten sonra şirket “Yemek yenildi, tabaklar toplanabilir” butonuna basar.
6. Catering firması panelde toplanabilir şirketleri görür ve topladığında “Toplandı” durumuna alır.

## Komutlar

```bash
npm run dev
npm run typecheck
npm run build
```

## Not

Bu sürümde üyelik ve yemek talepleri geliştirme hızını korumak için server hafızasında tutuluyor. Canlı satışa hazırlanırken sıradaki sağlam adım bu yeni `ClientCompany` ve `MealRequest` modellerini PostgreSQL/Prisma repository katmanına bağlamak ve gerçek kullanıcı girişi eklemek.