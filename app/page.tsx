import Link from "next/link";
import { tables } from "@/lib/mock-data";

const staffLinks = [
  { href: "/kasa", title: "Kasa Sipariş Paneli", text: "Yeni siparişleri kabul et, durum güncelle." },
  { href: "/mutfak", title: "Mutfak Ekranı", text: "Hazırlanan siparişleri kart kart takip et." },
  { href: "/ekran", title: "Hazır Sipariş Ekranı", text: "Müşterinin kendi numarasını göreceği ekran." },
  { href: "/admin", title: "Yönetici Paneli", text: "Menü, masa ve işletme ayarları için temel alan." }
];

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-hero">
        <div>
          <p className="eyebrow">BY Project</p>
          <h1>QR ile sipariş alan kafe/restoran başlangıç sistemi</h1>
          <p className="hero-text">
            Müşteri masadaki QR kodu okur, sipariş kasaya ve mutfağa düşer, hazır olunca takip sayfasında görünür.
            Bu repo ilk MVP iskeletini içerir.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/masa/7">
              Masa 7 müşteri akışı
            </Link>
            <Link className="button secondary" href="/kasa">
              Kasa paneli
            </Link>
          </div>
        </div>
        <div className="demo-card">
          <span className="demo-label">Örnek QR linkleri</span>
          {tables.slice(0, 4).map((table) => (
            <Link className="qr-row" href={`/masa/${table.id}`} key={table.id}>
              <span className="qr-code" aria-hidden="true" />
              <span>
                <strong>{table.label}</strong>
                <small>/masa/{table.id}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="route-grid" aria-label="Panel bağlantıları">
        {staffLinks.map((item) => (
          <Link className="route-card" href={item.href} key={item.href}>
            <span>{item.title}</span>
            <p>{item.text}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
