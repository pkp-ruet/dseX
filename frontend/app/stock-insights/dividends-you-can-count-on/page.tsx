import type { Metadata } from "next";
import ReportShell, { RESEARCH_ANCHOR } from "@/components/research-reports/ReportShell";
import ResearchPromo from "@/components/research-reports/ResearchPromo";
import DividendsView from "@/components/research-reports/DividendsView";
import { T } from "@/components/i18n/T";
import { getDividendReliability } from "@/lib/api";
import { reportJsonLd, reportMetadata } from "@/lib/research-reports";

export const revalidate = 3600;

const TITLE = "DSE Dividends You Can Count On";
const DESCRIPTION =
  "Five years of cash and bonus dividends for every Dhaka Stock Exchange company: steady payers with their yield after tax, dividends at risk, who cut or stopped this year, and bonus shares handed out instead of cash.";

export const metadata: Metadata = reportMetadata("dividends-you-can-count-on", TITLE, DESCRIPTION, [
  "best dividend stocks Bangladesh",
  "DSE dividend history",
  "regular dividend paying companies DSE",
  "DSE dividend cut",
  "bonus share vs cash dividend Bangladesh",
]);

export default async function DividendsYouCanCountOnPage() {
  const data = await getDividendReliability();
  const c = data.counts;
  const ex = data.items.find((i) => i.code === data.lists.steady[0]) ?? null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(reportJsonLd("dividends-you-can-count-on", TITLE, DESCRIPTION, null)),
        }}
      />
      <ReportShell
        slug="dividends-you-can-count-on"
        asOf={null}
        stats={[
          { value: c.every_year, tone: "positive", label: { en: "companies paid cash every year for 5 years", bn: "কোম্পানি টানা 5 বছর নগদ দিয়েছে" } },
          { value: c.at_risk, tone: "negative", label: { en: "pay now, but the next dividend looks at risk", bn: "কোম্পানি এখন দিচ্ছে, কিন্তু পরেরটি ঝুঁকিতে" } },
          { value: c.cut + c.skipped, tone: "watch", label: { en: "cut or stopped their cash dividend this year", bn: "কোম্পানি এ বছর নগদ ডিভিডেন্ড কমিয়েছে বা বন্ধ করেছে" } },
        ]}
        promo={
          <ResearchPromo
            anchor={RESEARCH_ANCHOR}
            lock="research-dividends"
            name={{ en: "Reliable dividends", bn: "নিয়মিত ডিভিডেন্ড" }}
            title={{
              en: `${c.steady} DSE companies look steady on every count. ${c.at_risk} dividends look at risk.`,
              bn: `ডিএসইর ${c.steady}টি কোম্পানি সব দিক থেকে স্থিতিশীল। ${c.at_risk}টির ডিভিডেন্ড ঝুঁকিতে।`,
            }}
            lead={{
              en: "A high yield means nothing if the dividend stops. We read five years of each company's dividends and check whether the next one is safe.",
              bn: "ডিভিডেন্ড বন্ধ হয়ে গেলে উঁচু ইল্ডের কোনো মানে নেই। প্রতিটি কোম্পানির পাঁচ বছরের ডিভিডেন্ড পড়ে আমরা দেখি, পরেরটি নিরাপদ কি না।",
            }}
            taste={
              ex ? (
                <div className="rr-taste">
                  <p className="sp-k">
                    <T en="One company from the report" bn="প্রতিবেদন থেকে একটি কোম্পানি" />
                  </p>
                  <div className="rr-taste-card">
                    <p className="rr-taste-name">
                      {ex.name} <span className="rr-code">{ex.code}</span>
                    </p>
                    <p className="rr-co-line">
                      <T
                        en={`Paid cash every year for ${ex.n_years} years${ex.yield_after_tax ? `, about ${ex.yield_after_tax}% a year after tax` : ""}. Our safety check: ${ex.safety?.word_en ?? "steady"}.`}
                        bn={`টানা ${ex.n_years} বছর নগদ দিয়েছে${ex.yield_after_tax ? `, কর বাদে বছরে প্রায় ${ex.yield_after_tax}%` : ""}। আমাদের নিরাপত্তা যাচাই: ${ex.safety?.word_bn ?? "স্থিতিশীল"}।`}
                      />
                    </p>
                  </div>
                </div>
              ) : null
            }
            gets={[
              { en: "Every steady payer, with its yield after tax", bn: "প্রতিটি নিয়মিত দাতা, কর বাদে ইল্ডসহ" },
              { en: "Dividends at risk next time, and why", bn: "পরের বার ঝুঁকিতে থাকা ডিভিডেন্ড, আর কেন" },
              { en: "Who cut or stopped this year", bn: "এ বছর কে কমাল বা বন্ধ করল" },
              { en: "Bonus shares handed out instead of cash", bn: "নগদের বদলে দেওয়া বোনাস শেয়ার" },
            ]}
          />
        }
        method={[
          {
            en: "Each company's cash and bonus dividends for its last five years come from DSE's yearly table, with the declarations it posted for years still open.",
            bn: "প্রতিটি কোম্পানির শেষ পাঁচ বছরের নগদ ও বোনাস ডিভিডেন্ড এসেছে ডিএসইর বার্ষিক তালিকা থেকে, আর যে বছর এখনো চলছে তার ঘোষণা থেকে।",
          },
          {
            en: "\"Is it safe?\" is the same check the stock page uses: a loss, paying out more than it earned, falling profit or cash, or a thin record all count against it.",
            bn: "\"নিরাপদ কি না\" স্টক পেজের একই যাচাই: লোকসান, আয়ের চেয়ে বেশি দেওয়া, কমতে থাকা মুনাফা বা নগদ, কিংবা কম বছরের রেকর্ড, সবই এর বিপক্ষে যায়।",
          },
          {
            en: "Yield is the latest year's cash on today's price, after the 10% dividend tax (15% without a TIN).",
            bn: "ইল্ড মানে আজকের দামে সর্বশেষ বছরের নগদ, 10% ডিভিডেন্ড কর বাদে (টিআইএন না থাকলে 15%)।",
          },
          {
            en: "Only companies with at least three years of record reaching this year or last are included.",
            bn: "শুধু সেসব কোম্পানি রাখা হয়েছে, যাদের অন্তত তিন বছরের রেকর্ড এ বছর বা গত বছর পর্যন্ত আছে।",
          },
        ]}
      >
        <DividendsView data={data} />
      </ReportShell>
    </>
  );
}
