import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  ChefHat,
  Clock3,
  Monitor,
  QrCode,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Table2
} from "lucide-react";
import { tables } from "@/lib/catalog-data";
import { listOrders } from "@/lib/order-repository";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const workflow = [
  {
    href: "/masa/7",
    icon: QrCode,
    title: "Masa QR",
    text: "Müşteri masadan menüye girer, sepetini oluşturur ve siparişi gönderir.",
    tone: "teal"
  },
  {
    href: "/kasa",
    icon: ReceiptText,
    title: "Kasa Kontrolü",
    text: "Yeni siparişler kasaya düşer, kabul ve teslim adımları buradan yönetilir.",
    tone: "blue"
  },
  {
    href: "/mutfak",
    icon: ChefHat,
    title: "Mutfak Akışı",
    text: "Hazırlanacak ürünler net kartlarla görünür, hazır durumuna alınır.",
    tone: "amber"
  },
  {
    href: "/ekran",
    icon: Monitor,
    title: "Hazır Ekranı",
    text: "Müşteri sipariş numarasını ekranda görür ve kasadan teslim alır.",
    tone: "green"
  }
];

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0
});

const statusMeta: Record<OrderStatus, { label: string; tone: string }> = {
  new: { label: "Yeni", tone: "blue" },
  preparing: { label: "Hazırlanıyor", tone: "amber" },
  ready: { label: "Hazır", tone: "green" },
  delivered: { label: "Teslim edildi", tone: "slate" }
};

export default async function Home() {
  const orders = await listOrders();
  const activeOrders = orders.filter((order) => order.status !== "delivered");
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const averagePrep = activeOrders.length
    ? Math.round(activeOrders.reduce((sum, order) => sum + order.estimatedMinutes, 0) / activeOrders.length)
    : 0;
  const recentOrders = activeOrders.slice(0, 3);
  const screenOrders = [
    ...activeOrders.filter((order) => order.status === "ready"),
    ...activeOrders.filter((order) => order.status === "preparing")
  ].slice(0, 2);
  const metrics = [
    { value: activeOrders.length.toLocaleString("tr-TR"), label: "aktif sipariş" },
    { value: currency.format(revenue), label: "günlük ciro" },
    { value: `${averagePrep} dk`, label: "ortalama süre" },
    { value: tables.filter((table) => table.active).length.toLocaleString("tr-TR"), label: "aktif masa" }
  ];
  return (
    <main className="home-stage">
      <nav className="home-nav" aria-label="Ana navigasyon">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">
            <Store size={22} />
          </span>
          <span>
            <strong>BY Project</strong>
            <small>QR Order System</small>
          </span>
        </Link>
        <div className="home-nav-actions">
          <Link href="/admin">Yönetim</Link>
          <Link className="button button-dark" href="/kasa">
            <ReceiptText size={17} />
            Kasa paneli
          </Link>
        </div>
      </nav>

      <section className="hero-pro">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={14} />
            Kafe ve restoran operasyonu
          </span>
          <h1>Masadan sipariş, mutfakta akış, müşteride takip.</h1>
          <p>
            Garson yükünü azaltan, self servis yoğunluğunu düşüren ve sipariş durumunu müşteriye anlık gösteren
            modern QR sipariş platformu.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/masa/7">
              <QrCode size={18} />
              Müşteri deneyimi
            </Link>
            <Link className="button button-secondary" href="/mutfak">
              <ChefHat size={18} />
              Mutfak ekranı
            </Link>
          </div>
          <div className="trust-row" aria-label="Öne çıkan özellikler">
            <span>
              <ShieldCheck size={16} />
              Masa bazlı güvenli akış
            </span>
            <span>
              <BellRing size={16} />
              Tarayıcı bildirimi
            </span>
            <span>
              <Clock3 size={16} />
              Canlı durum takibi
            </span>
          </div>
        </div>

        <aside className="hero-console" aria-label="Canlı operasyon önizlemesi">
          <div className="console-topbar">
            <div>
              <span>Canlı Operasyon</span>
              <strong>Gerçek siparişler</strong>
            </div>
            <span className="pulse-pill">Online</span>
          </div>
          <div className="console-stats">
            <article>
              <span>Aktif</span>
              <strong>{activeOrders.length.toLocaleString("tr-TR")}</strong>
            </article>
            <article>
              <span>Ciro</span>
              <strong>{currency.format(revenue)}</strong>
            </article>
            <article>
              <span>Süre</span>
              <strong>{`${averagePrep} dk`}</strong>
            </article>
          </div>
          <div className="console-orders">
            {recentOrders.length === 0 ? (
              <p className="empty-state">Henüz gerçek sipariş yok.</p>
            ) : (
              recentOrders.map((order) => {
                const meta = statusMeta[order.status];

                return (
                  <article className={`console-order tone-${meta.tone}`} key={order.orderNo}>
                    <div>
                      <strong>#{order.orderNo}</strong>
                      <span>Masa {order.tableNo}</span>
                    </div>
                    <div>
                      <em>{meta.label}</em>
                      <b>{currency.format(order.total)}</b>
                    </div>
                  </article>
                );
              })
            )}
          </div>
          <div className="screen-preview">
            {screenOrders.length === 0 ? (
              <div>
                <span>Canlı ekran</span>
                <strong>Beklemede</strong>
              </div>
            ) : (
              screenOrders.map((order) => (
                <div key={order.orderNo}>
                  <span>{statusMeta[order.status].label}</span>
                  <strong>#{order.orderNo}</strong>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>

      <section className="metric-band" aria-label="Sistem metrikleri">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </section>

      <section className="workflow-grid" aria-label="Uygulama ekranları">
        {workflow.map((item, index) => {
          const Icon = item.icon;

          return (
            <Link className={`workflow-card tone-${item.tone}`} href={item.href} key={item.href}>
              <span className="step-index">0{index + 1}</span>
              <span className="workflow-icon">
                <Icon size={22} />
              </span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
              <span className="card-link">
                Aç
                <ArrowRight size={16} />
              </span>
            </Link>
          );
        })}
      </section>

      <section className="table-qr-panel">
        <div>
          <span className="eyebrow">
            <Table2 size={14} />
            Masa bağlantıları
          </span>
          <h2>QR kodun yönlendireceği müşteri linkleri hazır.</h2>
          <p>Her masa kendi linkine gider. Canlıda bu linkler gerçek QR kod çıktılarıyla eşleşir.</p>
        </div>
        <div className="qr-link-grid">
          {tables.slice(0, 6).map((table) => (
            <Link className="qr-row" href={`/masa/${table.id}`} key={table.id}>
              <span className="qr-code" aria-hidden="true" />
              <span>
                <strong>{table.label}</strong>
                <small>/masa/{table.id}</small>
              </span>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>

      <section className="next-step-panel">
        <div>
          <Settings2 size={22} />
          <strong>Canlı kullanım için sıradaki temel adım</strong>
          <span>Veritabanı, gerçek zamanlı kanal ve işletme giriş sistemi eklenmeli.</span>
        </div>
        <Link className="button button-secondary" href="/admin">
          Yönetim paneline git
        </Link>
      </section>
    </main>
  );
}
