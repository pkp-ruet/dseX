import type { Metadata } from "next";
import AdminScoresClient from "@/components/admin/AdminScoresClient";

export const metadata: Metadata = {
  title: "Score Adjustments — Admin",
  robots: { index: false, follow: false },
};

export default function AdminScoresPage() {
  return <AdminScoresClient />;
}
