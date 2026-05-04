"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { BellRing, Check, CheckCircle2, Clock3, Home, PackageCheck, ReceiptText } from "lucide-react";
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

const steps: Array<{ status: OrderStatus; label: string; icon: ComponentType<{ size?: number }> }> = [
  { status: "new", label: "Sipariş alındı", icon: ReceiptText },
  { status: "preparing", label: "Hazırlanıyor", icon: Clock3 },
  { status: "ready", label: "Hazır", icon: CheckCircle2 },
  { status: "delivered", label: "Teslim edildi", icon: PackageCheck }
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
      return "Teslim edildi";
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
    <main className={isReady ? "tracking-shell-pro ready" : "tracking-shell-pro"}>
      <section className="tracking-device">
        <div className="tracking-top">
          <span>BY Project</span>
          <strong>Masa {order?.tableNo ?? "-"}</strong>
        </div>

        <div className="tracking-status-card">
          <span className={isReady ? "ready-icon" : "pending-icon"}>
            {isReady ? <Check size={42} /> : <Clock3 size={42} />}
          </span>
          <h1>{title}</h1>
          <div className="order-number">#{order?.orderNo ?? orderNo}</div>
          {order ? (
            <p>
              Tahmini hazırlanma süresi <strong>{order.estimatedMinutes} dk</strong>
            </p>
          ) : null}
        </div>

        <div className="timeline-pro">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div className={index <= activeIndex ? "done" : ""} key={step.status}>
                <span>
                  <Icon size={17} />
                </span>
                <p>{step.label}</p>
              </div>
            );
          })}
        </div>

        <div className={isReady ? "ready-message" : "notice-box"}>
          <strong>{isReady ? "Siparişinizi kasadan teslim alabilirsiniz." : "Durum otomatik güncellenir."}</strong>
          <span>
            {isReady
              ? "Hazır sipariş ekranında numaranızı gördüğünüzde teslim alabilirsiniz."
              : "Bu sayfa açık kaldığında sipariş durumunu canlı takip edebilirsiniz."}
          </span>
        </div>

        {notificationPermission !== "granted" ? (
          <button className="button button-secondary wide" onClick={requestNotifications} type="button">
            <BellRing size={18} />
            Tarayıcı bildirimi aç
          </button>
        ) : (
          <p className="success-text">Tarayıcı bildirimi açık.</p>
        )}

        {error ? <p className="form-error">{error}</p> : null}
        <Link className="button button-primary wide" href={order ? `/masa/${order.tableNo}` : "/"}>
          <Home size={18} />
          Ana sayfaya dön
        </Link>
      </section>
    </main>
  );
}
