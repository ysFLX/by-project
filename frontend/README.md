# BY Catering Frontend

React + Vite SPA. Laravel API adresi `.env` icindeki `VITE_API_BASE_URL` ile verilir.

```bash
npm install
npm run dev
```

Varsayilan API:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Sayfalar:

- `/`: urun tanitimi
- `/catering`: catering operasyon paneli
- `/giris`: sirket uyelik kodu girisi
- `/uye/{companyCode}`: sirket gunluk kisi sayisi ve yemek yenildi onayi
