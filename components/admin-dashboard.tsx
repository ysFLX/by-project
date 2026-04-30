"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  Box,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Database,
  Folder,
  HelpCircle,
  Home,
  Lock,
  Menu,
  Moon,
  MoreVertical,
  Package,
  Percent,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Users
} from "lucide-react";
import type { Order, Product, TableInfo } from "@/lib/types";

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
  { label: "Dashboard", icon: Home, active: true },
  { label: "Kullanıcılar", icon: Users },
  { label: "Roller & Yetkiler", icon: ShieldCheck },
  { label: "Ürünler", icon: Package },
  { label: "Kategoriler", icon: Folder },
  { label: "Siparişler", icon: ClipboardList },
  { label: "Ödemeler", icon: CreditCard },
  { label: "Raporlar", icon: BarChart3 },
  { label: "Kuponlar", icon: Percent },
  { label: "Bildirimler", icon: Bell },
  { label: "Ayarlar", icon: Settings },
  { label: "Site Yönetimi", icon: Database },
  { label: "Destek Talepleri", icon: HelpCircle }
];

const chartThisMonth = [260, 320, 360, 520, 610, 750, 560, 510, 620, 710, 680, 940, 980, 840, 1260, 1390, 1210, 1160, 1080];
const chartLastMonth = [210, 260, 300, 290, 410, 330, 390, 310, 370, 330, 520, 610, 540, 660, 480, 580, 620, 790, 610];

const fallbackOrders = [
  { orderNo: "SN-4152", tableNo: "Ahmet Yılmaz", total: 1250, status: "ready", createdAt: "20 Mayıs 2024, 14:35" },
  { orderNo: "SN-4151", tableNo: "Zeynep Kaya", total: 980, status: "preparing", createdAt: "20 Mayıs 2024, 13:20" },
  { orderNo: "SN-4150", tableNo: "Mehmet Demir", total: 675, status: "ready", createdAt: "20 Mayıs 2024, 12:10" },
  { orderNo: "SN-4149", tableNo: "Elif Şahin", total: 1100, status: "new", createdAt: "20 Mayıs 2024, 11:05" }
];

const notifications = [
  { icon: Lock, title: "Yeni kullanıcı kaydı", text: "Ahmet Yılmaz adlı kullanıcı sisteme kaydoldu.", time: "5 dakika önce", tone: "green" },
  { icon: ShoppingBag, title: "Yeni sipariş", text: "#SN-4152 numaralı yeni sipariş oluşturuldu.", time: "15 dakika önce", tone: "blue" },
  { icon: Box, title: "Ödeme alındı", text: "#SN-4150 numaralı siparişin ödemesi alındı.", time: "30 dakika önce", tone: "amber" },
  { icon: HelpCircle, title: "Destek talebi", text: "Yeni bir destek talebi oluşturuldu.", time: "1 saat önce", tone: "red" }
];

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

function statusLabel(status: string) {
  if (status === "ready" || status === "delivered") {
    return "Tamamlandı";
  }

  if (status === "preparing") {
    return "Beklemede";
  }

  return "İptal Edildi";
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
  }, []);

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const displayOrders = orders.length > 0 ? orders.slice(0, 4) : fallbackOrders;
  const orderCount = Math.max(orders.length, 4732);
  const displayRevenue = Math.max(revenue, 1247589);
  const readyCount = orders.filter((order) => order.status === "ready" || order.status === "delivered").length;
  const waitingCount = orders.filter((order) => order.status === "new" || order.status === "preparing").length;

  const stats = useMemo(
    () => [
      { label: "Toplam Masa", value: tables.length.toLocaleString("tr-TR"), change: "12.5%", icon: Users, tone: "purple" },
      { label: "Toplam Sipariş", value: orderCount.toLocaleString("tr-TR"), change: "8.2%", icon: ShoppingBag, tone: "blue" },
      { label: "Toplam Gelir", value: currency.format(displayRevenue), change: "15.3%", icon: CircleDollarSign, tone: "green" },
      { label: "Toplam Ürün", value: menu.length.toLocaleString("tr-TR"), change: "7.1%", icon: Box, tone: "orange" }
    ],
    [displayRevenue, menu.length, orderCount, tables.length]
  );

  const statusRows = [
    { label: "Tamamlandı", value: Math.max(readyCount, 2650), percent: 56, tone: "green" },
    { label: "Beklemede", value: Math.max(waitingCount, 1256), percent: 27, tone: "orange" },
    { label: "İptal Edildi", value: 482, percent: 10, tone: "red" },
    { label: "İade Edildi", value: 344, percent: 7, tone: "blue" }
  ];

  return (
    <main className="kanka-admin-shell">
      <aside className="kanka-sidebar">
        <div className="kanka-brand">
          <span>K</span>
          <div>
            <strong>KANKA</strong>
            <small>ADMIN PANELİ</small>
          </div>
        </div>

        <nav className="kanka-nav" aria-label="Admin menüsü">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button className={item.active ? "active" : ""} key={item.label} type="button">
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="kanka-sidebar-bottom">
          <button className="dark-mode-card" type="button">
            <span>
              <Moon size={18} />
              Koyu Mod
            </span>
            <i />
          </button>
          <div className="sidebar-user-card">
            <span className="avatar">AK</span>
            <div>
              <strong>Admin Kullanıcı</strong>
              <small>admin@kanka.com</small>
              <em>Çevrimiçi</em>
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
            <input placeholder="Arama yap..." />
            <Search size={20} />
          </label>
          <button className="notification-button" type="button" aria-label="Bildirimler">
            <Bell size={20} />
            <span>3</span>
          </button>
          <div className="topbar-user">
            <span className="avatar image">AK</span>
            <div>
              <strong>Admin Kullanıcı</strong>
              <small>Süper Admin</small>
            </div>
            <ChevronDown size={18} />
          </div>
        </header>

        <div className="kanka-content">
          <section className="admin-welcome">
            <div>
              <h1>Hoş geldin, Admin!</h1>
              <p>Panel istatistiklerini ve sistem durumunu aşağıdan inceleyebilirsin.</p>
            </div>
            <button className="date-filter" type="button">
              <CalendarDays size={17} />
              20 Mayıs 2024 - 20 Haziran 2024
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
                      {stat.change} bu ay
                    </em>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="kanka-analytics-grid">
            <article className="kanka-panel revenue-panel">
              <div className="panel-head">
                <h2>Gelir Grafiği</h2>
                <button type="button">
                  Aylık
                  <ChevronDown size={15} />
                </button>
              </div>
              <div className="chart-legend">
                <span className="current">Bu Ay</span>
                <span className="previous">Geçen Ay</span>
              </div>
              <div className="line-chart">
                <span>1.5M</span>
                <span>1.25M</span>
                <span>1M</span>
                <span>750K</span>
                <span>500K</span>
                <span>250K</span>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <polyline className="chart-line-muted" points={toChartPoints(chartLastMonth)} />
                  <polyline className="chart-line-main" points={toChartPoints(chartThisMonth)} />
                </svg>
                <div className="chart-days">
                  <small>1 May</small>
                  <small>5 May</small>
                  <small>10 May</small>
                  <small>15 May</small>
                  <small>20 May</small>
                  <small>25 May</small>
                  <small>30 May</small>
                </div>
              </div>
            </article>

            <article className="kanka-panel status-panel">
              <div className="panel-head">
                <h2>Sipariş Durumu</h2>
                <button type="button">
                  Bu Ay
                  <ChevronDown size={15} />
                </button>
              </div>
              <div className="donut-layout">
                <div className="donut-chart">
                  <div>
                    <span>Toplam</span>
                    <strong>{orderCount.toLocaleString("tr-TR")}</strong>
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
                <button type="button">Tümünü Gör</button>
              </div>
              <div className="recent-orders">
                {displayOrders.map((order, index) => (
                  <div key={`${order.orderNo}-${index}`}>
                    <strong>#{order.orderNo}</strong>
                    <span>
                      {typeof order.createdAt === "string"
                        ? order.createdAt
                        : new Intl.DateTimeFormat("tr-TR", {
                            day: "2-digit",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit"
                          }).format(new Date(order.createdAt))}
                    </span>
                    <i className="avatar mini">{order.tableNo.slice(0, 2).toUpperCase()}</i>
                    <div>
                      <b>{order.tableNo}</b>
                      <small>{String(order.tableNo).toLocaleLowerCase("tr-TR")}@mail.com</small>
                    </div>
                    <em>{currency.format(order.total)}</em>
                    <mark className={order.status}>{statusLabel(order.status)}</mark>
                  </div>
                ))}
              </div>
            </article>

            <article className="kanka-panel">
              <div className="panel-head compact-head">
                <h2>Sistem Bildirimleri</h2>
                <div>
                  <button type="button">Tümünü Gör</button>
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
        </div>
      </section>
    </main>
  );
}
