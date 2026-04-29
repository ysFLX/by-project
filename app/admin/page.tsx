import { AdminDashboard } from "@/components/admin-dashboard";
import { menu, tables } from "@/lib/mock-data";

export default function AdminPage() {
  return <AdminDashboard menu={menu} tables={tables} />;
}
