import type { Metadata } from "next";
import AdminDailyTipsClient from "@/components/admin/AdminDailyTipsClient";

export const metadata: Metadata = {
  title: "Edit Daily Tips — Admin",
  robots: { index: false, follow: false },
};

export default function AdminTipsPage() {
  return <AdminDailyTipsClient />;
}
