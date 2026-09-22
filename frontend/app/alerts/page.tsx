import type { Metadata } from "next";
import AlertsClient from "@/components/alerts/AlertsClient";
import PageHeader from "@/components/ui/PageHeader";

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
        title="Price Alerts"
        bn="শেয়ারের দাম আপনার ঠিক করা দামে পৌঁছালেই জানিয়ে দেব।"
        lead="Get pinged the day a stock reaches your target — by web push and in your alerts bell."
      />
      <AlertsClient />
    </div>
  );
}
