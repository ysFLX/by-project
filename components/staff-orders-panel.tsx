"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Order, OrderStatus } from "@/lib/types";

type Props = {
  mode: "cashier" | "kitchen" | "display";
};

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0
});

const statusLabels: Record<OrderStatus, string> = {
  new: "Yeni",
  preparing: "Hazırlanıyor",
  ready: "Hazır",
  delivered: "Teslim edildi"
};

const pageTitles: Record<Props["mode"], string> = {
  cashier: "Kasa Sipariş Paneli",
  kitchen: "Mutfak Ekranı",
  display: "Hazır Sipariş Ekranı"
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function StaffOrdersPanel({ mode }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isUpdating, setIsUpdating] = useState("");

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

  async function updateStatus(orderNo: string, status: OrderStatus) {
    setIsUpdating(orderNo);
    await fetch(`/api/orders/${orderNo}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await loadOrders();
    setIsUpdating("");
  }

  const activeOrders = useMemo(() => orders.filter((order) => order.status !== "delivered"), [orders]);
  const readyOrders = activeOrders.filter((order) => order.status === "ready");
  const preparingOrders = activeOrders.filter((order) => order.status === "preparing" || order.status === "new");

  if (mode === "display") {
    return (
      <main className="display-shell">
        <section className="display-board">
          <div>
            <h1>Hazır Siparişler</h1>
            <div className="display-numbers ready-list">
              {readyOrders.length > 0 ? readyOrders.map((order) => <span key={order.orderNo}>#{order.orderNo}</span>) : <small>Bekleniyor</small>}
            </div>
          </div>
          <div>
            <h1>Hazırlanıyor</h1>
            <div className="display-numbers preparing-list">
              {preparingOrders.length > 0 ? preparingOrders.map((order) => <span key={order.orderNo}>#{order.orderNo}</span>) : <small>Bekleniyor</small>}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="staff-shell">
      <aside className="staff-nav">
        <Link href="/">BY</Link>
        <Link className={mode === "cashier" ? "active" : ""} href="/kasa">
          Kasa
        </Link>
        <Link className={mode === "kitchen" ? "active" : ""} href="/mutfak">
          Mutfak
        </Link>
        <Link href="/ekran">Ekran</Link>
        <Link href="/admin">Admin</Link>
      </aside>

      <section className="staff-content">
        <div className="staff-heading">
          <div>
            <span className="eyebrow">İşletme tarafı</span>
            <h1>{pageTitles[mode]}</h1>
          </div>
          <span className="live-pill">Canlı yenileniyor</span>
        </div>

        {mode === "cashier" ? (
          <div className="table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Sipariş No</th>
                  <th>Masa</th>
                  <th>Ürünler</th>
                  <th>Saat</th>
                  <th>Toplam</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.orderNo}>
                    <td>#{order.orderNo}</td>
                    <td>{order.tableNo}</td>
                    <td>{order.items.map((item) => `${item.productName} x${item.quantity}`).join(", ")}</td>
                    <td>{formatTime(order.createdAt)}</td>
                    <td>{currency.format(order.total)}</td>
                    <td>
                      <span className={`status status-${order.status}`}>{statusLabels[order.status]}</span>
                    </td>
                    <td>
                      <OrderActions isUpdating={isUpdating === order.orderNo} order={order} onUpdate={updateStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="kitchen-grid">
            {preparingOrders.map((order) => (
              <article className="kitchen-card" key={order.orderNo}>
                <div className="kitchen-card-top">
                  <strong>#{order.orderNo}</strong>
                  <span>{formatTime(order.createdAt)}</span>
                </div>
                <p>Masa {order.tableNo}</p>
                <ul>
                  {order.items.map((item) => (
                    <li key={`${order.orderNo}-${item.productId}`}>
                      <strong>
                        {item.productName} x{item.quantity}
                      </strong>
                      <span>{item.options.join(", ") || "Standart"}</span>
                    </li>
                  ))}
                </ul>
                {order.note ? <small>Not: {order.note}</small> : null}
                <button
                  className="button success wide"
                  disabled={isUpdating === order.orderNo}
                  onClick={() => updateStatus(order.orderNo, "ready")}
                  type="button"
                >
                  Hazır
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function OrderActions({
  order,
  isUpdating,
  onUpdate
}: {
  order: Order;
  isUpdating: boolean;
  onUpdate: (orderNo: string, status: OrderStatus) => void;
}) {
  if (order.status === "new") {
    return (
      <button className="button compact" disabled={isUpdating} onClick={() => onUpdate(order.orderNo, "preparing")} type="button">
        Kabul et
      </button>
    );
  }

  if (order.status === "preparing") {
    return (
      <button className="button compact success" disabled={isUpdating} onClick={() => onUpdate(order.orderNo, "ready")} type="button">
        Hazır
      </button>
    );
  }

  if (order.status === "ready") {
    return (
      <button className="button compact secondary" disabled={isUpdating} onClick={() => onUpdate(order.orderNo, "delivered")} type="button">
        Teslim edildi
      </button>
    );
  }

  return <span className="muted-text">Kapandı</span>;
}
