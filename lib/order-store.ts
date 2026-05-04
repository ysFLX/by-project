import { menu } from "@/lib/catalog-data";
import type { CreateOrderInput, Order, OrderItem, OrderStatus } from "@/lib/types";

type StoreGlobal = typeof globalThis & {
  __byProjectOrders?: Order[];
  __byProjectNextOrder?: number;
};

const store = globalThis as StoreGlobal;


if (!store.__byProjectOrders) {
  store.__byProjectOrders = [];
}

if (!store.__byProjectNextOrder) {
  store.__byProjectNextOrder = 1;
}

function getMutableOrders() {
  return store.__byProjectOrders ?? [];
}

export function listOrders() {
  return [...getMutableOrders()].sort((first, second) => {
    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
  });
}

export function getOrder(orderNo: string) {
  return getMutableOrders().find((order) => order.orderNo.toLowerCase() === orderNo.toLowerCase()) ?? null;
}

export function createOrder(input: CreateOrderInput) {
  const lines: OrderItem[] = input.items.map((item) => {
    const product = menu.find((entry) => entry.id === item.productId && entry.active);

    if (!product) {
      throw new Error(`Ürün bulunamadı: ${item.productId}`);
    }

    const quantity = Number.isFinite(item.quantity) ? Math.max(1, Math.floor(item.quantity)) : 1;

    return {
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity,
      options: item.options ?? [],
      note: item.note?.trim() || undefined
    };
  });

  if (lines.length === 0) {
    throw new Error("Sipariş için en az bir ürün gerekli.");
  }

  const subtotal = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const now = new Date().toISOString();
  const nextOrder = store.__byProjectNextOrder ?? 1;
  store.__byProjectNextOrder = nextOrder + 1;

  const order: Order = {
    orderNo: `A${nextOrder}`,
    tableNo: input.tableNo,
    items: lines,
    note: input.note?.trim() || undefined,
    status: "new",
    subtotal,
    serviceFee: 0,
    total: subtotal,
    estimatedMinutes: Math.min(25, Math.max(8, lines.reduce((sum, item) => sum + item.quantity, 0) * 3 + 7)),
    createdAt: now,
    updatedAt: now
  };

  getMutableOrders().unshift(order);
  return order;
}

export function updateOrderStatus(orderNo: string, status: OrderStatus) {
  const order = getOrder(orderNo);

  if (!order) {
    return null;
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  return order;
}
