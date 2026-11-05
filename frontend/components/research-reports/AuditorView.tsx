"use client";

import { useMemo, useState } from "react";
import Chip from "@/components/ui/Chip";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";
import { dayWords, type AuditItem, type AuditorTracker } from "@/lib/research-reports";
import { Bar, CompanyMeta, CompanyName, RrSection, ShowMore, useMine } from "./parts";

const SHOWN = 8;
const SECTORS_SHOWN = 8;

const TONE: Record<string, "negative" | "watch" | "ink"> = {
  going_concern: "negative",
  serious: "negative",
  minor: "watch",
  unknown: "ink",
};

/** The auditor report's body (Premium): the reasons, the sectors, then every
 *  company by how serious its auditor's warning is. */
export default function AuditorView({ data }: { data: AuditorTracker }) {
  return (
    <PersonalCodesProvider>
      <Inner data={data} />
    </PersonalCodesProvider>
  );
}

function Inner({ data }: { data: AuditorTracker }) {
  const mine = useMine();
  const [onlyMine, setOnlyMine] = useState(false);
  const mineCount = useMemo(
    () => data.groups.reduce((a, g) => a + g.items.filter((i) => mine.has(i.code)).length, 0),
    [data.groups, mine],
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
        {mineCount > 0 && (
          <div className="rr-chips" role="group" aria-label="Filter">
            <Chip active={!onlyMine} onClick={() => setOnlyMine(false)}>
              <T en={`All · ${data.companies}`} bn={`সব · ${data.companies}`} />
            </Chip>
            <Chip active={onlyMine} onClick={() => setOnlyMine(true)}>
              <T en={`Your shares · ${mineCount}`} bn={`আপনার শেয়ার · ${mineCount}`} />
            </Chip>
          </div>
        )}
        {data.groups.map((g) => {
          const rows = onlyMine ? g.items.filter((i) => mine.has(i.code)) : g.items;
          if (rows.length === 0) return null;
          return <GroupCard key={g.key} group={g} rows={rows} />;
        })}
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

function GroupCard({ group, rows }: { group: AuditorTracker["groups"][number]; rows: AuditItem[] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? rows : rows.slice(0, SHOWN);
  const tone = TONE[group.key];
  return (
    <div className={`rr-group rr-group--${tone}`}>
      <div className="rr-group-head">
        <h3 className="rr-h3">
          <T en={group.title.en} bn={group.title.bn} />
          <span className="rr-group-n nums">{rows.length}</span>
        </h3>
        <p className="rr-group-m">
          <T en={group.means.en} bn={group.means.bn} />
        </p>
      </div>
      <ul className="rr-card rr-list">
        {shown.map((i) => (
          <AuditRow key={i.code} item={i} />
        ))}
      </ul>
      <ShowMore open={open} total={rows.length} shown={SHOWN} onToggle={() => setOpen((v) => !v)} />
    </div>
  );
}

function AuditRow({ item: i }: { item: AuditItem }) {
  const posted = dayWords(i.posted);
  const reasonsEn = joinWords(i.reasons.map((r) => r.en), "and");
  const reasonsBn = joinWords(i.reasons.map((r) => r.bn), "আর");
  return (
    <li className="rr-co">
      <div className="rr-co-head">
        <CompanyName code={i.code} name={i.name} hash="#an-safety" />
        {i.new && (
          <span className="rr-new">
            <T en="New" bn="নতুন" />
          </span>
        )}
      </div>
      <CompanyMeta sector={i.sector} tier={i.tier} />
      <p className="rr-co-line">
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
      </p>
      {i.earlier.length > 0 && (
        <p className="rr-co-line rr-co-line--watch">
          <T
            en={`The auditor raised this on its ${i.earlier.join(", ")} accounts too.`}
            bn={`${i.earlier.join(", ")} সালের হিসাবেও নিরীক্ষক একই কথা বলেছিলেন।`}
          />
        </p>
      )}
      {(i.excerpt || i.url) && (
        <details className="rr-words">
          <summary>
            <T en="In the auditor's own words" bn="নিরীক্ষকের নিজের ভাষায়" />
          </summary>
          {i.excerpt && (
            <blockquote lang="en" className="rr-quote">
              {i.excerpt}
            </blockquote>
          )}
          {i.url && (
            <a href={i.url} target="_blank" rel="noopener noreferrer" className="rr-pdf">
              <T en="Read the auditor's full report (PDF, in English)" bn="নিরীক্ষকের পুরো প্রতিবেদন পড়ুন (PDF, ইংরেজিতে)" />
            </a>
          )}
        </details>
      )}
    </li>
  );
}

function joinWords(words: string[], and: string): string {
  if (words.length <= 1) return words[0] ?? "";
  if (words.length === 2) return `${words[0]} ${and} ${words[1]}`;
  return `${words.slice(0, -1).join(", ")} ${and} ${words[words.length - 1]}`;
}
