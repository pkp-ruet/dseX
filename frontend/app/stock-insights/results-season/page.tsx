import type { Metadata } from "next";
import ReportShell, { RESEARCH_ANCHOR } from "@/components/research-reports/ReportShell";
import ResearchPromo from "@/components/research-reports/ResearchPromo";
import SeasonView from "@/components/research-reports/SeasonView";
import { T } from "@/components/i18n/T";
import { getResultsSeason } from "@/lib/api";
import { reportJsonLd, reportMetadata, type ResultsSeason } from "@/lib/research-reports";

export const revalidate = 3600;

const TITLE = "DSE Results Season Report";
const DESCRIPTION =
  "How Dhaka Stock Exchange companies did this results season: how many made more profit than a year earlier, sector by sector, the biggest rises and falls, profit without cash, and dividends against last year.";

export const metadata: Metadata = reportMetadata("results-season", TITLE, DESCRIPTION, [
  "DSE quarterly results",
  "DSE earnings season",
  "Bangladesh company results 2026",
  "DSE profit growth by sector",
  "DSE dividend cut",
]);

export default async function ResultsSeasonPage() {
  const first = await getResultsSeason();
  const rest = await Promise.all(
    first.seasons.slice(1).map((s) => getResultsSeason(s.id).catch(() => null)),
  );
  const seasons = [first, ...rest.filter((s): s is ResultsSeason => !!s)];
  const c = first.counts;
  const n = first.reported;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reportJsonLd("results-season", TITLE, DESCRIPTION, first.rows[0]?.posted ?? null)) }}
      />
      <ReportShell
        slug="results-season"
        asOf={first.rows[0]?.posted ?? null}
        stats={[
          { value: n, label: { en: "companies have posted results", bn: "কোম্পানি ফল দিয়েছে" } },
          { value: c.up, tone: "positive", label: { en: "made more profit than a year earlier", bn: "কোম্পানির মুনাফা এক বছর আগের চেয়ে বেশি" } },
          { value: first.coming.length, label: { en: "more report in the next 2 weeks", bn: "কোম্পানি আগামী 2 সপ্তাহে ফল দেবে" } },
        ]}
        promo={
          <ResearchPromo
            anchor={RESEARCH_ANCHOR}
            lock="research-season"
            name={{ en: "Latest results", bn: "সর্বশেষ আর্থিক ফল" }}
            title={{
              en: `${n} companies have posted their results. See how each sector really did.`,
              bn: `${n}টি কোম্পানি ফল দিয়েছে। প্রতিটি সেক্টর আসলে কেমন করল, দেখুন।`,
            }}
            lead={{
              en: "Every report of the season in one place: who grew, who slipped, whose profit didn't come in as cash, and who cut the dividend.",
              bn: "মৌসুমের প্রতিটি ফল এক জায়গায়: কে বাড়ল, কে পিছিয়ে পড়ল, কার মুনাফা নগদে আসেনি, আর কে ডিভিডেন্ড কমাল।",
            }}
            taste={
              <div className="rr-taste">
                <p className="sp-k">
                  <T en={first.season.title.en} bn={first.season.title.bn} />
                </p>
                <div className="rr-taste-card">
                  <p className="rr-taste-name">
                    <T
                      en={`${c.up} of ${n} made more profit. ${c.down} made less, and ${c.loss} are still making a loss.`}
                      bn={`${n}টির মধ্যে ${c.up}টির মুনাফা বেড়েছে। ${c.down}টির কমেছে, আর ${c.loss}টি এখনো লোকসানে।`}
                    />
                  </p>
                </div>
              </div>
            }
            gets={[
              { en: "How every sector did, side by side", bn: "প্রতিটি সেক্টর কেমন করল, পাশাপাশি" },
              { en: "The biggest rises and falls, and who turned to a loss", bn: "সবচেয়ে বেশি বাড়া ও কমা, আর কে লোকসানে গেল" },
              { en: "Profit that did not come in as cash", bn: "যে মুনাফা নগদে আসেনি" },
              { en: "Dividends against last year, and who is still to report", bn: "গত বছরের তুলনায় ডিভিডেন্ড, আর কার ফল এখনো বাকি" },
            ]}
          />
        }
        method={[
          {
            en: "We read every results notice companies post on DSE: the quarterly reports and the yearly results that come with the dividend.",
            bn: "কোম্পানিগুলো ডিএসইতে যত ফলের নোটিশ দেয়, সব আমরা পড়ি: প্রান্তিকের ফল আর ডিভিডেন্ডের সঙ্গে আসা বছরের ফল।",
          },
          {
            en: "A season is every report for the same period. Each company is compared with the same months a year earlier.",
            bn: "একই সময়ের সব ফল মিলে একটি মৌসুম। প্রতিটি কোম্পানির তুলনা এক বছর আগের একই মাসগুলোর সঙ্গে।",
          },
          {
            en: "Profit counts as up or down when it moved 10% or more. Under that, it is about the same.",
            bn: "মুনাফা 10% বা তার বেশি বদলালে বেড়েছে বা কমেছে ধরা হয়। তার কম হলে প্রায় একই।",
          },
          {
            en: "Banks, finance companies and insurers are left out of the cash check, because their cash works differently.",
            bn: "ব্যাংক, আর্থিক প্রতিষ্ঠান আর বীমা কোম্পানিকে নগদের যাচাইয়ে রাখা হয়নি, কারণ তাদের নগদের হিসাব আলাদা।",
          },
        ]}
      >
        <SeasonView seasons={seasons} />
      </ReportShell>
    </>
  );
}
