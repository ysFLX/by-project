import { AdminDashboard } from "@/components/admin-dashboard";
import { menu, tables } from "@/lib/catalog-data";

export default function AdminPage() {
  return <AdminDashboard menu={menu} tables={tables} section="overview" />;
}
