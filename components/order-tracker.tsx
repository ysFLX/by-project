"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Order, OrderStatus } from "@/lib/types";

type Props = {
  orderNo: string;
};

const statusIndex: Record<OrderStatus, number> = {
  new: 0,
  preparing: 1,
  ready: 2,
  delivered: 3
};

const steps: Array<{ status: OrderStatus; label: string }> = [
  { status: "new", label: "Sipariş alındı" },
  { status: "preparing", label: "Hazırlanıyor" },
  { status: "ready", label: "Hazır" },
  { status: "delivered", label: "Teslim edildi" }
];

export function OrderTracker({ orderNo }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported"
  );
  const hasNotifiedReady = useRef(false);

  const activeIndex = order ? statusIndex[order.status] : 0;
  const isReady = order?.status === "ready" || order?.status === "delivered";

  const title = useMemo(() => {
    if (!order) {
      return "Sipariş aranıyor";
    }

    if (order.status === "ready") {
      return "Siparişiniz hazır";
    }

    if (order.status === "delivered") {
      return "Afiyet olsun";
    }

    return "Siparişiniz alındı";
  }, [order]);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      const response = await fetch(`/api/orders/${orderNo}`, { cache: "no-store" });
      const payload = await response.json();

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setError(payload.message ?? "Sipariş bulunamadı.");
        return;
      }

      setOrder(payload.order);
      setError("");
    }

    loadOrder();
    const interval = window.setInterval(loadOrder, 2500);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [orderNo]);

  useEffect(() => {
    if (order?.status !== "ready" || hasNotifiedReady.current) {
      return;
    }

    hasNotifiedReady.current = true;

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`Siparişiniz hazır: #${order.orderNo}`, {
        body: "Siparişinizi kasadan teslim alabilirsiniz."
      });
    }
  }, [order]);

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  return (
    <main className={isReady ? "tracking-shell ready" : "tracking-shell"}>
      <section className="tracking-card">
        <span className="eyebrow">Sipariş takibi</span>
        <h1>{title}</h1>
        <div className="order-number">#{order?.orderNo ?? orderNo}</div>
        {order ? (
          <p>
            Masa {order.tableNo} için tahmini hazırlanma süresi: <strong>{order.estimatedMinutes} dk</strong>
          </p>
        ) : null}

        <div className="timeline">
          {steps.map((step, index) => (
            <div className={index <= activeIndex ? "timeline-row done" : "timeline-row"} key={step.status}>
              <span>{index <= activeIndex ? "✓" : "+"}</span>
              <p>{step.label}</p>
            </div>
          ))}
        </div>

        {isReady ? (
          <div className="ready-message">
            <strong>Siparişinizi kasadan teslim alabilirsiniz.</strong>
            <span>Numaranız hazır sipariş ekranında göründüğünde teslim alabilirsiniz.</span>
          </div>
        ) : (
          <div className="notice-box">
            <strong>Durum otomatik güncellenir.</strong>
            <span>İzin verirseniz sipariş hazır olduğunda tarayıcı bildirimi gönderilir.</span>
          </div>
        )}

        {notificationPermission !== "granted" ? (
          <button className="button secondary wide" onClick={requestNotifications} type="button">
            Tarayıcı bildirimi aç
          </button>
        ) : (
          <p className="success-text">Tarayıcı bildirimi açık.</p>
        )}

        {error ? <p className="form-error">{error}</p> : null}
        <Link className="button primary wide" href={order ? `/masa/${order.tableNo}` : "/"}>
          Ana sayfaya dön
        </Link>
      </section>
    </main>
  );
}
