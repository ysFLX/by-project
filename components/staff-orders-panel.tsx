"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  BellRing,
  CheckCircle2,
  ChefHat,
  Clock3,
  CreditCard,
  LayoutDashboard,
  Monitor,
  PackageCheck,
  ReceiptText,
  Settings2,
  Timer,
  Utensils
} from "lucide-react";
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

const pageMeta: Record<Props["mode"], { title: string; eyebrow: string; description: string }> = {
  cashier: {
    title: "Kasa Sipariş Paneli",
    eyebrow: "Ön operasyon",
    description: "Sipariş kabulü, ödeme takibi ve teslim işlemleri için canlı kontrol ekranı."
  },
  kitchen: {
    title: "Mutfak Akış Ekranı",
    eyebrow: "Hazırlık kuyruğu",
    description: "Ürün detaylarını, masa bilgisini ve özel notları tek kartta takip edin."
  },
  display: {
    title: "Hazır Sipariş Ekranı",
    eyebrow: "Müşteri görünümü",
    description: "Hazır ve hazırlanmakta olan sipariş numaraları."
  }
};

const navItems = [
  { href: "/kasa", label: "Kasa", icon: ReceiptText, mode: "cashier" },
  { href: "/mutfak", label: "Mutfak", icon: ChefHat, mode: "kitchen" },
  { href: "/ekran", label: "Ekran", icon: Monitor, mode: "display" },
  { href: "/admin", label: "Admin", icon: Settings2 }
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function itemSummary(order: Order) {
  return order.items.map((item) => `${item.productName} x${item.quantity}`).join(", ");
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
  const newOrders = activeOrders.filter((order) => order.status === "new");
  const preparingOnlyOrders = activeOrders.filter((order) => order.status === "preparing");
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);

  if (mode === "display") {
    return (
      <main className="display-shell-pro">
        <section className="display-frame">
          <div className="display-header">
            <div>
              <span>Kahve Durağı</span>
              <h1>Sipariş Takip</h1>
            </div>
            <span className="display-live">Canlı</span>
          </div>
          <div className="display-columns">
            <div className="display-column ready">
              <span>Hazır</span>
              <div className="display-numbers">
                {readyOrders.length > 0 ? (
                  readyOrders.map((order) => <strong key={order.orderNo}>#{order.orderNo}</strong>)
                ) : (
                  <small>Bekleniyor</small>
                )}
              </div>
            </div>
            <div className="display-column preparing">
              <span>Hazırlanıyor</span>
              <div className="display-numbers">
                {preparingOrders.length > 0 ? (
                  preparingOrders.map((order) => <strong key={order.orderNo}>#{order.orderNo}</strong>)
                ) : (
                  <small>Bekleniyor</small>
                )}
              </div>
            </div>
          </div>
          <p>Sipariş numaranız hazır bölümünde göründüğünde kasadan teslim alabilirsiniz.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="staff-shell-pro">
      <aside className="staff-sidebar">
        <Link className="sidebar-brand" href="/">
          BY
        </Link>
        <nav aria-label="İşletme ekranları">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.mode === mode;

            return (
              <Link className={isActive ? "active" : ""} href={item.href} key={item.href}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="staff-content-pro">
        <div className="staff-header-pro">
          <div>
            <span className="eyebrow">
              <LayoutDashboard size={14} />
              {pageMeta[mode].eyebrow}
            </span>
            <h1>{pageMeta[mode].title}</h1>
            <p>{pageMeta[mode].description}</p>
          </div>
          <span className="live-pill">
            <BellRing size={15} />
            Canlı yenileniyor
          </span>
        </div>

        <div className="ops-metric-grid">
          <MetricCard icon={ReceiptText} label="Aktif sipariş" value={activeOrders.length.toString()} tone="teal" />
          <MetricCard icon={Clock3} label="Yeni" value={newOrders.length.toString()} tone="blue" />
          <MetricCard icon={Timer} label="Hazırlanıyor" value={preparingOnlyOrders.length.toString()} tone="amber" />
          <MetricCard icon={PackageCheck} label="Hazır" value={readyOrders.length.toString()} tone="green" />
        </div>

        {mode === "cashier" ? (
          <section className="orders-panel">
            <div className="panel-title-row">
              <div>
                <span className="mini-label">Bugünkü ciro</span>
                <strong>{currency.format(revenue)}</strong>
              </div>
              <span>{orders.length} sipariş</span>
            </div>
            <div className="cashier-list">
              {orders.map((order) => (
                <article className="cashier-order" key={order.orderNo}>
                  <div className="order-main-cell">
                    <span className="order-number-badge">#{order.orderNo}</span>
                    <div>
                      <strong>Masa {order.tableNo}</strong>
                      <small>{itemSummary(order)}</small>
                    </div>
                  </div>
                  <div className="order-meta-cell">
                    <Clock3 size={15} />
                    {formatTime(order.createdAt)}
                  </div>
                  <div className="order-total-cell">{currency.format(order.total)}</div>
                  <span className={`status status-${order.status}`}>{statusLabels[order.status]}</span>
                  <OrderActions isUpdating={isUpdating === order.orderNo} order={order} onUpdate={updateStatus} />
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="kitchen-board">
            {preparingOrders.length === 0 ? (
              <div className="empty-state kitchen-empty">Hazırlanacak sipariş yok.</div>
            ) : (
              preparingOrders.map((order) => (
                <article className={`kitchen-ticket status-${order.status}`} key={order.orderNo}>
                  <div className="ticket-top">
                    <div>
                      <span>#{order.orderNo}</span>
                      <strong>Masa {order.tableNo}</strong>
                    </div>
                    <em>{formatTime(order.createdAt)}</em>
                  </div>
                  <div className="ticket-items">
                    {order.items.map((item) => (
                      <div key={`${order.orderNo}-${item.productId}`}>
                        <span>
                          {item.quantity}x
                        </span>
                        <div>
                          <strong>{item.productName}</strong>
                          <small>{item.options.join(", ") || "Standart"}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                  {order.note ? <p>Not: {order.note}</p> : null}
                  <button
                    className="button button-success wide"
                    disabled={isUpdating === order.orderNo}
                    onClick={() => updateStatus(order.orderNo, "ready")}
                    type="button"
                  >
                    <CheckCircle2 size={18} />
                    Hazır
                  </button>
                </article>
              ))
            )}
          </section>
        )}
      </section>
    </main>
  );
}

function MetricCard({
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
      <button
        className="button button-primary compact"
        disabled={isUpdating}
        onClick={() => onUpdate(order.orderNo, "preparing")}
        type="button"
      >
        <CreditCard size={15} />
        Kabul et
      </button>
    );
  }

  if (order.status === "preparing") {
    return (
      <button
        className="button button-success compact"
        disabled={isUpdating}
        onClick={() => onUpdate(order.orderNo, "ready")}
        type="button"
      >
        <Utensils size={15} />
        Hazır
      </button>
    );
  }

  if (order.status === "ready") {
    return (
      <button
        className="button button-secondary compact"
        disabled={isUpdating}
        onClick={() => onUpdate(order.orderNo, "delivered")}
        type="button"
      >
        <PackageCheck size={15} />
        Teslim
      </button>
    );
  }

  return <span className="muted-text">Kapandı</span>;
}
