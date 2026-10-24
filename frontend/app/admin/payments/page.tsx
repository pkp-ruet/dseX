import type { Metadata } from "next";
import AdminPaymentsClient from "@/components/admin/AdminPaymentsClient";

export const metadata: Metadata = {
  title: "Payments — Admin",
  robots: { index: false, follow: false },
};

export default function AdminPaymentsPage() {
  return <AdminPaymentsClient />;
}
