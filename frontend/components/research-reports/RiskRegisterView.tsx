"use client";

import { useMemo, useState } from "react";
import ListView from "@/components/lists/ListView";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";
import { dayWords, type RiskChange, type RiskItem, type RiskRegister } from "@/lib/research-reports";
import { SORT_NAME, SORT_PRICE, asTier, withQuote, type ListRow, type ListSort, type Quotes } from "@/lib/lists";
import { Bar, CompanyName, RrSection } from "./parts";

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);

const SORTS: ListSort[] = [
  { id: "n", label: { en: "Most problems first", bn: "সবচেয়ে বেশি সমস্যা আগে" }, dir: "desc" },
  SORT_PRICE,
  SORT_NAME,
];

type CloseZ = RiskRegister["close_to_z"][number];

/** The register's body (Premium): this week and the kinds as the list's top
 *  card, then every company in THE list view (2026-11-25, step 4 of the
 *  simplify review: a report opens like every list), then who is close to
 *  the Z category, in the same view. */
export default function RiskRegisterView({ data, quotes }: { data: RiskRegister; quotes?: Quotes | null }) {
  return (
    <PersonalCodesProvider>
      <Inner data={data} quotes={quotes} />
    </PersonalCodesProvider>
  );
}

function Inner({ data, quotes }: { data: RiskRegister; quotes?: Quotes | null }) {
  const [kind, setKind] = useState<string>("");

  const rows = useMemo<ListRow<RiskItem>[]>(
    () =>
      data.items.map((i) =>
        withQuote(
          {
            code: i.code,
            name: i.name,
            sector: i.sector,
            tier: asTier(i.tier),
            price: i.price,
            fig: {
              en: `${i.problems.length} ${s(i.problems.length, "problem", "problems")}`,
              bn: `${i.problems.length}টি সমস্যা`,
              tone: i.problems.length > 1 ? "negative" : "",
              words: true,
            },
            sort: { n: i.problems.length },
            tags: i.problems.map((p) => p.key),
            hash: "#an-safety",
            data: i,
          },
          quotes,
        ),
      ),
    [data.items, quotes],
  );
  const zRows = useMemo<ListRow<CloseZ>[]>(
    () =>
      data.close_to_z.map((z) =>
        withQuote(
          {
            code: z.code,
            name: z.name,
            sector: z.sector,
            fig: z.level === "red"
              ? { en: "Very close", bn: "খুব কাছে", tone: "negative", words: true }
              : { en: "Close", bn: "কাছে", tone: "watch", words: true },
            sort: { lv: z.level === "red" ? 2 : 1 },
            hash: "#an-safety",
            data: z,
          },
          quotes,
        ),
      ),
    [data.close_to_z, quotes],
  );

  const pick = (k: string) => {
    setKind(k);
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
              <button type="button" className="rr-kind" aria-pressed={kind === k.key} onClick={() => pick(k.key)}>
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
        <ListView
          id="risks"
          track="report-risks"
          rows={rows}
          figHead={{ en: "Serious problems", bn: "গুরুতর সমস্যা" }}
          sorts={SORTS}
          defaultSort="n"
          chips={data.kinds.map((k) => ({ id: k.key, label: k.title }))}
          chipCounts
          chipValue={kind}
          onChipChange={setKind}
          mineChip
          sync
          renderLines={(r) => (
            <span className="lv-lines">
              {r.data!.problems.map((p) => (
                <span key={p.key} className="lv-line">
                  <span className="lv-dot lv-dot--red" aria-hidden="true" />
                  <b><T en={p.title.en} bn={p.title.bn} /></b>{" "}
                  <T en={p.en} bn={p.bn} />
                </span>
              ))}
            </span>
          )}
          empty={{
            title: { en: "No company here", bn: "এখানে কোনো কোম্পানি নেই" },
            message: { en: "None of these companies fits your choices. Pick another kind, sector or price.", bn: "আপনার বাছাইয়ে কোনো কোম্পানি মেলেনি। অন্য ধরন, সেক্টর বা দাম বাছুন।" },
          }}
        />
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
          <ListView
            id="close-z"
            rows={zRows}
            figHead={{ en: "How close", bn: "কতটা কাছে" }}
            sorts={[{ id: "lv", label: { en: "Closest first", bn: "সবচেয়ে কাছেরটি আগে" }, dir: "desc" }, SORT_PRICE, SORT_NAME]}
            defaultSort="lv"
            renderLines={(r) => (
              <span className="lv-lines">
                {r.data!.reasons.map((x) => (
                  <span key={x.en} className="lv-line">
                    <span className={`lv-dot ${x.level === "red" ? "lv-dot--red" : "lv-dot--amber"}`} aria-hidden="true" />
                    <T en={x.en} bn={x.bn} />
                  </span>
                ))}
              </span>
            )}
          />
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
