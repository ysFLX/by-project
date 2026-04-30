import { NextResponse } from "next/server";
import { getOrder, updateOrderStatus } from "@/lib/order-repository";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const statuses: OrderStatus[] = ["new", "preparing", "ready", "delivered"];

type RouteContext = {
  params: Promise<{ orderNo: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { orderNo } = await context.params;
  const order = await getOrder(orderNo);

  if (!order) {
    return NextResponse.json({ message: "Sipariş bulunamadı." }, { status: 404 });
  }

  return NextResponse.json(
    { order },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const { orderNo } = await context.params;
  const body = (await request.json()) as { status?: OrderStatus };

  if (!body.status || !statuses.includes(body.status)) {
    return NextResponse.json({ message: "Geçerli bir durum gönderilmedi." }, { status: 400 });
  }

  const order = await updateOrderStatus(orderNo, body.status);

  if (!order) {
    return NextResponse.json({ message: "Sipariş bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ order });
}
