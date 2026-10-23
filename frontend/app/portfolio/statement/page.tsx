import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import StatementClient from "@/components/portfolio/StatementClient";

export const metadata: Metadata = {
  title: "Yearly Portfolio Statement",
  description: "Every buy, sale, cash dividend and bonus share in your DSE portfolio for the year — print it or download it.",
  robots: { index: false, follow: false },
};

export default function PortfolioStatementPage() {
  return (
    <div className="page-narrow">
      <div className="print-hide">
        <PageHeader
          title="Yearly statement"
          bn="বছরের সব কেনা-বেচা, ডিভিডেন্ড আর বোনাস — এক পাতায়।"
        />
      </div>
      <StatementClient />
    </div>
  );
}
