# Deploy Klasoru

Bu klasorde sadece cPanel icin elde tutulmasi gereken sabit public dosyalar bulunur.

```text
public-html-backend/
```

Frontend zipleri ve eski cPanel paketleri kaynak projede tutulmaz. Yeni frontend paketi gerektiginde:

```bash
cd frontend
npm install
npm run build
```

Sonra `frontend/dist` icerigi ziplenip `public_html` icine acilir.
