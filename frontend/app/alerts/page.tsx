import type { Metadata } from "next";
import AlertsClient from "@/components/alerts/AlertsClient";

export const metadata: Metadata = {
  title: "My Price Alerts — TopStockBD",
  description:
    "Set a target price on any DSE stock and get notified the day it's hit — by web push and in your alerts bell.",
  robots: { index: false, follow: false },
};

export default function AlertsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <div className="rank-page-header">
        <h1 className="rank-page-title">Price Alerts</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Get pinged the day a stock reaches your target — by web push and in your alerts bell.
        </p>
      </div>
      <AlertsClient />
    </main>
  );
}
