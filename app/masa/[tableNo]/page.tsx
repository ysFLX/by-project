import { CustomerOrderApp } from "@/components/customer-order-app";
import { menu } from "@/lib/catalog-data";

type PageProps = {
  params: Promise<{ tableNo: string }>;
};

export default async function TableOrderPage({ params }: PageProps) {
  const { tableNo } = await params;

  return <CustomerOrderApp menu={menu} tableNo={tableNo} />;
}
