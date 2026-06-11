import type { Metadata } from "next";
import AdminFeedbackClient from "@/components/admin/AdminFeedbackClient";

export const metadata: Metadata = {
  title: "User Feedback — Admin",
  robots: { index: false, follow: false },
};

export default function AdminFeedbackPage() {
  return <AdminFeedbackClient />;
}
