"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ownershipCaption, ownershipChangeInfo, type Bi } from "@/lib/plain-language";
import type { CompanyDetail } from "@/lib/api";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/stock/SectionTitle";
import { CHART } from "@/lib/chart-theme";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

interface Props {
  shareholding: Record<string, unknown> | null;
  previous?: Record<string, unknown> | null;
  /** Backend's bilingual read (services/stock_facts.py) — government control,
   *  sponsor-only "insiders buying", big-jump checks. Falls back to the local helpers. */
  ownership?: CompanyDetail["ownership"];
}

const CATEGORIES = [
  // Categorical palette from the design tokens — no market semantics implied.
  { key: "sponsor_director_pct", en: "Sponsors and directors", bn: "উদ্যোক্তা-পরিচালক", color: "var(--primary)",   deltaMatters: true },
  { key: "govt_pct",             en: "Government",             bn: "সরকার",            color: "var(--navy-soft)", deltaMatters: false },
  { key: "institute_pct",        en: "Institutions",           bn: "প্রতিষ্ঠান",          color: "var(--info)",      deltaMatters: true },
  { key: "foreign_pct",          en: "Foreign investors",      bn: "বিদেশি বিনিয়োগকারী",  color: "var(--warm)",      deltaMatters: true },
  { key: "public_pct",           en: "General public",         bn: "সাধারণ বিনিয়োগকারী",   color: "var(--gold-soft)", deltaMatters: false },
];

const MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

function monthYear(iso: unknown): Bi | null {
  if (typeof iso !== "string" || !iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    en: d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
    bn: `${MONTHS_BN[d.getMonth()]} ${d.getFullYear()}`,
  };
}

export default function ShareholdingPie({ shareholding, previous = null, ownership = null }: Props) {
  const { bn: isBn } = useLang();
  if (!shareholding) return null;

  const data = CATEGORIES
    .map((c) => ({ name: isBn ? c.bn : c.en, value: Number(shareholding[c.key] ?? 0), color: c.color }))
    .filter((d) => d.value > 0);

  if (data.length === 0) return null;

  const asOf = monthYear(shareholding.as_of_date);
  const prevAsOf = previous ? monthYear(previous.as_of_date) : null;

  let caption: Bi | null;
  let change: { caption: Bi; tone: string } | null;
  if (ownership) {
    caption = ownership.caption ? { en: ownership.caption.en, bn: ownership.caption.bn } : null;
    change = ownership.change
      ? { caption: { en: ownership.change.en, bn: ownership.change.bn }, tone: ownership.change.tone }
      : null;
  } else {
    caption = ownershipCaption(Number(shareholding.sponsor_director_pct ?? 0));
    change = ownershipChangeInfo(shareholding, previous ?? null, prevAsOf);
  }
  const changeColor = change?.tone === "positive" ? "var(--positive)" : "var(--watch)";

  const deltaFor = (key: string, deltaMatters: boolean): number | null => {
    if (!previous || !deltaMatters) return null;
    const now = Number(shareholding[key]);
    const before = Number(previous[key]);
    if (!Number.isFinite(now) || !Number.isFinite(before)) return null;
    const d = now - before;
    return Math.abs(d) >= 0.3 ? d : null;
  };

  return (
    <section className="mb-8">
      <SectionTitle
        title={<T en="Who owns the company" bn="কোম্পানির মালিক কারা" />}
        sub={
          <T
            en={`Who holds the shares, and how much of their own money the people running it have invested.${
              asOf ? ` As of ${asOf.en}${prevAsOf ? `, compared with ${prevAsOf.en}` : ""}.` : ""
            }`}
            bn={`কারা শেয়ার ধরে আছেন, আর কোম্পানি যাঁরা চালান তাঁদের নিজেদের কত টাকা এতে আছে।${
              asOf ? ` ${asOf.bn}-এর হিসাব${prevAsOf ? `, ${prevAsOf.bn}-এর সঙ্গে তুলনা` : ""}।` : ""
            }`}
          />
        }
      />

      <Card padding="none" className="rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
          <div className="shrink-0">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  strokeWidth={0}
                  isAnimationActive={true}
                  animationDuration={500}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART.tooltip.contentStyle}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 w-full space-y-3">
            {CATEGORIES.map((c) => {
              const val = Number(shareholding[c.key] ?? 0);
              if (val <= 0) return null;
              const delta = deltaFor(c.key, c.deltaMatters);
              return (
                <div key={c.key} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="text-sm flex-1 min-w-0 text-text-muted">
                    <T en={c.en} bn={c.bn} />
                  </span>
                  {delta != null && (
                    <span
                      className="text-xs font-bold tabular-nums nums px-1.5 py-0.5 rounded-full"
                      title={
                        isBn
                          ? prevAsOf
                            ? `${prevAsOf.bn}-এর পর থেকে পরিবর্তন`
                            : "আগের প্রতিবেদনের পর থেকে পরিবর্তন"
                          : prevAsOf
                            ? `Change since ${prevAsOf.en}`
                            : "Change since the previous report"
                      }
                      style={{
                        color: delta > 0 ? "var(--positive)" : "var(--negative)",
                        background: delta > 0 ? "rgba(21,128,61,0.1)" : "rgba(220,38,38,0.1)",
                      }}
                    >
                      {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
                    </span>
                  )}
                  <span className="text-sm font-bold tabular-nums nums w-14 text-right" style={{ color: c.color }}>
                    {val.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {change && (
          <p
            className="text-sm mt-5 leading-snug font-medium rounded-xl px-3 py-2.5"
            style={{
              color: changeColor,
              background: change.tone === "positive" ? "rgba(21,128,61,0.07)" : "rgba(180,83,9,0.08)",
              border: `1px solid ${change.tone === "positive" ? "rgba(21,128,61,0.2)" : "rgba(180,83,9,0.25)"}`,
            }}
          >
            <T en={change.caption.en} bn={change.caption.bn} />
          </p>
        )}

        {caption && (
          <p className="text-sm mt-4 leading-snug" style={{ color: "var(--text-muted)" }}>
            <T en={caption.en} bn={caption.bn} />
          </p>
        )}
      </Card>
    </section>
  );
}
