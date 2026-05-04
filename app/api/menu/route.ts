import { NextResponse } from "next/server";
import { categories, menu } from "@/lib/catalog-data";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { categories, menu },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
