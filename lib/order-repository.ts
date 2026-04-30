import { Prisma, type Order as DbOrder, type OrderItem as DbOrderItem } from "@prisma/client";
import { menu } from "@/lib/mock-data";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import * as memoryStore from "@/lib/order-store";
import type { CreateOrderInput, Order, OrderItem, OrderStatus } from "@/lib/types";

type DbOrderWithItems = DbOrder & {
  items: DbOrderItem[];
};

const fallbackToMemory = !hasDatabaseUrl();

function toAppOrder(order: DbOrderWithItems): Order {
  return {
    orderNo: order.orderNo,
    tableNo: order.tableNo,
    status: order.status as OrderStatus,
    note: order.note ?? undefined,
    subtotal: order.subtotal,
    serviceFee: order.serviceFee,
    total: order.total,
    estimatedMinutes: order.estimatedMinutes,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      price: item.price,
      quantity: item.quantity,
      options: item.options,
      note: item.note ?? undefined
    }))
  };
}

function buildOrderLines(input: CreateOrderInput): OrderItem[] {
  return input.items.map((item) => {
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
}

export async function listOrders() {
  if (fallbackToMemory) {
    return memoryStore.listOrders();
  }

  const prisma = getPrisma();
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" }
  });

  return orders.map(toAppOrder);
}

export async function getOrder(orderNo: string) {
  if (fallbackToMemory) {
    return memoryStore.getOrder(orderNo);
  }

  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { items: true }
  });

  return order ? toAppOrder(order) : null;
}

export async function createOrder(input: CreateOrderInput) {
  if (fallbackToMemory) {
    return memoryStore.createOrder(input);
  }

  const lines = buildOrderLines(input);

  if (lines.length === 0) {
    throw new Error("Sipariş için en az bir ürün gerekli.");
  }

  const prisma = getPrisma();
  const subtotal = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const estimatedMinutes = Math.min(25, Math.max(8, lines.reduce((sum, item) => sum + item.quantity, 0) * 3 + 7));

  const order = await prisma.$transaction(async (tx) => {
    const counter = await tx.orderCounter.upsert({
      where: { key: "order" },
      create: { key: "order", nextValue: 46 },
      update: { nextValue: { increment: 1 } }
    });

    return tx.order.create({
      data: {
        orderNo: `A${counter.nextValue - 1}`,
        tableNo: input.tableNo,
        note: input.note?.trim() || undefined,
        status: "new",
        subtotal,
        serviceFee: 0,
        total: subtotal,
        estimatedMinutes,
        items: {
          create: lines.map((line) => ({
            productId: line.productId,
            productName: line.productName,
            price: line.price,
            quantity: line.quantity,
            options: line.options,
            note: line.note
          }))
        }
      },
      include: { items: true }
    });
  });

  return toAppOrder(order);
}

export async function updateOrderStatus(orderNo: string, status: OrderStatus) {
  if (fallbackToMemory) {
    return memoryStore.updateOrderStatus(orderNo, status);
  }

  try {
    const prisma = getPrisma();
    const order = await prisma.order.update({
      where: { orderNo },
      data: { status },
      include: { items: true }
    });

    return toAppOrder(order);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }

    throw error;
  }
}
