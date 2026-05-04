# BY Catering React Frontend

React + Vite SPA. Laravel API adresi `.env` içindeki `VITE_API_BASE_URL` ile verilir.

```bash
npm install
npm run dev
```

Varsayılan API:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Sayfalar:

- `/`: ürün tanıtımı
- `/catering`: catering operasyon paneli
- `/giris`: şirket üyelik kodu girişi
- `/uye/{companyCode}`: şirket günlük kişi sayısı ve yemek yenildi onayı
