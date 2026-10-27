import type { Metadata } from "next";
import AlertsClient from "@/components/alerts/AlertsClient";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

export const metadata: Metadata = {
  title: "My Price Alerts",
  description:
    "Set a target price on any DSE stock and get notified the day it's hit — by web push and in your alerts bell.",
  robots: { index: false, follow: false },
};

export default function AlertsPage() {
  return (
    <div className="page-narrow">
      <PageHeader
        title={<T en="Price alerts" bn="প্রাইস অ্যালার্ট" />}
        lead={
          <T
            en="We tell you on the day a share reaches your target price, by phone notification and in your alerts bell."
            bn="শেয়ারের দাম আপনার ঠিক করা দামে পৌঁছালে সেদিনই আমরা জানাই, ফোনের নোটিফিকেশন আর অ্যালার্টের ঘণ্টায়।"
          />
        }
      />
      <AlertsClient />
    </div>
  );
}
