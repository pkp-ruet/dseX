import type { Metadata } from "next";
import ReportShell, { RESEARCH_ANCHOR } from "@/components/research-reports/ReportShell";
import ResearchPromo from "@/components/research-reports/ResearchPromo";
import QualityView from "@/components/research-reports/QualityView";
import { T } from "@/components/i18n/T";
import { getEarningsQuality } from "@/lib/api";
import { reportJsonLd, reportMetadata } from "@/lib/research-reports";

export const revalidate = 3600;

const TITLE = "Is the Profit Real? Earnings Quality of DSE Companies";
const DESCRIPTION =
  "For every Dhaka Stock Exchange company, how much of five years of profit came in as cash, whose profit is not from its own business, who paid dividends the business could not fund, and who is growing on loans.";

export const metadata: Metadata = reportMetadata("is-the-profit-real", TITLE, DESCRIPTION, [
  "DSE earnings quality",
  "operating cash flow vs profit Bangladesh",
  "DSE companies cash flow",
  "Bangladesh accounting red flags",
  "DSE dividend from loans",
]);

export default async function IsTheProfitRealPage() {
  const data = await getEarningsQuality();
  const c = data.counts;
  const graded = c.backed + c.partly + c.paper + c.none;
  const paper = c.paper + c.none;
  const ex = data.items.find((i) => i.code === data.lists.paper[0]) ?? null;
  const span = ex ? (ex.from === ex.to ? `${ex.to}` : `${ex.from}–${ex.to}`) : "";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reportJsonLd("is-the-profit-real", TITLE, DESCRIPTION, null)) }}
      />
      <ReportShell
        slug="is-the-profit-real"
        asOf={null}
        stats={[
          { value: c.backed, tone: "positive", label: { en: `of ${graded} companies: profit backed by cash`, bn: `কোম্পানির মুনাফা নগদে সমর্থিত, মোট ${graded}টির মধ্যে` } },
          { value: paper, tone: "negative", label: { en: "show profit that mostly stayed on paper", bn: "কোম্পানির মুনাফা বেশির ভাগই কাগজে" } },
          { value: data.lists.dividend_unfunded.length, tone: "watch", label: { en: "paid dividends bigger than the cash they had", bn: "কোম্পানি হাতের নগদের চেয়ে বড় ডিভিডেন্ড দিয়েছে" } },
        ]}
        promo={
          <ResearchPromo
            anchor={RESEARCH_ANCHOR}
            lock="research-quality"
            name={{ en: "Is the profit real?", bn: "মুনাফা কি আসল?" }}
            title={{
              en: `${paper} DSE companies show profit that mostly never came in as cash. Know which before you trust the numbers.`,
              bn: `ডিএসইর ${paper}টি কোম্পানির মুনাফা বেশির ভাগই নগদে আসেনি। সংখ্যায় ভরসা করার আগে জেনে নিন কোনগুলো।`,
            }}
            lead={{
              en: "A profit on paper is easy to show. Cash is harder to fake. We put five years of each company's profit beside the cash its business really brought in.",
              bn: "কাগজে মুনাফা দেখানো সহজ, নগদ বানানো কঠিন। প্রতিটি কোম্পানির পাঁচ বছরের মুনাফা আমরা ব্যবসা থেকে আসলে আসা নগদের পাশে রেখেছি।",
            }}
            taste={
              ex && ex.cash_per_100 != null ? (
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
                        en={`Of every ৳100 of profit it showed in ${span}, ৳${Math.max(0, ex.cash_per_100)} came in as cash.`}
                        bn={`${span} সময়ে দেখানো প্রতি ৳100 মুনাফার মধ্যে নগদে এসেছে ৳${Math.max(0, ex.cash_per_100)}।`}
                      />
                    </p>
                  </div>
                </div>
              ) : null
            }
            gets={[
              { en: "Every company's profit against its cash, over 5 years", bn: "প্রতিটি কোম্পানির 5 বছরের মুনাফা বনাম নগদ" },
              { en: "Profit that doesn't come from the business itself", bn: "যে মুনাফা ব্যবসা থেকে আসেনি" },
              { en: "Dividends paid from savings or loans", bn: "জমানো টাকা বা ঋণ থেকে দেওয়া ডিভিডেন্ড" },
              { en: "Companies growing on loans, and the best cash makers", bn: "ঋণে ভর করে বাড়া কোম্পানি, আর সেরা নগদ উপার্জনকারী" },
            ]}
          />
        }
        method={[
          {
            en: "For each company we add up its profit and the cash its business brought in over its last five years of accounts, from its own cash-flow statements.",
            bn: "প্রতিটি কোম্পানির শেষ পাঁচ বছরের হিসাবে মুনাফা আর ব্যবসা থেকে আসা নগদ আমরা যোগ করি, কোম্পানির নিজের নগদ প্রবাহের হিসাব থেকে।",
          },
          {
            en: "৳90 or more of cash for every ৳100 of profit is backed by cash; ৳50 to ৳90 is partly backed; less than ৳50 is mostly on paper.",
            bn: "প্রতি ৳100 মুনাফায় ৳90 বা তার বেশি নগদ এলে নগদে সমর্থিত; ৳50 থেকে ৳90 আংশিক; ৳50-এর কম হলে বেশির ভাগই কাগজে।",
          },
          {
            en: "Banks, finance companies and insurers are left out: taking deposits and lending is their business, so their cash flows mean something else.",
            bn: "ব্যাংক, আর্থিক প্রতিষ্ঠান ও বীমা কোম্পানি বাদ: আমানত নেওয়া আর ঋণ দেওয়াই তাদের ব্যবসা, তাই তাদের নগদ প্রবাহের মানে আলাদা।",
          },
          {
            en: "Where a company's cash figures look wrong (two sources disagree, or cash out far bigger than any business could sustain), we leave it out rather than guess.",
            bn: "যেখানে কোম্পানির নগদের হিসাব ভুল মনে হয় (দুটি উৎস মেলে না, বা নগদ বেরিয়েছে এত বেশি যে কোনো ব্যবসা টিকতে পারে না), সেখানে আন্দাজ না করে বাদ রাখি।",
          },
        ]}
      >
        <QualityView data={data} />
      </ReportShell>
    </>
  );
}
