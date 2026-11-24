"use client";

import { useMemo, useState } from "react";
import Link from "@/components/ui/Link";
import ListView from "@/components/lists/ListView";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";
import { dayWords, type AuditItem, type AuditorTracker } from "@/lib/research-reports";
import { SORT_NAME, SORT_PRICE, asTier, withQuote, type FigTone, type ListRow, type ListSort, type Quotes } from "@/lib/lists";
import { Bar, RrSection, ShowMore } from "./parts";

const SECTORS_SHOWN = 8;

const SORTS: ListSort[] = [
  { id: "worst", label: { en: "Worst first", bn: "সবচেয়ে খারাপটি আগে" }, dir: "asc" },
  { id: "posted", label: { en: "Newest report first", bn: "নতুন প্রতিবেদন আগে" }, dir: "desc" },
  SORT_PRICE,
  SORT_NAME,
];

/** The key figure: how serious the auditor's warning is, in one or two words. */
const GROUP_FIG: Record<string, { en: string; bn: string; tone: FigTone }> = {
  going_concern: { en: "May not keep running", bn: "চালু থাকা নিয়ে সন্দেহ", tone: "negative" },
  serious: { en: "Serious", bn: "গুরুতর", tone: "negative" },
  minor: { en: "Smaller", bn: "ছোট", tone: "watch" },
  unknown: { en: "Not readable", bn: "পড়া যায়নি", tone: "" },
};

/** The auditor report's body (Premium): the reasons and the sectors as the
 *  top card, then every company in THE list view (2026-11-25), grouped by how
 *  serious its auditor's warning is; a tap opens the auditor's own words. */
export default function AuditorView({ data, quotes }: { data: AuditorTracker; quotes?: Quotes | null }) {
  return (
    <PersonalCodesProvider>
      <Inner data={data} quotes={quotes} />
    </PersonalCodesProvider>
  );
}

function Inner({ data, quotes }: { data: AuditorTracker; quotes?: Quotes | null }) {
  const groupByKey = useMemo(() => new Map(data.groups.map((g, i) => [g.key, { g, i }] as const)), [data.groups]);
  const rows = useMemo<ListRow<AuditItem>[]>(
    () =>
      data.groups.flatMap((g, gi) =>
        g.items.map((i, k) =>
          withQuote(
            {
              code: i.code,
              name: i.name,
              sector: i.sector,
              tier: asTier(i.tier),
              fig: { ...GROUP_FIG[i.group], words: true },
              sort: { worst: gi * 10000 + k, posted: i.posted },
              tags: [i.group],
              isNew: i.new,
              data: i,
            },
            quotes,
          ),
        ),
      ),
    [data.groups, quotes],
  );
  const serious = data.reasons.filter((r) => r.serious);
  const minor = data.reasons.filter((r) => !r.serious);
  const top = Math.max(1, ...data.reasons.map((r) => r.n));

  return (
    <>
      <RrSection
        id="rr-reasons"
        title={<T en="Why the auditors objected" bn="নিরীক্ষকেরা কেন আপত্তি তুলেছেন" />}
        lead={
          <T
            en="One company can have more than one reason. The serious ones can change what a company is worth."
            bn="একটি কোম্পানির একাধিক কারণ থাকতে পারে। গুরুতর কারণগুলো কোম্পানির মূল্য বদলে দিতে পারে।"
          />
        }
      >
        <div className="rr-card rr-reasons">
          {serious.length > 0 && <ReasonBlock title={{ en: "Serious reasons", bn: "গুরুতর কারণ" }} rows={serious} top={top} tone="negative" />}
          {minor.length > 0 && <ReasonBlock title={{ en: "Smaller reasons", bn: "ছোট কারণ" }} rows={minor} top={top} tone="watch" />}
        </div>
      </RrSection>

      <SectorBlock data={data} />

      <RrSection
        id="rr-auditor-list"
        title={<T en="All companies, worst first" bn="সব কোম্পানি, সবচেয়ে খারাপটি আগে" />}
        lead={
          <T
            en="Each company's newest auditor's report. Tap a name for its full analysis."
            bn="প্রতিটি কোম্পানির সর্বশেষ নিরীক্ষক প্রতিবেদন। পুরো বিশ্লেষণ দেখতে নামে চাপুন।"
          />
        }
      >
        <ListView
          id="auditors"
          track="report-auditors"
          rows={rows}
          figHead={{ en: "How serious", bn: "কতটা গুরুতর" }}
          sorts={SORTS}
          defaultSort="worst"
          chips={data.groups.map((g) => ({ id: g.key, label: g.title }))}
          mineChip
          sync
          groupOf={(r) => {
            const hit = groupByKey.get(r.data!.group);
            return hit ? { id: hit.g.key, title: hit.g.title, line: hit.g.means } : null;
          }}
          renderLines={(r) => <AuditLines item={r.data!} />}
          renderOpen={(r) => <AuditOpen item={r.data!} />}
        />
      </RrSection>
    </>
  );
}

function ReasonBlock({ title, rows, top, tone }: {
  title: { en: string; bn: string };
  rows: AuditorTracker["reasons"];
  top: number;
  tone: "negative" | "watch";
}) {
  return (
    <div className="rr-reason-block">
      <p className="rr-week-k">
        <span className={`rr-dot ${tone === "negative" ? "rr-dot--red" : "rr-dot--amber"}`} aria-hidden="true" />
        <T en={title.en} bn={title.bn} />
      </p>
      <ul className="rr-bars">
        {rows.map((r) => (
          <li key={r.key}>
            <span className="rr-bars-top">
              <span className="rr-first-up">
                <T en={r.en} bn={r.bn} />
              </span>
              <span className="nums rr-bars-n">
                <T en={`${r.n} compan${r.n === 1 ? "y" : "ies"}`} bn={`${r.n}টি কোম্পানি`} />
              </span>
            </span>
            <Bar n={r.n} of={top} tone={tone} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectorBlock({ data }: { data: AuditorTracker }) {
  const [open, setOpen] = useState(false);
  const rows = data.sectors.filter((r) => r.of);
  const shown = open ? rows : rows.slice(0, SECTORS_SHOWN);
  if (rows.length === 0) return null;
  return (
    <RrSection
      id="rr-sectors"
      title={<T en="By sector" bn="সেক্টর অনুযায়ী" />}
      lead={<T en="How many companies in each sector got such a report." bn="প্রতিটি সেক্টরের কতগুলো কোম্পানি এমন প্রতিবেদন পেয়েছে।" />}
    >
      <ul className="rr-card rr-bars rr-bars--card">
        {shown.map((r) => (
          <li key={r.sector}>
            <span className="rr-bars-top">
              <span>
                <T en={r.sector} bn={sectorBn(r.sector)} />
              </span>
              <span className="nums rr-bars-n">
                <T en={`${r.n} of ${r.of}`} bn={`${r.of}টির মধ্যে ${r.n}টি`} />
              </span>
            </span>
            <Bar n={r.n} of={r.of ?? r.n} tone="ink" />
          </li>
        ))}
      </ul>
      <ShowMore open={open} total={rows.length} shown={SECTORS_SHOWN} onToggle={() => setOpen((v) => !v)} />
    </RrSection>
  );
}

/** Under the company: which accounts, when, and what the auditor pointed to. */
function AuditLines({ item: i }: { item: AuditItem }) {
  const posted = dayWords(i.posted);
  const reasonsEn = joinWords(i.reasons.map((r) => r.en), "and");
  const reasonsBn = joinWords(i.reasons.map((r) => r.bn), "আর");
  return (
    <span className="lv-lines">
      <span className="lv-line">
        {i.year ? (
          <T en={`Accounts for ${i.year}, posted ${posted.en}.`} bn={`${i.year} সালের হিসাব, প্রকাশ ${posted.bn}।`} />
        ) : (
          <T en={`Posted ${posted.en}.`} bn={`প্রকাশ ${posted.bn}।`} />
        )}{" "}
        {i.reasons.length > 0 ? (
          <T en={`The auditor pointed to ${reasonsEn}.`} bn={`নিরীক্ষক দেখিয়েছেন: ${reasonsBn}।`} />
        ) : i.group === "going_concern" ? (
          <T en="The auditor doubts the company can keep running." bn="কোম্পানি চালু থাকতে পারবে কি না, নিরীক্ষক সন্দিহান।" />
        ) : null}
      </span>
      {i.earlier.length > 0 && (
        <span className="lv-line text-watch">
          <T
            en={`The auditor raised this on its ${i.earlier.join(", ")} accounts too.`}
            bn={`${i.earlier.join(", ")} সালের হিসাবেও নিরীক্ষক একই কথা বলেছিলেন।`}
          />
        </span>
      )}
    </span>
  );
}

/** A row opened: the auditor's own words, the PDF, and our analysis. */
function AuditOpen({ item: i }: { item: AuditItem }) {
  return (
    <div className="rr-open">
      {i.excerpt && (
        <>
          <p className="rr-open-k">
            <T en="In the auditor's own words" bn="নিরীক্ষকের নিজের ভাষায়" />
          </p>
          <blockquote lang="en" className="rr-quote">
            {i.excerpt}
          </blockquote>
        </>
      )}
      <div className="rr-open-acts">
        <Link href={`/stock/${encodeURIComponent(i.code)}#an-safety`} className="btn-primary btn-sm">
          <T en="Read our analysis" bn="আমাদের বিশ্লেষণ পড়ুন" />
        </Link>
        {i.url && (
          <a href={i.url} target="_blank" rel="noopener noreferrer" className="btn-quiet btn-sm">
            <T en="The auditor's report (PDF, in English)" bn="নিরীক্ষকের প্রতিবেদন (PDF, ইংরেজিতে)" />
          </a>
        )}
      </div>
    </div>
  );
}

function joinWords(words: string[], and: string): string {
  if (words.length <= 1) return words[0] ?? "";
  if (words.length === 2) return `${words[0]} ${and} ${words[1]}`;
  return `${words.slice(0, -1).join(", ")} ${and} ${words[words.length - 1]}`;
}
