import type { Metadata } from "next";
import AdminDailyPickClient from "@/components/admin/AdminDailyPickClient";

export const metadata: Metadata = {
  title: "Today's Top Stock — Admin",
  robots: { index: false, follow: false },
};

export default function AdminDailyPickPage() {
  return <AdminDailyPickClient />;
}
