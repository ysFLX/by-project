import { NextResponse } from "next/server";
import { listMealRequests, submitMealRequest, todayKey } from "@/lib/catering-store";
import type { SubmitMealRequestInput } from "@/lib/catering-types";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const companyCode = url.searchParams.get("companyCode") ?? undefined;
  const serviceDate = url.searchParams.get("serviceDate") ?? todayKey();

  return NextResponse.json(
    { requests: listMealRequests({ companyCode, serviceDate }) },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as SubmitMealRequestInput;
    const mealRequest = submitMealRequest(input);
    return NextResponse.json({ request: mealRequest }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Yemek talebi gönderilemedi." },
      { status: 400 }
    );
  }
}
