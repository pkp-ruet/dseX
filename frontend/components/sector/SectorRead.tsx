import Link from "next/link";
import type { SectorDetailData, SectorRead as Read } from "@/lib/api";
import { T } from "@/components/i18n/T";
import { Locked } from "@/components/premium/AnswerLock";
import PageQuestions, { type PageQuestion } from "@/components/premium/PageQuestions";
import SectionHeader from "@/components/ui/SectionHeader";
import { sectorBn } from "@/lib/bn";

const DOT: Record<string, string> = {
  good: "bg-positive",
  bad: "bg-negative",
  fair: "bg-watch",
  neutral: "bg-text-muted",
};

/**
 * "Our read this month" on /sector/[slug] (2026-10-31, the Premium Desk plan):
 * three plain sentences — the price against the market, the profit direction
 * from its companies' latest reports, money moving in or out (its share of DSE
 * trading, 4 weeks against the 4 before) — and the best value in it today.
 * Premium (screen-only `Locked`); a free reader sees the page's ONE question
 * card (`#sec-premium`) in its place, built from facts on this page.
 */
export default function SectorRead({ data }: { data: SectorDetailData }) {
  const read = data.read;
  if (!read || (read.lines.length === 0 && !read.best)) return null;
  const s = data.summary;
  return (
    <section className="mb-8" aria-labelledby="sec-read">
      <SectionHeader
        id="sec-read"
        title={<T en="Our read this month" bn="এ মাসে আমাদের মূল্যায়ন" />}
        lead={
          <T
            en={`What the price, the profit and the money say about ${s.sector.toLowerCase()} shares right now.`}
            bn={`${sectorBn(s.sector)} শেয়ার নিয়ে দাম, মুনাফা আর লেনদেন এখন কী বলছে।`}
          />
        }
        className="mt-8"
      />
      <PageQuestions
        id="sec-premium"
        area="sector"
        title={{ en: "Every figure on this sector is free. Here is what it leaves open.", bn: "এই সেক্টরের সব সংখ্যা ফ্রি। তবু কিছু প্রশ্ন থেকে যায়।" }}
        lead={{
          en: "Premium answers these here, in three plain sentences, each month.",
          bn: "প্রিমিয়ামে এর উত্তর এখানেই, প্রতি মাসে তিনটি সহজ বাক্যে।",
        }}
        rows={sectorQuestions(data, read)}
        label={{ en: `Our read of ${s.sector}`, bn: `${sectorBn(s.sector)} সেক্টরের মূল্যায়ন` }}
      />
      <Locked>
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <ul className="flex flex-col gap-3">
            {read.lines.map((l) => (
              <li key={l.key} className="flex items-start gap-3 text-sm leading-relaxed text-text-main">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[l.tone] ?? DOT.neutral}`} aria-hidden="true" />
                <span>
                  <T en={l.en} bn={l.bn || l.en} />
                </span>
              </li>
            ))}
          </ul>
          {read.best && (
            <p className="mt-4 border-t border-border pt-3 text-sm font-semibold leading-relaxed text-text-main">
              <T en={read.best.en} bn={read.best.bn || read.best.en} />{" "}
              <Link href={`/stock/${encodeURIComponent(read.best.trading_code)}`} className="text-primary-ink hover:underline">
                <T en={`Open ${read.best.trading_code}`} bn={`${read.best.trading_code} দেখুন`} />
              </Link>
            </p>
          )}
        </div>
      </Locked>
    </section>
  );
}

function sectorQuestions(data: SectorDetailData, read: Read): PageQuestion[] {
  const s = data.summary;
  const rows: PageQuestion[] = [];
  if (read.reported > 0) {
    rows.push({
      key: "profit",
      fact: { en: `${read.reported} recent reports`, bn: `সাম্প্রতিক ${read.reported}টি প্রতিবেদন` },
      ask: { en: "Is profit rising or falling across the sector?", bn: "পুরো সেক্টরে মুনাফা বাড়ছে না কমছে?" },
      hint: { en: "How many did better than a year ago, and how many did worse.", bn: "কতটি এক বছর আগের চেয়ে ভালো করেছে, কতটি খারাপ।" },
    });
  }
  if (read.flow) {
    rows.push({
      key: "money",
      fact: { en: `${s.company_count} companies trading`, bn: `${s.company_count}টি কোম্পানির লেনদেন` },
      ask: { en: "Is money moving into this sector, or out?", bn: "টাকা এই সেক্টরে ঢুকছে, নাকি বেরিয়ে যাচ্ছে?" },
      hint: { en: "Its share of all DSE trading, the last 4 weeks against the 4 before.", bn: "ডিএসইর মোট লেনদেনে এর অংশ, গত 4 সপ্তাহ বনাম তার আগের 4 সপ্তাহ।" },
    });
  }
  const goodPlus = (s.tier_counts?.excellent ?? 0) + (s.tier_counts?.good ?? 0);
  if (read.best && goodPlus > 0) {
    rows.push({
      key: "best",
      fact: { en: `${goodPlus} graded Good or better`, bn: `${goodPlus}টির গ্রেড ভালো বা তার বেশি` },
      tone: "good",
      ask: { en: "Which one is the best value today?", bn: "আজ কোনটি সবচেয়ে ভালো দামে?" },
      hint: { en: "The highest graded company at a low price for its profit.", bn: "মুনাফার তুলনায় কম দামে থাকা সবচেয়ে ভালো গ্রেডের কোম্পানি।" },
    });
  }
  if (read.lines.some((l) => l.key === "price")) {
    rows.push({
      key: "price",
      fact: { en: "Price against the market", bn: "বাজারের সঙ্গে দামের তুলনা" },
      ask: { en: "Is the sector cheap or dear right now?", bn: "সেক্টরটি এখন সস্তা না দামি?" },
      hint: { en: "In years of profit, against the whole market.", bn: "বছরের মুনাফার হিসাবে, পুরো বাজারের তুলনায়।" },
    });
  }
  return rows;
}
