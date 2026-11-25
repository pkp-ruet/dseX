import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import type { HomeToday } from "@/lib/api";
import { RESULT_LEVEL, RESULT_LEVEL_ORDER } from "@/lib/results";
import { PAGE_ICON } from "@/components/places/pageIcons";
import { IconChevronRight, IconCrown } from "@/components/ui/icons";

type Bi = { en: string; bn: string };

interface Row {
  key: string;
  href: string;
  title: Bi;
  line: Bi;
  big: number;
  unit: Bi;
  crown: boolean;
}

/** "ROBI, SQURPHARMA, EBL and 8 more". */
function namesLine(codes: string[], total: number): Bi {
  const rest = total - codes.length;
  const list = codes.join(", ");
  if (rest <= 0) return { en: list, bn: list };
  return { en: `${list} and ${rest} more`, bn: `${list} এবং আরও ${rest}টি` };
}

/**
 * "Today's lists" (2026-11-25, the fuller home, addition D): three rows, each
 * one big number that changes daily and one line, each opening its page — so
 * a reader sees that something moved before they tap. The Buy List (the third
 * place readers go from the home), the strongest companies (the ranking's top
 * three and who climbed most this week) and results posted in the last 7
 * days (how many better or weaker, how many are the reader's own).
 *
 * Free / Premium: the Buy List's names are Premium, so a reader without it
 * sees the count, who joined this week and today's free share by name; the
 * page sells the rest. No lock line here (the home keeps one Premium card).
 * No hooks: the guest home renders it on the server.
 */
export default function TodaysLists({
  lang,
  data,
  mine,
  premium,
}: {
  lang: Lang;
  data: HomeToday | null | undefined;
  /** The reader's own codes (held ∪ watched), for "2 are your shares". */
  mine?: ReadonlySet<string>;
  /** Sees the Buy List's names (Premium or admin). */
  premium: boolean;
}) {
  const bn = lang === "bn";
  const pick = (b: Bi) => (bn ? b.bn : b.en);
  const rows: Row[] = [];

  const bl = data?.buy_list;
  if (bl) {
    const joined: Bi | null = bl.week_joined > 0
      ? { en: `${bl.week_joined} joined this week`, bn: `এ সপ্তাহে ${bl.week_joined}টি যোগ হয়েছে` }
      : null;
    let line: Bi;
    if (bl.count === 0) {
      line = { en: "No share passed all five questions at the last close.", bn: "গত কার্যদিবসে কোনো শেয়ার পাঁচটি প্রশ্নের সবগুলোতে উতরায়নি।" };
    } else if (premium && bl.top.length) {
      const names = namesLine(bl.top.map((t) => t.code), bl.count);
      line = joined ? { en: `${names.en} · ${joined.en}`, bn: `${names.bn} · ${joined.bn}` } : names;
    } else {
      const free: Bi | null = bl.free_pick
        ? { en: `Free today: ${bl.free_pick.code}`, bn: `আজ ফ্রি: ${bl.free_pick.code}` }
        : null;
      const parts = [joined, free].filter(Boolean) as Bi[];
      line = parts.length
        ? { en: parts.map((p) => p.en).join(" · "), bn: parts.map((p) => p.bn).join(" · ") }
        : { en: "The shares we would buy today", bn: "আজ আমরা যে শেয়ারগুলো কিনতাম" };
    }
    rows.push({
      key: "buylist",
      href: "/buy-list",
      title: { en: "Buy List", bn: "কেনার তালিকা" },
      line,
      big: bl.count,
      unit: { en: bl.count === 1 ? "share" : "shares", bn: "শেয়ার" },
      crown: !premium,
    });
  }

  const rk = data?.ranking;
  if (rk && rk.top.length) {
    const top = rk.top.map((t) => `${t.rank} ${t.code}`).join(" · ");
    const c = rk.climbers[0];
    const climb: Bi | null = c
      ? {
          en: `${c.code} climbed ${c.places} ${c.places === 1 ? "place" : "places"} this week`,
          bn: `${c.code} এ সপ্তাহে ${c.places} ধাপ উঠেছে`,
        }
      : null;
    rows.push({
      key: "companies",
      href: "/dsestockranking",
      title: { en: "Strongest companies", bn: "সবচেয়ে শক্তিশালী কোম্পানি" },
      line: climb ? { en: `${top}. ${climb.en}.`, bn: `${top}। ${climb.bn}।` } : { en: top, bn: top },
      big: rk.total,
      unit: { en: "ranked", bn: "কোম্পানি" },
      crown: false,
    });
  }

  const rs = data?.results;
  if (rs) {
    let line: Bi;
    if (rs.total === 0) {
      line = { en: "None posted in the last 7 days. See the latest reports.", bn: "গত 7 দিনে কোনো ফল আসেনি। সর্বশেষ রিপোর্টগুলো দেখুন।" };
    } else {
      const parts: Bi[] = RESULT_LEVEL_ORDER.filter((k) => (rs.levels[k] ?? 0) > 0).map((k) => ({
        en: `${rs.levels[k]} ${RESULT_LEVEL[k].short.toLowerCase()}`,
        bn: `${rs.levels[k]}টি ${RESULT_LEVEL[k].shortBn}`,
      }));
      const yours = mine ? rs.codes.filter((c) => mine.has(c.toUpperCase())).length : 0;
      if (yours > 0) {
        parts.push({
          en: `${yours} ${yours === 1 ? "is your share" : "are your shares"}`,
          bn: `${yours}টি আপনার শেয়ার`,
        });
      }
      line = { en: parts.map((p) => p.en).join(" · "), bn: parts.map((p) => p.bn).join(" · ") };
    }
    rows.push({
      key: "results",
      href: "/results",
      title: { en: "Results this week", bn: "এ সপ্তাহের আর্থিক ফল" },
      line,
      big: rs.total,
      unit: { en: rs.total === 1 ? "report" : "reports", bn: "রিপোর্ট" },
      crown: false,
    });
  }

  if (rows.length === 0) return null;

  return (
    <section className={`hm-lists ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="lists">
      <div className="hm-head">
        <h2 className="hm-head-h">{bn ? "আজকের তালিকা" : "Today's lists"}</h2>
      </div>
      <ul className="hm-tcard hm-tl">
        {rows.map((r) => {
          const Icon = PAGE_ICON[r.key];
          return (
            <li key={r.key}>
              <Link href={r.href} className="hm-tl-row" data-card={`lists-${r.key}`}>
                <span className="hm-tl-ic" aria-hidden>
                  {Icon && <Icon size={20} />}
                  {r.crown && (
                    <span className="hm-sc-crown">
                      <IconCrown size={10} />
                    </span>
                  )}
                </span>
                <span className="hm-tl-txt">
                  <span className="hm-tl-t">{pick(r.title)}</span>
                  <span className="hm-tl-s">{pick(r.line)}</span>
                </span>
                <span className="hm-tl-num">
                  <span className="hm-tl-big nums">{r.big}</span>
                  <span className="hm-tl-u">{pick(r.unit)}</span>
                </span>
                <span className="hm-chev" aria-hidden>
                  <IconChevronRight size={16} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
