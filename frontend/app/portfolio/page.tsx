import type { Metadata } from "next";
import PortfolioClient from "@/components/portfolio/PortfolioClient";
import ViewAnalysisButton from "@/components/portfolio/ViewAnalysisButton";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

export const metadata: Metadata = {
  title: "My Portfolio",
  description: "Track your DSE stock portfolio with live P&L, current market value, and gain/loss calculations.",
  robots: { index: false, follow: false },
};

export default function PortfolioPage() {
  return (
    <>
      <PageHeader
        title={<T en="My portfolio" bn="আমার পোর্টফোলিও" />}
        lead={
          <T
            en="Your money, your check and what to do on the shares you own, updated every day. The shares themselves are on My shares."
            bn="আপনার টাকা, পোর্টফোলিও যাচাই আর কী করবেন, প্রতিদিন হালনাগাদ। শেয়ারগুলো আছে আমার শেয়ার পেজে।"
          />
        }
        actions={<ViewAnalysisButton />}
      />
      <PortfolioClient />
    </>
  );
}
