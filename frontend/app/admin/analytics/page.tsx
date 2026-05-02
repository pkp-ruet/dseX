import type { Metadata } from "next";
import AdminAnalyticsClient from "@/components/admin/AdminAnalyticsClient";

export const metadata: Metadata = {
  title: "User Analytics — Admin",
  robots: { index: false, follow: false },
};

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsClient />;
}
