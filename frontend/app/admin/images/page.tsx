import type { Metadata } from "next";
import AdminImagesClient from "@/components/admin/AdminImagesClient";

export const metadata: Metadata = {
  title: "Promo Images — Admin",
  robots: { index: false, follow: false },
};

export default function AdminImagesPage() {
  return <AdminImagesClient />;
}
