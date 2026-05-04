import { NextResponse } from "next/server";
import { getCompanyByCode } from "@/lib/catering-store";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ companyCode: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { companyCode } = await context.params;
  const company = getCompanyByCode(companyCode);

  if (!company) {
    return NextResponse.json({ message: "Şirket üyeliği bulunamadı." }, { status: 404 });
  }

  return NextResponse.json(
    { company },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
