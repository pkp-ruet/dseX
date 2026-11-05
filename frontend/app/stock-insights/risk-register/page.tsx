import type { Metadata } from "next";
import ReportShell, { RESEARCH_ANCHOR } from "@/components/research-reports/ReportShell";
import ResearchPromo from "@/components/research-reports/ResearchPromo";
import RiskRegisterView from "@/components/research-reports/RiskRegisterView";
import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";
import { getRiskRegister } from "@/lib/api";
import { reportJsonLd, reportMetadata } from "@/lib/research-reports";

export const revalidate = 3600;

const TITLE = "DSE Companies With Serious Problems";
const DESCRIPTION =
  "Every Dhaka Stock Exchange company with a serious problem right now: factories found closed, auditor warnings, losses that ate the capital, loans bigger than the company, Z category, late results. Updated after every close.";

export const metadata: Metadata = reportMetadata("risk-register", TITLE, DESCRIPTION, [
  "DSE risky stocks",
  "DSE Z category companies",
  "Bangladesh stock red flags",
  "DSE companies to avoid",
  "auditor qualified opinion DSE",
  "DSE factory closed",
]);

export default async function RiskRegisterPage() {
  const data = await getRiskRegister();
  const ex = data.items[0];
  const week = `${data.week.added.length} / ${data.week.fixed.length}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reportJsonLd("risk-register", TITLE, DESCRIPTION, data.as_of)) }}
      />
      <ReportShell
        slug="risk-register"
        asOf={data.as_of}
        stats={[
          {
            value: data.flagged,
            tone: "negative",
            label: { en: `of ${data.universe} companies have a serious problem`, bn: `কোম্পানির গুরুতর সমস্যা আছে, মোট ${data.universe}টির মধ্যে` },
          },
          { value: data.two_or_more, label: { en: "companies have two or more", bn: "কোম্পানির দুই বা তার বেশি সমস্যা" } },
          { value: week, label: { en: "new problems / problems gone this week", bn: "এই সপ্তাহে নতুন সমস্যা / মিটেছে" } },
        ]}
        promo={
          <ResearchPromo
            anchor={RESEARCH_ANCHOR}
            lock="research-risks"
            name={{ en: "Companies in trouble", bn: "সমস্যায় থাকা কোম্পানি" }}
            title={{
              en: `${data.flagged} DSE companies have a serious problem today. Know which ones before you buy.`,
              bn: `আজ ডিএসইর ${data.flagged}টি কোম্পানি গুরুতর সমস্যায় আছে। কেনার আগে জেনে নিন কোনগুলো।`,
            }}
            lead={{
              en: "We check every company after each close against DSE's notices, the auditors' reports and its own accounts, and list every serious problem we find in plain words.",
              bn: "প্রতিদিন বাজার বন্ধের পর প্রতিটি কোম্পানিকে ডিএসইর নোটিশ, নিরীক্ষকের প্রতিবেদন আর তার নিজের হিসাবের সঙ্গে মিলিয়ে দেখি, আর যত গুরুতর সমস্যা পাই, সহজ ভাষায় তালিকা করি।",
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
                      {ex.problems.map((p) => (
                        <li key={p.key}>
                          <span className="rr-dot rr-dot--red" aria-hidden="true" />
                          <span className="min-w-0">
                            <b>
                              <T en={p.title.en} bn={p.title.bn} />
                            </b>{" "}
                            <T en={p.en} bn={p.bn} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null
            }
            gets={[
              { en: "Every company with a serious problem, and what the problem is", bn: "গুরুতর সমস্যার প্রতিটি কোম্পানি, আর সমস্যাটা কী" },
              { en: "What changed this week: new problems and problems gone", bn: "এই সপ্তাহে কী বদলাল: নতুন সমস্যা আর মিটে যাওয়া সমস্যা" },
              { en: "Your own shares picked out of the list", bn: "তালিকা থেকে আপনার নিজের শেয়ার আলাদা করে" },
              { en: "Who could move to the Z category next", bn: "এরপর কে Z ক্যাটাগরিতে যেতে পারে" },
            ]}
          />
        }
        method={[
          {
            en: "Every graded company goes through the same safety checks as its stock page, after every close.",
            bn: "রেটিং পাওয়া প্রতিটি কোম্পানি প্রতিদিন বাজার বন্ধের পর তার স্টক পেজের একই নিরাপত্তা যাচাইয়ের মধ্য দিয়ে যায়।",
          },
          {
            en: "Only serious problems are listed here. Smaller things to watch stay on each company's own page.",
            bn: "এখানে শুধু গুরুতর সমস্যা রাখা হয়েছে। ছোটখাটো বিষয় প্রতিটি কোম্পানির নিজের পেজে আছে।",
          },
          {
            en: "Each problem comes from a DSE notice, an auditor's report or the company's own accounts, and says when it happened.",
            bn: "প্রতিটি সমস্যা ডিএসইর নোটিশ, নিরীক্ষকের প্রতিবেদন বা কোম্পানির নিজের হিসাব থেকে নেওয়া, আর কবে ঘটেছে তা বলা আছে।",
          },
          {
            en: "\"This week\" compares today with about 5 trading days ago. A day when our own checks changed is left out.",
            bn: "\"এই সপ্তাহ\" মানে আজকের সঙ্গে প্রায় 5 কার্যদিবস আগের তুলনা। যেদিন আমাদের যাচাইয়ের নিয়ম বদলেছে, সেদিন বাদ।",
          },
        ]}
      >
        <RiskRegisterView data={data} />
      </ReportShell>
    </>
  );
}
