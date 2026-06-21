import type { Metadata } from "next";
import AdminCampaignsClient from "@/components/admin/AdminCampaignsClient";

export const metadata: Metadata = {
  title: "Email Campaigns — Admin",
  robots: { index: false, follow: false },
};

export default function AdminCampaignsPage() {
  return <AdminCampaignsClient />;
}
