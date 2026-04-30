import { notFound } from "next/navigation";
import { AdminDashboard, type AdminView } from "@/components/admin-dashboard";
import { menu, tables } from "@/lib/mock-data";

type PageProps = {
  params: Promise<{ section: string }>;
};

const sections: Record<string, AdminView> = {
  siparisler: "orders",
  masalar: "tables",
  menu: "menu",
  bildirimler: "notifications",
  ayarlar: "settings"
};

export default async function AdminSectionPage({ params }: PageProps) {
  const { section } = await params;
  const adminSection = sections[section];

  if (!adminSection) {
    notFound();
  }

  return <AdminDashboard menu={menu} tables={tables} section={adminSection} />;
}
