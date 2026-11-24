/**
 * The six wants on the Lists page (2026-11-25, user: "this page's main goal is
 * help user to find their next stock. how can we simplify this page", then
 * "Yes, build it" on https://claude.ai/artifact/LDm2G5YPtfgsXey7wKVNVv).
 *
 * The 16 ready lists are named after their rule ("Lowest P/E", "Below what it
 * owns"); a reader arrives with a want ("a share that pays good cash"). Each
 * want holds the lists that answer it. A want card opens its first list in the
 * pop-up; the want's other lists are chips in the list bar, and the research
 * report (or page) on the same subject sits under the list ("More on this").
 *
 * Every list lands in exactly one want. A list the backend adds later and
 * nobody put here lands in "More lists" (`groupWants`), so nothing goes
 * missing. Plain data: server-safe.
 */
import type { ReportSlug } from "@/lib/research-reports";

export type Bi = { en: string; bn: string };

export type WantIcon = "cash" | "cheap" | "growing" | "big" | "owners" | "range" | "more";

/** A page on the same subject, shown under the want's list. */
export type WantMore = { kind: "report"; slug: ReportSlug } | { kind: "page"; key: "results" };

export interface Want {
  id: string;
  name: Bi;
  icon: WantIcon;
  /** Ready-list ids, in the order the chips show them; the first opens. */
  lists: string[];
  more: WantMore[];
}

export const WANTS: Want[] = [
  {
    id: "cash",
    name: { en: "Pays good cash", bn: "ভালো নগদ ডিভিডেন্ড দেয়" },
    icon: "cash",
    lists: ["high_dividend", "steady_dividends", "dividend_soon"],
    more: [{ kind: "report", slug: "dividends-you-can-count-on" }],
  },
  {
    id: "cheap",
    name: { en: "Cheap for what it earns", bn: "আয়ের তুলনায় দাম কম" },
    icon: "cheap",
    // Strong and cheap first: the only one of the three that checks the company too.
    lists: ["strong_cheap", "low_pe", "below_book"],
    more: [],
  },
  {
    id: "growing",
    name: { en: "Profit is growing", bn: "মুনাফা বাড়ছে" },
    icon: "growing",
    lists: ["profit_growing"],
    more: [
      { kind: "page", key: "results" },
      { kind: "report", slug: "results-season" },
      { kind: "report", slug: "is-the-profit-real" },
    ],
  },
  {
    id: "big",
    name: { en: "Big and steady", bn: "বড় ও স্থির" },
    icon: "big",
    lists: ["big_steady", "biggest", "most_traded", "no_loans"],
    more: [],
  },
  {
    id: "owners",
    name: { en: "Owners believe in it", bn: "মালিকেরা ভরসা রাখছেন" },
    icon: "owners",
    lists: ["owners_hold", "owners_buying"],
    more: [{ kind: "report", slug: "who-is-buying" }],
  },
  {
    id: "range",
    name: { en: "Near its 52-week high or low", bn: "52 সপ্তাহের সর্বোচ্চ বা সর্বনিম্নের কাছে" },
    icon: "range",
    lists: ["near_low", "strong_near_low", "near_high"],
    more: [],
  },
];

/** The two reports about trouble: the page's "Before you buy" line, not a want. */
export const BEFORE_YOU_BUY: ReportSlug[] = ["risk-register", "auditor-warnings"];

/**
 * The wants for the lists the backend sends today: each want keeps only lists
 * that exist (a want left with none is dropped), and any list no want holds
 * goes into a last "More lists" want.
 */
export function groupWants(listIds: string[]): Want[] {
  const have = new Set(listIds);
  const out = WANTS
    .map((w) => ({ ...w, lists: w.lists.filter((id) => have.has(id)) }))
    .filter((w) => w.lists.length > 0);
  const placed = new Set(out.flatMap((w) => w.lists));
  const rest = listIds.filter((id) => !placed.has(id));
  if (rest.length) {
    out.push({ id: "more", name: { en: "More lists", bn: "আরও তালিকা" }, icon: "more", lists: rest, more: [] });
  }
  return out;
}

/** The want a list sits in (from `groupWants`' output). */
export function wantOf(wants: Want[], listId: string | null): Want | undefined {
  return listId ? wants.find((w) => w.lists.includes(listId)) : undefined;
}
