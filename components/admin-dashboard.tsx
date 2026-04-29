"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  BarChart3,
  Clock3,
  ExternalLink,
  LayoutDashboard,
  MenuSquare,
  Monitor,
  Plus,
  QrCode,
  ReceiptText,
  Settings2,
  Store,
  Table2,
  TrendingUp
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
  { href: "/kasa", label: "Kasa", icon: ReceiptText },
  { href: "/mutfak", label: "Mutfak", icon: Store },
  { href: "/ekran", label: "Ekran", icon: Monitor },
  { href: "/admin", label: "Admin", icon: Settings2 }
];

const chartBars = [34, 42, 51, 58, 67, 61, 78, 72, 86, 64, 74, 70];

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

  const activeOrders = orders.filter((order) => order.status !== "delivered").length;
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const averageMinutes = useMemo(() => {
    if (orders.length === 0) {
      return 0;
    }

    return Math.round(orders.reduce((sum, order) => sum + order.estimatedMinutes, 0) / orders.length);
  }, [orders]);

  return (
    <main className="staff-shell-pro admin-layout">
      <aside className="staff-sidebar">
        <Link className="sidebar-brand" href="/">
          BY
        </Link>
        <nav aria-label="Yönetim ekranları">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link className={item.href === "/admin" ? "active" : ""} href={item.href} key={item.href}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="admin-content-pro">
        <div className="staff-header-pro">
          <div>
            <span className="eyebrow">
              <LayoutDashboard size={14} />
              Yönetici paneli
            </span>
            <h1>İşletme Dashboard</h1>
            <p>Menü, masa bağlantıları ve operasyon sağlığı için merkezi yönetim ekranı.</p>
          </div>
          <Link className="button button-secondary compact" href="/masa/7">
            <ExternalLink size={15} />
            Müşteri örneği
          </Link>
        </div>

        <div className="ops-metric-grid admin-metrics">
          <Metric icon={ReceiptText} label="Toplam sipariş" value={orders.length.toString()} tone="teal" />
          <Metric icon={TrendingUp} label="Bugünkü ciro" value={currency.format(revenue)} tone="green" />
          <Metric icon={Clock3} label="Ortalama süre" value={`${averageMinutes} dk`} tone="amber" />
          <Metric icon={BarChart3} label="Aktif sipariş" value={activeOrders.toString()} tone="blue" />
        </div>

        <section className="dashboard-grid">
          <article className="admin-card chart-card">
            <div className="section-head">
              <div>
                <span className="mini-label">Günlük performans</span>
                <h2>Ciro grafiği</h2>
              </div>
              <span className="soft-badge">Bugün</span>
            </div>
            <div className="bar-chart" aria-label="Günlük ciro grafiği">
              {chartBars.map((height, index) => (
                <span style={{ height: `${height}%` }} key={`${height}-${index}`} />
              ))}
            </div>
          </article>

          <article className="admin-card">
            <div className="section-head">
              <div>
                <span className="mini-label">Menü yönetimi</span>
                <h2>Aktif ürünler</h2>
              </div>
              <button className="button button-primary compact" type="button">
                <Plus size={15} />
                Yeni ürün
              </button>
            </div>
            <div className="admin-list rich-list">
              {menu.slice(0, 6).map((product) => (
                <article key={product.id}>
                  <span className="list-icon">
                    <MenuSquare size={17} />
                  </span>
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.description}</small>
                  </div>
                  <span>{product.category}</span>
                  <b>{currency.format(product.price)}</b>
                </article>
              ))}
            </div>
          </article>

          <article className="admin-card">
            <div className="section-head">
              <div>
                <span className="mini-label">Masa / QR yönetimi</span>
                <h2>Masa bağlantıları</h2>
              </div>
              <button className="button button-primary compact" type="button">
                <Plus size={15} />
                Yeni masa
              </button>
            </div>
            <div className="admin-list table-list">
              {tables.map((table) => (
                <article key={table.id}>
                  <span className="list-icon">
                    <Table2 size={17} />
                  </span>
                  <div>
                    <strong>{table.label}</strong>
                    <small>{table.seats}</small>
                  </div>
                  <QrCode size={19} />
                  <Link href={`/masa/${table.id}`}>Aç</Link>
                </article>
              ))}
            </div>
          </article>

          <article className="admin-card settings-card">
            <div className="section-head">
              <div>
                <span className="mini-label">İşletme ayarları</span>
                <h2>Kahve Durağı</h2>
              </div>
              <button className="button button-dark compact" type="button">
                Kaydet
              </button>
            </div>
            <div className="settings-grid">
              <label>
                İşletme adı
                <input defaultValue="Kahve Durağı" />
              </label>
              <label>
                Çalışma saatleri
                <input defaultValue="08:00 - 22:00" />
              </label>
              <label>
                Servis ücreti
                <input defaultValue="0" />
              </label>
              <label>
                Vergi oranı
                <input defaultValue="10" />
              </label>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <article className={`ops-metric tone-${tone}`}>
      <span>
        <Icon size={19} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
