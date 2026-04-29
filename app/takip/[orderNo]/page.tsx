import { OrderTracker } from "@/components/order-tracker";

type PageProps = {
  params: Promise<{ orderNo: string }>;
};

export default async function TrackingPage({ params }: PageProps) {
  const { orderNo } = await params;

  return <OrderTracker orderNo={orderNo} />;
}
