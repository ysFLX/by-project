import { CompanyMealPortal } from "@/components/company-meal-portal";

type PageProps = {
  params: Promise<{ companyCode: string }>;
};

export default async function CompanyMemberPage({ params }: PageProps) {
  const { companyCode } = await params;

  return <CompanyMealPortal companyCode={companyCode} />;
}
