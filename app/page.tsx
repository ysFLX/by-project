import Link from "next/link";
import { tables } from "@/lib/mock-data";

const staffLinks = [
  { href: "/kasa", title: "Kasa Paneli", text: "Sipariş kabulü, ödeme kontrolü ve teslim akışı." },
  { href: "/mutfak", title: "Mutfak Ekranı", text: "Hazırlık kuyruğu, masa bilgisi ve ürün detayları." },
  { href: "/ekran", title: "Hazır Ekranı", text: "Kasadan teslim alınacak sipariş numaraları." },
  { href: "/admin", title: "Yönetim", text: "Menü, masa ve işletme ayarlarını yönetin." }
];

const metrics = [
  { value: "QR", label: "Masa bağlantısı" },
  { value: "2.5 sn", label: "Canlı yenileme" },
  { value: "4 ekran", label: "Operasyon akışı" }
];

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-hero">
        <div>
          <p className="eyebrow">BY Project POS</p>
          <h1>Kahve Durağı operasyon konsolu</h1>
          <p className="hero-text">
            Masa QR siparişi, kasa onayı, mutfak hazırlığı ve müşteri takip ekranı tek akışta birleşir.
          </p>
          <div className="home-metrics">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
          <div className="hero-actions">
            <Link className="button primary" href="/masa/7">
              Masa 7
            </Link>
            <Link className="button secondary" href="/kasa">
              Kasa paneli
            </Link>
          </div>
        </div>
        <div className="demo-card">
          <span className="demo-label">Masa QR linkleri</span>
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
