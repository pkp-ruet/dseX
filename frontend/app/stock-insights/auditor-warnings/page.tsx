import type { Metadata } from "next";
import ReportShell, { RESEARCH_ANCHOR } from "@/components/research-reports/ReportShell";
import ResearchPromo from "@/components/research-reports/ResearchPromo";
import AuditorView from "@/components/research-reports/AuditorView";
import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";
import { getAuditorTracker } from "@/lib/api";
import { reportJsonLd, reportMetadata } from "@/lib/research-reports";

export const revalidate = 3600;

const TITLE = "Auditor Warnings on DSE Companies";
const DESCRIPTION =
  "Every Dhaka Stock Exchange company whose auditor did not fully approve its accounts in the last year, why, in plain words: doubts it can keep going, losses not counted, money that may not come back, figures that could not be checked.";

export const metadata: Metadata = reportMetadata("auditor-warnings", TITLE, DESCRIPTION, [
  "qualified opinion DSE",
  "going concern DSE companies",
  "auditor report Bangladesh listed companies",
  "DSE audit warnings",
  "Bangladesh company accounts problems",
]);

export default async function AuditorWarningsPage() {
  const data = await getAuditorTracker();
  const ex = data.groups[0]?.items[0];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reportJsonLd("auditor-warnings", TITLE, DESCRIPTION, data.as_of)) }}
      />
      <ReportShell
        slug="auditor-warnings"
        asOf={data.as_of}
        stats={[
          {
            value: data.companies,
            label: { en: "companies' accounts not fully approved", bn: "কোম্পানির হিসাব পুরোপুরি অনুমোদিত হয়নি" },
          },
          {
            value: data.counts.going_concern,
            tone: "negative",
            label: { en: "companies the auditor doubts can keep going", bn: "কোম্পানির টিকে থাকা নিয়ে নিরীক্ষক সন্দিহান" },
          },
          {
            value: data.counts.serious,
            tone: "watch",
            label: { en: "companies with a serious problem in the accounts", bn: "কোম্পানির হিসাবে গুরুতর সমস্যা" },
          },
        ]}
        promo={
          <ResearchPromo
            anchor={RESEARCH_ANCHOR}
            lock="research-auditors"
            name={{ en: "Auditor warnings", bn: "নিরীক্ষকের আপত্তি" }}
            title={{
              en: `Auditors did not fully approve the accounts of ${data.companies} DSE companies. See who, and why.`,
              bn: `ডিএসইর ${data.companies}টি কোম্পানির হিসাব নিরীক্ষক পুরোপুরি অনুমোদন করেননি। কারা, আর কেন, দেখুন।`,
            }}
            lead={{
              en: "DSE posts only one line about these reports. We read every auditor's report behind it and explain the reasons in plain words.",
              bn: "এসব প্রতিবেদন নিয়ে ডিএসই শুধু এক লাইন দেয়। আমরা এর পেছনের প্রতিটি নিরীক্ষক প্রতিবেদন পড়ে কারণগুলো সহজ ভাষায় বুঝিয়ে বলি।",
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
                    {ex.sector && (
                      <p className="rr-meta">
                        <T en={ex.sector} bn={sectorBn(ex.sector)} />
                      </p>
                    )}
                    <ul className="rr-probs">
                      <li>
                        <span className="rr-dot rr-dot--red" aria-hidden="true" />
                        <span className="min-w-0">
                          <T en={data.groups[0].title.en} bn={data.groups[0].title.bn} />
                          {ex.year ? <T en={` (${ex.year} accounts)`} bn={` (${ex.year} সালের হিসাব)`} /> : null}
                        </span>
                      </li>
                      {ex.reasons.map((r) => (
                        <li key={r.key}>
                          <span className={`rr-dot ${r.serious ? "rr-dot--red" : "rr-dot--amber"}`} aria-hidden="true" />
                          <span className="min-w-0 rr-first-up">
                            <T en={r.en} bn={r.bn} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null
            }
            gets={[
              { en: "Every company the auditor did not fully approve, most serious first", bn: "নিরীক্ষক পুরোপুরি অনুমোদন করেননি এমন প্রতিটি কোম্পানি, সবচেয়ে গুরুতর আগে" },
              { en: "The reasons in plain words, and the auditor's own words", bn: "কারণগুলো সহজ ভাষায়, আর নিরীক্ষকের নিজের ভাষায়" },
              { en: "Which sectors have the most", bn: "কোন সেক্টরে সবচেয়ে বেশি" },
              { en: "Companies the auditor warned about two years running", bn: "যেসব কোম্পানি নিয়ে নিরীক্ষক পরপর দুই বছর সতর্ক করেছেন" },
            ]}
          />
        }
        method={[
          {
            en: "When an auditor does not fully approve a company's accounts, DSE posts a one-line notice with the auditor's report attached.",
            bn: "নিরীক্ষক কোনো কোম্পানির হিসাব পুরোপুরি অনুমোদন না করলে ডিএসই এক লাইনের নোটিশ দেয়, সঙ্গে নিরীক্ষকের প্রতিবেদন থাকে।",
          },
          {
            en: "We read each of those reports from the last 12 months and sort the auditor's reasons into serious and smaller ones.",
            bn: "গত 12 মাসের প্রতিটি প্রতিবেদন আমরা পড়ি আর নিরীক্ষকের কারণগুলো গুরুতর ও ছোট, এই দুই ভাগে সাজাই।",
          },
          {
            en: "Serious reasons can change what a company is worth. Smaller ones are usually about staff funds or tax.",
            bn: "গুরুতর কারণ কোম্পানির মূল্য বদলে দিতে পারে। ছোট কারণগুলো সাধারণত কর্মীদের তহবিল বা কর নিয়ে।",
          },
          {
            en: "A few reports are scanned images we can't read. We say so, and link the report so you can read it yourself.",
            bn: "কিছু প্রতিবেদন ছবি হিসেবে স্ক্যান করা, যা আমরা পড়তে পারি না। সেগুলো আমরা জানিয়ে দিই, আর প্রতিবেদনের লিংক দিই যাতে নিজে পড়তে পারেন।",
          },
        ]}
      >
        <AuditorView data={data} />
      </ReportShell>
    </>
  );
}
