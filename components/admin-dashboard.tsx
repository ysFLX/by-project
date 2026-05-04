"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Armchair,
  BadgeCheck,
  Bell,
  CalendarDays,
  ChefHat,
  ChevronDown,
  CircleDollarSign,
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
  Timer,
  TrendingUp,
  Utensils,
  Wifi
} from "lucide-react";
import type { Order, OrderStatus, Product, ProductCategory, TableInfo } from "@/lib/types";

export type AdminView = "overview" | "orders" | "tables" | "menu" | "notifications" | "settings";

type Props = {
  menu: Product[];
  tables: TableInfo[];
  section?: AdminView;
};

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0
});

const navItems = [
  { label: "Operasyon", icon: Home, href: "/admin", view: "overview" },
  { label: "Canlı Siparişler", icon: ReceiptText, href: "/admin/siparisler", view: "orders" },
  { label: "Mutfak Kuyruğu", icon: ChefHat, href: "/mutfak" },
  { label: "Masa & QR", icon: QrCode, href: "/admin/masalar", view: "tables" },
  { label: "Menü Yönetimi", icon: Package, href: "/admin/menu", view: "menu" },
  { label: "Hazır Ekranı", icon: MonitorCheck, href: "/ekran" },
  { label: "Kasa Akışı", icon: CreditCard, href: "/kasa" },
  { label: "Bildirimler", icon: Bell, href: "/admin/bildirimler", view: "notifications" },
  { label: "Ayarlar", icon: Settings, href: "/admin/ayarlar", view: "settings" }
];

const actionLinks = [
  { href: "/kasa", label: "Kasa Paneli", text: "Sipariş kabul", icon: ReceiptText, tone: "blue" },
  { href: "/mutfak", label: "Mutfak Ekranı", text: "Hazırlık kuyruğu", icon: ChefHat, tone: "amber" },
  { href: "/ekran", label: "Hazır Ekranı", text: "Müşteri görünümü", icon: MonitorCheck, tone: "green" },
  { href: "/masa/7", label: "Masa QR", text: "Müşteri akışı", icon: ScanQrCode, tone: "purple" }
];

const emptyChartValues = Array.from({ length: 19 }, () => 0);

const statusMeta: Record<OrderStatus, { label: string; tone: string; color: string }> = {
  new: { label: "Yeni", tone: "blue", color: "#2f8cff" },
  preparing: { label: "Hazırlanıyor", tone: "orange", color: "#ff9f3f" },
  ready: { label: "Hazır", tone: "green", color: "#20c786" },
  delivered: { label: "Teslim edildi", tone: "slate", color: "#64748b" }
};

const categoryOrder: ProductCategory[] = ["Kahveler", "Tatlılar", "Yemekler", "İçecekler"];

const viewCopy: Record<AdminView, { title: string; text: string }> = {
  overview: {
    title: "Operasyon Paneli",
    text: "Masa QR siparişleri, kasa, mutfak ve hazır ekranı tek canlı merkezde."
  },
  orders: {
    title: "Canlı Siparişler",
    text: "Müşteriden gelen siparişleri, notları, masa bilgisini ve durumunu buradan takip et."
  },
  tables: {
    title: "Masa & QR Yönetimi",
    text: "Her masanın müşteri sipariş linki ve aktif sipariş yoğunluğu burada."
  },
  menu: {
    title: "Menü Yönetimi",
    text: "Kategori bazlı ürün durumunu ve menünün operasyon sağlığını izle."
  },
  notifications: {
    title: "Operasyon Bildirimleri",
    text: "Hazır siparişler, mutfak kuyruğu ve sistem sinyalleri bu ekranda."
  },
  settings: {
    title: "İşletme Ayarları",
    text: "Servis, bildirim ve operasyon parametrelerini tek yerde kontrol et."
  }
};

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

export function AdminDashboard({ menu, tables, section = "overview" }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [isSidebarCompact, setIsSidebarCompact] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);

  async function loadOrders() {
    const response = await fetch("/api/orders", { cache: "no-store" });
    const payload = await response.json();

    if (response.ok) {
      setOrders(payload.orders);
    }
  }

  useEffect(() => {
    loadOrders();
    const interval = window.setInterval(loadOrders, 2500);

    return () => window.clearInterval(interval);
  }, []);

  const activeOrders = useMemo(() => orders.filter((order) => order.status !== "delivered"), [orders]);
  const newOrders = activeOrders.filter((order) => order.status === "new");
  const preparingOrders = activeOrders.filter((order) => order.status === "new" || order.status === "preparing");
  const readyOrders = activeOrders.filter((order) => order.status === "ready");
  const kitchenOrders = activeOrders.filter((order) => order.status === "preparing");
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

  const chartValues = emptyChartValues.map((_, index) => {
    return orders.filter((order) => elapsedMinutes(order.createdAt) <= (index + 1) * 8).length;
  });
  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
  const filteredOrders = normalizedQuery
    ? orders.filter((order) => {
        const searchable = [
          order.orderNo,
          `Masa ${order.tableNo}`,
          statusMeta[order.status].label,
          order.note ?? "",
          ...order.items.flatMap((item) => [item.productName, item.note ?? "", ...item.options])
        ]
          .join(" ")
          .toLocaleLowerCase("tr-TR");

        return searchable.includes(normalizedQuery);
      })
    : orders;

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
    ...(readyOrders[0]
      ? [
          {
            icon: BadgeCheck,
            title: `#${readyOrders[0].orderNo} teslim bekliyor`,
            text: `Masa ${readyOrders[0].tableNo} siparişi müşteri ekranında hazır görünüyor.`,
            time: "canlı",
            tone: "green",
            href: `/takip/${readyOrders[0].orderNo}`
          }
        ]
      : []),
    ...(newOrders.length
      ? [
          {
            icon: ReceiptText,
            title: `${newOrders.length} yeni sipariş kabul bekliyor`,
            text: "Kasa panelinden onaylanmayı bekleyen gerçek sipariş var.",
            time: "şimdi",
            tone: "blue",
            href: "/kasa"
          }
        ]
      : []),
    ...(kitchenOrders.length
      ? [
          {
            icon: ChefHat,
            title: `${kitchenOrders.length} sipariş mutfakta`,
            text: "Hazırlık durumunu mutfak ekranından takip et.",
            time: "canlı",
            tone: "amber",
            href: "/mutfak"
          }
        ]
      : [])
  ];
  const todayLabel = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date());
  const copy = viewCopy[section];
  const showOverview = section === "overview";
  const showOrders = showOverview || section === "orders";
  const showNotifications = showOverview || section === "notifications";
  const showTables = showOverview || section === "tables";
  const showMenu = showOverview || section === "menu";
  const showSettings = section === "settings";
  const splitGridClass = showOverview ? "kanka-bottom-grid" : "admin-single-grid";
  const opsGridClass = showOverview ? "kanka-ops-grid" : "admin-single-grid";

  return (
    <main className={`kanka-admin-shell${isSidebarCompact ? " sidebar-compact" : ""}${isNightMode ? " night-mode" : ""}`}>
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
              <Link className={item.view === section ? "active" : ""} href={item.href} key={item.label}>
                <Icon size={19} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="kanka-sidebar-bottom">
          <button className={`dark-mode-card${isNightMode ? " active" : ""}`} type="button" onClick={() => setIsNightMode((current) => !current)}>
            <span>
              <Moon size={18} />
              Gece Operasyonu
            </span>
            <i />
          </button>
          <div className="sidebar-user-card">
            <span className="avatar">KD</span>
            <div>
              <strong>BY Project</strong>
              <small>Operasyon paneli</small>
              <em>Canlı sistem</em>
            </div>
            <ChevronDown size={17} />
          </div>
        </div>
      </aside>

      <section className="kanka-main">
        <header className="kanka-topbar">
          <button className="icon-button" type="button" aria-label="Menü" onClick={() => setIsSidebarCompact((current) => !current)}>
            <Menu size={22} />
          </button>
          <label className="admin-search">
            <input placeholder="Sipariş, masa veya ürün ara..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <Search size={20} />
          </label>
          <Link className="notification-button" href="/admin/bildirimler" aria-label="Bildirimler">
            <Bell size={20} />
            <span>{newOrders.length + readyOrders.length}</span>
          </Link>
          <div className="topbar-user">
            <span className="avatar image">KD</span>
            <div>
              <strong>Yönetim Paneli</strong>
              <small>Gerçek veriler</small>
            </div>
            <ChevronDown size={18} />
          </div>
        </header>

        <div className="kanka-content">
          <section className="admin-welcome">
            <div>
              <h1>{copy.title}</h1>
              <p>{copy.text}</p>
            </div>
            <button className="date-filter" type="button" onClick={loadOrders}>
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

          {showOverview ? (
            <>
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
                    <button type="button" onClick={loadOrders}>
                      Bugün
                      <ChevronDown size={15} />
                    </button>
                  </div>
                  <div className="chart-legend">
                    <span className="current">Sipariş</span>
                  </div>
                  <div className="line-chart ops-chart">
                    <span>24</span>
                    <span>18</span>
                    <span>12</span>
                    <span>6</span>
                    <span>3</span>
                    <span>0</span>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      <polyline className="chart-line-muted" points={toChartPoints(emptyChartValues)} />
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
                    <button type="button" onClick={loadOrders}>
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
            </>
          ) : null}

          {showOrders || showNotifications ? (
            <section className={splitGridClass}>
              {showOrders ? (
                <article className="kanka-panel">
                  <div className="panel-head compact-head">
                    <h2>{query ? "Arama Sonuçları" : "Canlı Siparişler"}</h2>
                    <Link href="/kasa">Kasaya Git</Link>
                  </div>
                  <div className="recent-orders">
                    {filteredOrders.length === 0 ? (
                      <p className="empty-state">{query ? "Aramana uygun sipariş bulunamadı." : "Henüz sipariş yok."}</p>
                    ) : (
                      filteredOrders.slice(0, showOverview ? 5 : 12).map((order) => (
                        <Link className="recent-order-row" href={`/takip/${order.orderNo}`} key={order.orderNo}>
                          <strong>#{order.orderNo}</strong>
                          <span>{formatTime(order.createdAt)}</span>
                          <i className="avatar mini">M{order.tableNo}</i>
                          <div>
                            <b>Masa {order.tableNo}</b>
                            <small>{itemSummary(order)}</small>
                          </div>
                          <em>{currency.format(order.total)}</em>
                          <mark className={order.status}>{statusMeta[order.status].label}</mark>
                        </Link>
                      ))
                    )}
                  </div>
                </article>
              ) : null}

              {showNotifications ? (
                <article className="kanka-panel">
                  <div className="panel-head compact-head">
                    <h2>Operasyon Bildirimleri</h2>
                    <div>
                      <button type="button" onClick={loadOrders}>Canlı</button>
                      <MoreVertical size={18} />
                    </div>
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <p className="empty-state">Şu an operasyon bildirimi yok.</p>
                    ) : (
                      notifications.map((notification) => {
                        const Icon = notification.icon;

                        return (
                          <Link href={notification.href} key={notification.title}>
                            <span className={notification.tone}>
                              <Icon size={18} />
                            </span>
                            <div>
                              <strong>{notification.title}</strong>
                              <small>{notification.text}</small>
                            </div>
                            <em>{notification.time}</em>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </article>
              ) : null}
            </section>
          ) : null}

          {showTables || showMenu || showSettings ? (
            <section className={opsGridClass}>
              {showTables ? (
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
              ) : null}

              {showMenu ? (
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
              ) : null}

              {showSettings ? (
                <article className="kanka-panel">
                  <div className="panel-head compact-head">
                    <h2>İşletme Ayarları</h2>
                    <button type="button" onClick={loadOrders}>Kaydet</button>
                  </div>
                  <div className="menu-health-list settings-summary-list">
                    <div>
                      <span><Store size={17} /></span>
                      <div>
                        <strong>İşletme adı</strong>
                        <small>BY Project</small>
                      </div>
                      <em>aktif</em>
                    </div>
                    <div>
                      <span><QrCode size={17} /></span>
                      <div>
                        <strong>QR masa sayısı</strong>
                        <small>{tables.length} masa sipariş linkine bağlı</small>
                      </div>
                      <em>{tables.length}</em>
                    </div>
                    <div>
                      <span><Bell size={17} /></span>
                      <div>
                        <strong>Bildirim kanalı</strong>
                        <small>SMS yerine ekran ve tarayıcı tabanlı akış</small>
                      </div>
                      <em>0 SMS</em>
                    </div>
                    <div>
                      <span><CreditCard size={17} /></span>
                      <div>
                        <strong>Servis ücreti</strong>
                        <small>Self servis akışı için kapalı</small>
                      </div>
                      <em>%0</em>
                    </div>
                  </div>
                </article>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
