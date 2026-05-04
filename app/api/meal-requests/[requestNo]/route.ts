import { NextResponse } from "next/server";
import { updateMealRequestStatus } from "@/lib/catering-store";
import type { MealRequestStatus } from "@/lib/catering-types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ requestNo: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { requestNo } = await context.params;
  const body = (await request.json()) as { status?: MealRequestStatus };

  if (body.status !== "eaten" && body.status !== "collected") {
    return NextResponse.json({ message: "Geçerli bir durum gerekli." }, { status: 400 });
  }

  const mealRequest = updateMealRequestStatus(requestNo, body.status);

  if (!mealRequest) {
    return NextResponse.json({ message: "Yemek talebi bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ request: mealRequest });
}
