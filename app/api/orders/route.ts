import { NextResponse } from "next/server";
import { createOrder, listOrders } from "@/lib/order-repository";
import type { CreateOrderInput, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const statuses: OrderStatus[] = ["new", "preparing", "ready", "delivered"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as OrderStatus | null;
  const tableNo = url.searchParams.get("tableNo");

  let orders = await listOrders();

  if (status && statuses.includes(status)) {
    orders = orders.filter((order) => order.status === status);
  }

  if (tableNo) {
    orders = orders.filter((order) => order.tableNo === tableNo);
  }

  return NextResponse.json(
    { orders },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CreateOrderInput;

    if (!input.tableNo?.trim()) {
      return NextResponse.json({ message: "Masa numarası gerekli." }, { status: 400 });
    }

    const order = await createOrder(input);
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Sipariş oluşturulamadı." },
      { status: 400 }
    );
  }
}
