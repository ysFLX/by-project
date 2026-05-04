import { NextResponse } from "next/server";
import { createClientCompany, listClientCompanies } from "@/lib/catering-store";
import type { CreateClientCompanyInput } from "@/lib/catering-types";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { companies: listClientCompanies() },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CreateClientCompanyInput;
    const company = createClientCompany(input);
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Şirket üyeliği oluşturulamadı." },
      { status: 400 }
    );
  }
}
