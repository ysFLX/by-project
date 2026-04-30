"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Armchair,
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarDays,
  ChefHat,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Home,
  Menu,
  MonitorCheck,
  Moon,
  MoreVertical,
  Package,
  QrCode,
  ReceiptText,
  ScanQrCode,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Table2,
  Timer,
  TrendingUp,
  Utensils,
  Wifi
} from "lucide-react";
import type { Order, OrderStatus, Product, ProductCategory, TableInfo } from "@/lib/types";

type Props = {
  menu: Product[];
  tables: TableInfo[];
};

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0
});

const navItems = [
  { label: "Operasyon", icon: Home, active: true },
  { label: "Canlı Siparişler", icon: ReceiptText },
  { label: "Mutfak Kuyruğu", icon: ChefHat },
  { label: "Masa & QR", icon: QrCode },
  { label: "Menü Yönetimi", icon: Package },
  { label: "Hazır Ekranı", icon: MonitorCheck },
  { label: "Kasa Akışı", icon: CreditCard },
  { label: "Bildirimler", icon: Bell },
  { label: "Ayarlar", icon: Settings }
];

const actionLinks = [
  { href: "/kasa", label: "Kasa Paneli", text: "Sipariş kabul", icon: ReceiptText, tone: "blue" },
  { href: "/mutfak", label: "Mutfak Ekranı", text: "Hazırlık kuyruğu", icon: ChefHat, tone: "amber" },
  { href: "/ekran", label: "Hazır Ekranı", text: "Müşteri görünümü", icon: MonitorCheck, tone: "green" },
  { href: "/masa/7", label: "Masa QR", text: "Müşteri akışı", icon: ScanQrCode, tone: "purple" }
];

const hourlyBaseline = [2, 3, 5, 4, 7, 9, 8, 11, 13, 10, 14, 17, 15, 12, 16, 19, 18, 14, 11];

const statusMeta: Record<OrderStatus, { label: string; tone: string; color: string }> = {
  new: { label: "Yeni", tone: "blue", color: "#2f8cff" },
  preparing: { label: "Hazırlanıyor", tone: "orange", color: "#ff9f3f" },
  ready: { label: "Hazır", tone: "green", color: "#20c786" },
  delivered: { label: "Teslim edildi", tone: "slate", color: "#64748b" }
};

const categoryOrder: ProductCategory[] = ["Kahveler", "Tatlılar", "Yemekler", "İçecekler"];

function toChartPoints(values: number[]) {
  const max = Math.max(...values);
  const min = Math.min(...values);

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / (max - min || 1)) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function elapsedMinutes(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
}

function itemSummary(order: Order) {
  const visibleItems = order.items.slice(0, 2).map((item) => `${item.productName} x${item.quantity}`);
  const remaining = order.items.length - visibleItems.length;

  return remaining > 0 ? `${visibleItems.join(", ")} +${remaining}` : visibleItems.join(", ");
}

function buildDonutGradient(rows: Array<{ percent: number; color: string }>) {
  let cursor = 0;
  const segments = rows.map((row) => {
    const start = cursor;
    cursor += row.percent;
    return `${row.color} ${start}% ${cursor}%`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

export function AdminDashboard({ menu, tables }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function loadOrders() {
      const response = await fetch("/api/orders", { cache: "no-store" });
      const payload = await response.json();

      if (response.ok) {
        setOrders(payload.orders);
      }
    }

    loadOrders();
    const interval = window.setInterval(loadOrders, 2500);

    return () => window.clearInterval(interval);
  }, []);

  const activeOrders = useMemo(() => orders.filter((order) => order.status !== "delivered"), [orders]);
  const newOrders = activeOrders.filter((order) => order.status === "new");
  const preparingOrders = activeOrders.filter((order) => order.status === "new" || order.status === "preparing");
  const readyOrders = activeOrders.filter((order) => order.status === "ready");
  const deliveredOrders = orders.filter((order) => order.status === "delivered");
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const averagePrep = activeOrders.length
    ? Math.round(activeOrders.reduce((sum, order) => sum + order.estimatedMinutes, 0) / activeOrders.length)
    : 0;
  const longestWaiting = activeOrders.reduce((max, order) => Math.max(max, elapsedMinutes(order.createdAt)), 0);
  const activeTableCount = new Set(activeOrders.map((order) => order.tableNo)).size;
  const activeMenuCount = menu.filter((product) => product.active).length;

  const stats = useMemo(
    () => [
      {
        label: "Aktif Sipariş",
        value: activeOrders.length.toLocaleString("tr-TR"),
        change: `${newOrders.length} yeni`,
        icon: ShoppingBag,
        tone: "purple"
      },
      {
        label: "Mutfak Kuyruğu",
        value: preparingOrders.length.toLocaleString("tr-TR"),
        change: `${averagePrep} dk ort.`,
        icon: ChefHat,
        tone: "blue"
      },
      {
        label: "Hazır Teslim",
        value: readyOrders.length.toLocaleString("tr-TR"),
        change: `${longestWaiting} dk bekleyen`,
        icon: BadgeCheck,
        tone: "green"
      },
      {
        label: "Günlük Ciro",
        value: currency.format(revenue),
        change: `${activeTableCount} masa aktif`,
        icon: CircleDollarSign,
        tone: "orange"
      }
    ],
    [activeOrders.length, activeTableCount, averagePrep, longestWaiting, newOrders.length, preparingOrders.length, readyOrders.length, revenue]
  );

  const statusRows = (["new", "preparing", "ready", "delivered"] as OrderStatus[]).map((status) => {
    const value = status === "new"
      ? newOrders.length
      : status === "preparing"
        ? activeOrders.filter((order) => order.status === "preparing").length
        : status === "ready"
          ? readyOrders.length
          : deliveredOrders.length;
    const total = Math.max(orders.length, 1);

    return {
      ...statusMeta[status],
      value,
      percent: Math.round((value / total) * 100)
    };
  });

  const donutGradient = orders.length
    ? buildDonutGradient(statusRows.map((row) => ({ percent: row.percent, color: row.color })))
    : "conic-gradient(#e2e8f0 0 100%)";

  const chartValues = orders.length
    ? hourlyBaseline.map((value, index) => value + orders.filter((order) => elapsedMinutes(order.createdAt) <= (index + 1) * 8).length)
    : hourlyBaseline;

  const menuHealth = categoryOrder.map((category) => {
    const products = menu.filter((product) => product.category === category);
    const activeProducts = products.filter((product) => product.active);

    return {
      category,
      total: products.length,
      active: activeProducts.length
    };
  });

  const notifications = [
    {
      icon: BadgeCheck,
      title: readyOrders[0] ? `#${readyOrders[0].orderNo} teslim bekliyor` : "Hazır sipariş yok",
      text: readyOrders[0] ? `Masa ${readyOrders[0].tableNo} siparişi müşteri ekranında hazır görünüyor.` : "Hazır olan siparişler burada öne düşecek.",
      time: "canlı",
      tone: "green"
    },
    {
      icon: ChefHat,
      title: `${preparingOrders.length} sipariş mutfakta`,
      text: newOrders.length ? `${newOrders.length} yeni sipariş kabul bekliyor.` : "Yeni sipariş kuyruğu temiz.",
      time: "şimdi",
      tone: "amber"
    },
    {
      icon: QrCode,
      title: "Masa QR bağlantıları aktif",
      text: `${tables.filter((table) => table.active).length} masa müşteri sipariş linkine bağlı.`,
      time: "online",
      tone: "blue"
    },
    {
      icon: ReceiptText,
      title: "Müşteri notları kasaya düşüyor",
      text: "Sipariş ve ürün notları operasyon panellerinde görüntüleniyor.",
      time: "kontrol edildi",
      tone: "purple"
    }
  ];

  const todayLabel = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date());

  return (
    <main className="kanka-admin-shell">
      <aside className="kanka-sidebar">
        <div className="kanka-brand">
          <span>BY</span>
          <div>
            <strong>BY PROJECT</strong>
            <small>QR OPERASYON</small>
          </div>
        </div>

        <nav className="kanka-nav" aria-label="Admin menüsü">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button className={item.active ? "active" : ""} key={item.label} type="button">
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="kanka-sidebar-bottom">
          <button className="dark-mode-card" type="button">
            <span>
              <Moon size={18} />
              Gece Operasyonu
            </span>
            <i />
          </button>
          <div className="sidebar-user-card">
            <span className="avatar">KD</span>
            <div>
              <strong>Kahve Durağı</strong>
              <small>operasyon@byproject.app</small>
              <em>Canlı sistem</em>
            </div>
            <ChevronDown size={17} />
          </div>
        </div>
      </aside>

      <section className="kanka-main">
        <header className="kanka-topbar">
          <button className="icon-button" type="button" aria-label="Menü">
            <Menu size={22} />
          </button>
          <label className="admin-search">
            <input placeholder="Sipariş, masa veya ürün ara..." />
            <Search size={20} />
          </label>
          <button className="notification-button" type="button" aria-label="Bildirimler">
            <Bell size={20} />
            <span>{Math.max(newOrders.length + readyOrders.length, 1)}</span>
          </button>
          <div className="topbar-user">
            <span className="avatar image">KD</span>
            <div>
              <strong>İşletme Yöneticisi</strong>
              <small>Kahve Durağı</small>
            </div>
            <ChevronDown size={18} />
          </div>
        </header>

        <div className="kanka-content">
          <section className="admin-welcome">
            <div>
              <h1>Kahve Durağı Operasyon Paneli</h1>
              <p>Masa QR siparişleri, kasa, mutfak ve hazır ekranı tek canlı merkezde.</p>
            </div>
            <button className="date-filter" type="button">
              <CalendarDays size={17} />
              {todayLabel}
              <ChevronDown size={16} />
            </button>
          </section>

          <section className="kanka-stat-grid">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <article className="kanka-stat-card" key={stat.label}>
                  <span className={`stat-icon ${stat.tone}`}>
                    <Icon size={27} />
                  </span>
                  <div>
                    <small>{stat.label}</small>
                    <strong>{stat.value}</strong>
                    <em>
                      <TrendingUp size={13} />
                      {stat.change}
                    </em>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="admin-action-strip" aria-label="Hızlı operasyon bağlantıları">
            {actionLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link className={`admin-action-card tone-${item.tone}`} href={item.href} key={item.href}>
                  <span>
                    <Icon size={21} />
                  </span>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.text}</small>
                  </div>
                </Link>
              );
            })}
          </section>

          <section className="kanka-analytics-grid">
            <article className="kanka-panel revenue-panel">
              <div className="panel-head">
                <h2>Saatlik Sipariş Akışı</h2>
                <button type="button">
                  Bugün
                  <ChevronDown size={15} />
                </button>
              </div>
              <div className="chart-legend">
                <span className="current">Sipariş</span>
                <span className="previous">Beklenen tempo</span>
              </div>
              <div className="line-chart ops-chart">
                <span>24</span>
                <span>18</span>
                <span>12</span>
                <span>6</span>
                <span>3</span>
                <span>0</span>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <polyline className="chart-line-muted" points={toChartPoints(hourlyBaseline)} />
                  <polyline className="chart-line-main" points={toChartPoints(chartValues)} />
                </svg>
                <div className="chart-days">
                  <small>09:00</small>
                  <small>11:00</small>
                  <small>13:00</small>
                  <small>15:00</small>
                  <small>17:00</small>
                  <small>19:00</small>
                  <small>21:00</small>
                </div>
              </div>
            </article>

            <article className="kanka-panel status-panel">
              <div className="panel-head">
                <h2>Sipariş Operasyonu</h2>
                <button type="button">
                  Canlı
                  <Wifi size={15} />
                </button>
              </div>
              <div className="donut-layout">
                <div className="donut-chart" style={{ background: donutGradient }}>
                  <div>
                    <span>Aktif</span>
                    <strong>{activeOrders.length.toLocaleString("tr-TR")}</strong>
                  </div>
                </div>
                <div className="status-list">
                  {statusRows.map((row) => (
                    <p key={row.label}>
                      <span className={row.tone} />
                      <strong>{row.label}</strong>
                      <em>
                        {row.value.toLocaleString("tr-TR")} ({row.percent}%)
                      </em>
                    </p>
                  ))}
                </div>
              </div>
            </article>
          </section>

          <section className="kanka-bottom-grid">
            <article className="kanka-panel">
              <div className="panel-head compact-head">
                <h2>Son Siparişler</h2>
                <Link href="/kasa">Kasaya Git</Link>
              </div>
              <div className="recent-orders">
                {orders.length === 0 ? (
                  <p className="empty-state">Henüz sipariş yok.</p>
                ) : (
                  orders.slice(0, 5).map((order) => (
                    <div key={order.orderNo}>
                      <strong>#{order.orderNo}</strong>
                      <span>{formatTime(order.createdAt)}</span>
                      <i className="avatar mini">M{order.tableNo}</i>
                      <div>
                        <b>Masa {order.tableNo}</b>
                        <small>{itemSummary(order)}</small>
                      </div>
                      <em>{currency.format(order.total)}</em>
                      <mark className={order.status}>{statusMeta[order.status].label}</mark>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="kanka-panel">
              <div className="panel-head compact-head">
                <h2>Operasyon Bildirimleri</h2>
                <div>
                  <button type="button">Canlı</button>
                  <MoreVertical size={18} />
                </div>
              </div>
              <div className="notification-list">
                {notifications.map((notification) => {
                  const Icon = notification.icon;

                  return (
                    <div key={notification.title}>
                      <span className={notification.tone}>
                        <Icon size={18} />
                      </span>
                      <div>
                        <strong>{notification.title}</strong>
                        <small>{notification.text}</small>
                      </div>
                      <em>{notification.time}</em>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          <section className="kanka-ops-grid">
            <article className="kanka-panel">
              <div className="panel-head compact-head">
                <h2>Masa & QR Yönetimi</h2>
                <Link href="/masa/7">Önizle</Link>
              </div>
              <div className="qr-table-list">
                {tables.map((table) => {
                  const tableOrders = activeOrders.filter((order) => order.tableNo === table.id);

                  return (
                    <Link href={`/masa/${table.id}`} key={table.id}>
                      <span className="qr-mini-code" aria-hidden="true" />
                      <div>
                        <strong>{table.label}</strong>
                        <small>/masa/{table.id} · {table.seats}</small>
                      </div>
                      <em>{tableOrders.length ? `${tableOrders.length} aktif` : "boş"}</em>
                    </Link>
                  );
                })}
              </div>
            </article>

            <article className="kanka-panel">
              <div className="panel-head compact-head">
                <h2>Menü Sağlığı</h2>
                <span className="panel-metric">{activeMenuCount}/{menu.length} aktif</span>
              </div>
              <div className="menu-health-list">
                {menuHealth.map((item) => (
                  <div key={item.category}>
                    <span>
                      {item.category === "Kahveler" ? <Store size={17} /> : item.category === "Yemekler" ? <Utensils size={17} /> : <Package size={17} />}
                    </span>
                    <div>
                      <strong>{item.category}</strong>
                      <small>{item.active} aktif ürün</small>
                    </div>
                    <em>{item.total}</em>
                  </div>
                ))}
              </div>
              <div className="channel-health">
                <p>
                  <Timer size={17} />
                  Ortalama hazırlık: <strong>{averagePrep} dk</strong>
                </p>
                <p>
                  <Armchair size={17} />
                  Aktif masa: <strong>{activeTableCount}/{tables.length}</strong>
                </p>
              </div>
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}
