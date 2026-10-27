import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import StatementClient from "@/components/portfolio/StatementClient";
import { T } from "@/components/i18n/T";

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
          title={<T en="Yearly statement" bn="বার্ষিক হিসাব" />}
          lead={
            <T
              en="Every buy, sale, dividend and bonus share for the year, on one page."
              bn="বছরের সব কেনা, বিক্রি, ডিভিডেন্ড আর বোনাস শেয়ার, এক পেজে।"
            />
          }
        />
      </div>
      <StatementClient />
    </div>
  );
}
