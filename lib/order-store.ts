import { menu } from "@/lib/mock-data";
import type { CreateOrderInput, Order, OrderItem, OrderStatus } from "@/lib/types";

type StoreGlobal = typeof globalThis & {
  __byProjectOrders?: Order[];
  __byProjectNextOrder?: number;
};

const store = globalThis as StoreGlobal;

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

const seedOrders: Order[] = [
  {
    orderNo: "A42",
    tableNo: "7",
    status: "ready",
    items: [
      { productId: "cappuccino", productName: "Cappuccino", price: 75, quantity: 1, options: ["Sütlü", "Şekersiz"] },
      { productId: "cheesecake", productName: "Cheesecake", price: 120, quantity: 1, options: ["Frambuaz"] },
      { productId: "sprite", productName: "Sprite", price: 40, quantity: 2, options: ["Buzlu"] }
    ],
    note: "Peçete, çatal",
    subtotal: 275,
    serviceFee: 0,
    total: 275,
    estimatedMinutes: 12,
    createdAt: minutesAgo(16),
    updatedAt: minutesAgo(1)
  },
  {
    orderNo: "A43",
    tableNo: "3",
    status: "preparing",
    items: [
      { productId: "burger", productName: "Hamburger", price: 180, quantity: 1, options: ["Orta pişmiş"] },
      { productId: "fries", productName: "Patates Kızartması", price: 85, quantity: 1, options: ["Mayonezsiz"] },
      { productId: "water", productName: "Su", price: 20, quantity: 1, options: ["Soğuk"] }
    ],
    subtotal: 285,
    serviceFee: 0,
    total: 285,
    estimatedMinutes: 15,
    createdAt: minutesAgo(10),
    updatedAt: minutesAgo(4)
  },
  {
    orderNo: "A44",
    tableNo: "5",
    status: "new",
    items: [
      { productId: "latte", productName: "Latte", price: 75, quantity: 1, options: ["Sütlü"] },
      { productId: "tiramisu", productName: "Tiramisu", price: 115, quantity: 1, options: ["Klasik"] }
    ],
    subtotal: 190,
    serviceFee: 0,
    total: 190,
    estimatedMinutes: 10,
    createdAt: minutesAgo(3),
    updatedAt: minutesAgo(3)
  }
];

if (!store.__byProjectOrders) {
  store.__byProjectOrders = seedOrders;
}

if (!store.__byProjectNextOrder) {
  store.__byProjectNextOrder = 45;
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
  const nextOrder = store.__byProjectNextOrder ?? 45;
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
