"use client";

import { useMemo, useState } from "react";
import Chip from "@/components/ui/Chip";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";
import { dayWords, type RiskChange, type RiskRegister } from "@/lib/research-reports";
import { Bar, CompanyMeta, CompanyName, RrSection, ShowMore, useMine } from "./parts";

const SHOWN = 15;
const s = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** The register's body (Premium): this week, the kinds, every company,
 *  and who is close to the Z category. */
export default function RiskRegisterView({ data }: { data: RiskRegister }) {
  return (
    <PersonalCodesProvider>
      <Inner data={data} />
    </PersonalCodesProvider>
  );
}

function Inner({ data }: { data: RiskRegister }) {
  const mine = useMine();
  const [kind, setKind] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const mineItems = useMemo(() => data.items.filter((i) => mine.has(i.code)), [data.items, mine]);
  const items = useMemo(() => {
    if (kind === "mine") return mineItems;
    if (kind === "all") return data.items;
    return data.items.filter((i) => i.problems.some((p) => p.key === kind));
  }, [data.items, kind, mineItems]);
  const shown = open ? items : items.slice(0, SHOWN);

  const pick = (k: string) => {
    setKind(k);
    setOpen(false);
    document.getElementById("rr-companies")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <WeekCard week={data.week} />

      <RrSection
        id="rr-kinds"
        title={<T en="Types of problems" bn="কী ধরনের সমস্যা" />}
        lead={
          <T
            en={`${data.flagged} of ${data.universe} graded companies have at least one of these. Tap one to see who.`}
            bn={`রেটিং পাওয়া ${data.universe}টির মধ্যে ${data.flagged}টি কোম্পানির অন্তত একটি সমস্যা আছে। কারা, দেখতে একটিতে চাপুন।`}
          />
        }
      >
        <ul className="rr-card rr-kinds">
          {data.kinds.map((k) => (
            <li key={k.key}>
              <button type="button" className="rr-kind" onClick={() => pick(k.key)}>
                <span className="rr-kind-top">
                  <b>
                    <T en={k.title.en} bn={k.title.bn} />
                  </b>
                  <span className="rr-kind-n nums">{k.n}</span>
                </span>
                <Bar n={k.n} of={data.flagged} tone="negative" />
                <span className="rr-kind-m">
                  <T en={k.means.en} bn={k.means.bn} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </RrSection>

      <RrSection
        id="rr-companies"
        title={<T en="All companies" bn="সব কোম্পানি" />}
        lead={
          <T
            en={`Companies with the most problems come first. ${data.two_or_more} have two or more.`}
            bn={`সবচেয়ে বেশি সমস্যার কোম্পানি আগে। ${data.two_or_more}টির দুই বা তার বেশি সমস্যা আছে।`}
          />
        }
      >
        <div className="rr-chips" role="group" aria-label="Filter">
          <Chip active={kind === "all"} onClick={() => pick("all")}>
            <T en={`All · ${data.flagged}`} bn={`সব · ${data.flagged}`} />
          </Chip>
          {mineItems.length > 0 && (
            <Chip active={kind === "mine"} onClick={() => pick("mine")}>
              <T en={`Your shares · ${mineItems.length}`} bn={`আপনার শেয়ার · ${mineItems.length}`} />
            </Chip>
          )}
          {data.kinds.map((k) => (
            <Chip key={k.key} active={kind === k.key} onClick={() => pick(k.key)}>
              <T en={`${k.title.en} · ${k.n}`} bn={`${k.title.bn} · ${k.n}`} />
            </Chip>
          ))}
        </div>

        <ul className="rr-card rr-list">
          {shown.map((i) => (
            <li key={i.code} className="rr-co">
              <div className="rr-co-head">
                <CompanyName code={i.code} name={i.name} hash="#an-safety" />
                <span className={`rr-count${i.problems.length > 1 ? " rr-count--many" : ""}`}>
                  <T
                    en={`${i.problems.length} problem${s(i.problems.length, "", "s")}`}
                    bn={`${i.problems.length}টি সমস্যা`}
                  />
                </span>
              </div>
              <CompanyMeta sector={i.sector} tier={i.tier} />
              <ul className="rr-probs">
                {i.problems.map((p) => (
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
            </li>
          ))}
          {items.length === 0 && (
            <li className="rr-empty">
              <T en="None of your shares are on the list." bn="আপনার কোনো শেয়ার এই তালিকায় নেই।" />
            </li>
          )}
        </ul>
        <ShowMore open={open} total={items.length} shown={SHOWN} onToggle={() => setOpen((v) => !v)} />
      </RrSection>

      {data.close_to_z.length > 0 && (
        <RrSection
          id="rr-close-z"
          title={<T en="Close to the Z category" bn="Z ক্যাটাগরির কাছাকাছি" />}
          lead={
            <T
              en="Not in Z yet, but they show the signs that come before it."
              bn="এখনো Z-এ নেই, কিন্তু Z-এ যাওয়ার আগের লক্ষণ দেখা যাচ্ছে।"
            />
          }
        >
          <ul className="rr-card rr-list">
            {data.close_to_z.map((z) => (
              <li key={z.code} className="rr-co">
                <div className="rr-co-head">
                  <CompanyName code={z.code} name={z.name} hash="#an-safety" />
                </div>
                <CompanyMeta sector={z.sector} />
                <ul className="rr-probs">
                  {z.reasons.map((r) => (
                    <li key={r.en}>
                      <span className={`rr-dot ${r.level === "red" ? "rr-dot--red" : "rr-dot--amber"}`} aria-hidden="true" />
                      <span className="min-w-0">
                        <T en={r.en} bn={r.bn} />
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </RrSection>
      )}
    </>
  );
}

function WeekCard({ week }: { week: RiskRegister["week"] }) {
  if (!week.since) return null;
  const since = dayWords(week.since, false);
  const skipped = week.skipped.map((d) => dayWords(d, false));
  return (
    <RrSection
      id="rr-week"
      title={<T en="This week" bn="এই সপ্তাহে" />}
      lead={<T en={`Since ${since.en}.`} bn={`${since.bn} থেকে।`} />}
    >
      <div className="rr-card rr-week">
        <ChangeCol tone="red" rows={week.added} title={{ en: "New problems", bn: "নতুন সমস্যা" }}
          empty={{ en: "No new problems this week.", bn: "এই সপ্তাহে নতুন কোনো সমস্যা নেই।" }} />
        <ChangeCol tone="green" rows={week.fixed} title={{ en: "Problems gone", bn: "যে সমস্যা মিটেছে" }}
          empty={{ en: "No problem went away this week.", bn: "এই সপ্তাহে কোনো সমস্যা মেটেনি।" }} />
      </div>
      {skipped.length > 0 && (
        <p className="rr-fine">
          <T
            en={`On ${skipped.map((d) => d.en).join(", ")} our checks themselves changed, so moves from that day are left out.`}
            bn={`${skipped.map((d) => d.bn).join(", ")} তারিখে আমাদের যাচাইয়ের নিয়ম বদলেছে, তাই সেদিনের পরিবর্তন বাদ রাখা হয়েছে।`}
          />
        </p>
      )}
    </RrSection>
  );
}

function ChangeCol({ tone, rows, title, empty }: {
  tone: "red" | "green";
  rows: RiskChange[];
  title: { en: string; bn: string };
  empty: { en: string; bn: string };
}) {
  return (
    <div className="rr-week-col">
      <p className="rr-week-k">
        <span className={`rr-dot ${tone === "red" ? "rr-dot--red" : "rr-dot--green"}`} aria-hidden="true" />
        <T en={title.en} bn={title.bn} />
        <span className="rr-week-n nums">{rows.length}</span>
      </p>
      {rows.length === 0 ? (
        <p className="rr-fine m-0">
          <T en={empty.en} bn={empty.bn} />
        </p>
      ) : (
        <ul className="rr-week-list">
          {rows.slice(0, 8).map((r) => (
            <li key={`${r.code}-${r.key}`}>
              <CompanyName code={r.code} name={r.name} hash="#an-safety" />
              <span className="rr-week-what">
                <T en={r.title.en} bn={r.title.bn} />
              </span>
            </li>
          ))}
          {rows.length > 8 && (
            <li className="rr-fine">
              <T en={`And ${rows.length - 8} more.`} bn={`আরও ${rows.length - 8}টি।`} />
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
