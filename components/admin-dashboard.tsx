"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
    <main className="admin-shell">
      <aside className="staff-nav">
        <Link href="/">BY</Link>
        <Link href="/kasa">Kasa</Link>
        <Link href="/mutfak">Mutfak</Link>
        <Link href="/ekran">Ekran</Link>
        <Link className="active" href="/admin">
          Admin
        </Link>
      </aside>

      <section className="admin-content">
        <div className="staff-heading">
          <div>
            <span className="eyebrow">Yönetici paneli</span>
            <h1>Dashboard</h1>
          </div>
          <Link className="button secondary compact" href="/masa/7">
            Müşteri örneği
          </Link>
        </div>

        <div className="metric-grid">
          <article>
            <span>Toplam sipariş</span>
            <strong>{orders.length}</strong>
          </article>
          <article>
            <span>Bugünkü ciro</span>
            <strong>{currency.format(revenue)}</strong>
          </article>
          <article>
            <span>Ortalama süre</span>
            <strong>{averageMinutes} dk</strong>
          </article>
          <article>
            <span>Aktif sipariş</span>
            <strong>{activeOrders}</strong>
          </article>
        </div>

        <div className="admin-grid">
          <section className="admin-section">
            <div className="section-head">
              <h2>Menü yönetimi</h2>
              <button className="button compact" type="button">
                Yeni ürün
              </button>
            </div>
            <div className="admin-list">
              {menu.slice(0, 6).map((product) => (
                <article key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.description}</small>
                  </div>
                  <span>{product.category}</span>
                  <b>{currency.format(product.price)}</b>
                  <em>Aktif</em>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-section">
            <div className="section-head">
              <h2>Masa / QR yönetimi</h2>
              <button className="button compact" type="button">
                Yeni masa
              </button>
            </div>
            <div className="admin-list">
              {tables.map((table) => (
                <article key={table.id}>
                  <div>
                    <strong>{table.label}</strong>
                    <small>{table.seats}</small>
                  </div>
                  <span className="qr-mini" aria-hidden="true" />
                  <Link href={`/masa/${table.id}`}>QR linki</Link>
                  <em>{table.active ? "Aktif" : "Pasif"}</em>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="admin-section settings-section">
          <div className="section-head">
            <h2>Ayarlar</h2>
            <button className="button compact primary" type="button">
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
        </section>
      </section>
    </main>
  );
}
