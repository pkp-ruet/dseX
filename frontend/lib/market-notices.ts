/**
 * "What companies told DSE" on the market page (2026-11-05): the latest news
 * day's notices, sorted by what matters most and written as plain sentences
 * in both languages. Pure — no JSX, no hooks — so it can run on the server.
 *
 * DSE's titles are a fixed vocabulary ("CODE: Q1 Financials", "Board Meeting
 * schedule under LR 16(1)", "Resumption after Record Date"). Each known title
 * becomes one sentence; noisy kinds (board meetings, factory visits, trading
 * around record dates) collapse into one line naming the companies. A title
 * we can't read is shown as DSE wrote it. Funds' daily / weekly NAV posts are
 * left out — they are a third of a normal day's posts and say nothing about
 * the market.
 */

export type Bi = { en: string; bn: string };

export type NoticeKind =
  | "results"
  | "dividend"
  | "auditor"
  | "visit"
  | "insider"
  | "rating"
  | "category"
  | "agm"
  | "people"
  | "board"
  | "record"
  | "other";

/** The filter chips: some kinds share a chip. */
export type NoticeChip = "results" | "dividend" | "auditor" | "visit" | "board" | "record" | "other";

export const CHIP_OF: Record<NoticeKind, NoticeChip> = {
  results: "results",
  dividend: "dividend",
  auditor: "auditor",
  visit: "visit",
  insider: "other",
  rating: "other",
  category: "other",
  agm: "other",
  people: "other",
  board: "board",
  record: "record",
  other: "other",
};

export const CHIP_ORDER: NoticeChip[] = ["results", "dividend", "auditor", "visit", "board", "record", "other"];

export const KIND_WORD: Record<NoticeKind, Bi> = {
  results: { en: "Results", bn: "আর্থিক ফল" },
  dividend: { en: "Dividend", bn: "ডিভিডেন্ড" },
  auditor: { en: "Auditor", bn: "অডিটর" },
  visit: { en: "Factory visit", bn: "কারখানা পরিদর্শন" },
  insider: { en: "Owners' shares", bn: "উদ্যোক্তাদের শেয়ার" },
  rating: { en: "Credit rating", bn: "ক্রেডিট রেটিং" },
  category: { en: "Category", bn: "ক্যাটাগরি" },
  agm: { en: "AGM", bn: "এজিএম" },
  people: { en: "People", bn: "নিয়োগ" },
  board: { en: "Board meetings", bn: "বোর্ড মিটিং" },
  record: { en: "Record date", bn: "রেকর্ড ডেট" },
  other: { en: "Notice", bn: "বিজ্ঞপ্তি" },
};

export const CHIP_WORD: Record<NoticeChip, Bi> = {
  results: KIND_WORD.results,
  dividend: { en: "Dividends", bn: "ডিভিডেন্ড" },
  auditor: KIND_WORD.auditor,
  visit: { en: "Factory visits", bn: "কারখানা পরিদর্শন" },
  board: KIND_WORD.board,
  record: { en: "Record dates", bn: "রেকর্ড ডেট" },
  other: { en: "Other", bn: "অন্যান্য" },
};

export interface NoticeCompany {
  code: string;
  name: string;
}

export interface NoticeRow {
  key: string;
  kind: NoticeKind;
  /** One company: the sentence is about it. */
  company?: NoticeCompany;
  /** A grouped line: the lead sentence, then these companies, then "and N more". */
  companies?: NoticeCompany[];
  more?: number;
  text: Bi;
  /** How many DSE notices this row stands for (the chip counts add these). */
  n: number;
  /** Order inside a kind: the more serious first (going concern → not fully approved → a matter to note). */
  sev?: number;
}

export interface NoticeDigest {
  /** The news day (ISO date) — the first item's post date. */
  day: string | null;
  /** Notices kept (NAV posts left out). */
  total: number;
  /** NAV posts left out. */
  skipped: number;
  rows: NoticeRow[];
  counts: Record<NoticeChip, number>;
}

interface NewsLike {
  trading_code: string;
  company_name: string | null;
  title: string;
  post_date: string | null;
}

/** Names shown in a grouped line before "and N more". */
const GROUP_NAMES = 4;

const ROLE: [RegExp, Bi][] = [
  [/managing director|\bmd\b/i, { en: "managing director", bn: "ব্যবস্থাপনা পরিচালক" }],
  [/chief executive|\bceo\b/i, { en: "chief executive", bn: "প্রধান নির্বাহী" }],
  [/chief financial|\bcfo\b/i, { en: "chief financial officer", bn: "প্রধান আর্থিক কর্মকর্তা" }],
  [/company secretary/i, { en: "company secretary", bn: "কোম্পানি সচিব" }],
  [/independent director/i, { en: "independent director", bn: "স্বতন্ত্র পরিচালক" }],
  [/vice[- ]chairman/i, { en: "vice chairman", bn: "ভাইস চেয়ারম্যান" }],
  [/chairman|chairperson/i, { en: "chairman", bn: "চেয়ারম্যান" }],
  [/director/i, { en: "director", bn: "পরিচালক" }],
];

/** "SQURPHARMA: Q1 Financials" → "Q1 Financials". */
function bareTitle(title: string, code: string): string {
  const t = (title || "").trim();
  const m = /^([A-Z0-9&().\- ]{2,24}):\s*(.+)$/.exec(t);
  if (m && (m[1].trim().toUpperCase() === code.toUpperCase() || /^[A-Z0-9&().\-]+$/.test(m[1].trim()))) return m[2].trim();
  return t;
}

/** Trim a legal suffix so a grouped line stays short: "Square Pharmaceuticals PLC." → "Square Pharmaceuticals". */
export function shortName(name: string | null | undefined, code: string): string {
  const n = (name || "").trim();
  if (!n) return code;
  return n
    .replace(/\s*\((bangladesh|bd)\)\s*/i, " ")
    .replace(/[\s,]+(public limited company|limited|ltd\.?|plc\.?|company|co\.)\s*$/i, "")
    .replace(/[\s,]+(limited|ltd\.?|plc\.?)\s*$/i, "")
    .trim() || code;
}

type Read =
  | { skip: true }
  | { kind: NoticeKind; group?: string; text?: Bi; sev?: number };

/** Read one DSE title. `group` names the grouped line it joins. */
export function readTitle(raw: string): Read {
  const t = raw.toLowerCase();

  if (/\b(daily|weekly)\s+nav\b|\bnav\b.*\b(daily|weekly)\b/.test(t)) return { skip: true };

  // Results
  const q = /\bq([1-3])\b/.exec(t);
  if (q && /financial|result|statement/.test(t)) {
    const which: Record<string, Bi> = {
      "1": { en: "first-quarter", bn: "প্রথম প্রান্তিকের" },
      "2": { en: "second-quarter", bn: "দ্বিতীয় প্রান্তিকের" },
      "3": { en: "third-quarter", bn: "তৃতীয় প্রান্তিকের" },
    };
    const w = which[q[1]];
    return { kind: "results", text: { en: `Posted its ${w.en} results.`, bn: `${w.bn} আর্থিক ফল প্রকাশ করেছে।` } };
  }
  if (/half[- ]?year(ly)?\s+(financial|result)/.test(t)) {
    return { kind: "results", text: { en: "Posted its half-year results.", bn: "ছয় মাসের আর্থিক ফল প্রকাশ করেছে।" } };
  }
  if (/financial statements|financials/.test(t)) {
    return /un-?audited/.test(t) || !/annual|audited/.test(t)
      ? { kind: "results", text: { en: "Posted its latest results.", bn: "সর্বশেষ আর্থিক ফল প্রকাশ করেছে।" } }
      : { kind: "results", text: { en: "Posted its yearly accounts.", bn: "বার্ষিক হিসাব প্রকাশ করেছে।" } };
  }

  // Auditor (before dividend: a qualified-opinion post never declares one)
  const qualified = /qualified opinion/.test(t);
  const emphasis = /emphasis of matter/.test(t);
  if (/going concern/.test(t)) {
    return {
      kind: "auditor",
      sev: 0,
      text: { en: "Its auditor raised doubt that it can keep running as a business.", bn: "ব্যবসা চালিয়ে যেতে পারবে কি না, তা নিয়ে অডিটর সন্দেহ জানিয়েছেন।" },
    };
  }
  if (qualified && emphasis) {
    return {
      kind: "auditor",
      sev: 1,
      text: {
        en: "Its auditor did not fully approve the accounts, and pointed to one matter to note.",
        bn: "অডিটর হিসাব পুরোপুরি অনুমোদন করেননি, আর একটি বিষয়ে আলাদা করে দৃষ্টি দিয়েছেন।",
      },
    };
  }
  if (qualified) {
    return { kind: "auditor", sev: 1, text: { en: "Its auditor did not fully approve the accounts.", bn: "অডিটর হিসাব পুরোপুরি অনুমোদন করেননি।" } };
  }
  if (emphasis) {
    return {
      kind: "auditor",
      sev: 2,
      text: { en: "Its auditor pointed to one matter to note in the accounts.", bn: "অডিটর হিসাবের একটি বিষয়ে আলাদা করে দৃষ্টি দিয়েছেন।" },
    };
  }

  // Trading around a record date
  if (/record date/.test(t) && /suspen|halt/.test(t)) return { kind: "record", group: "record-stop" };
  if (/record date/.test(t) && /resum/.test(t)) return { kind: "record", group: "record-back" };

  // Dividends
  if (/dividend/.test(t)) {
    if (/disburs|distribut|credited|paid|payment/.test(t)) {
      return { kind: "dividend", text: { en: "Sent its dividend to shareholders.", bn: "শেয়ারহোল্ডারদের কাছে ডিভিডেন্ড পাঠিয়েছে।" } };
    }
    if (/declar|recommend/.test(t)) {
      return { kind: "dividend", text: { en: "Declared a dividend.", bn: "ডিভিডেন্ড ঘোষণা করেছে।" } };
    }
    return { kind: "dividend" };
  }

  // DSE visited the factory
  if (/inspection|factory premises|visit/.test(t)) return { kind: "visit", group: "visit" };

  // Board meetings
  if (/board meeting/.test(t)) return { kind: "board", group: "board" };

  // Sponsors' and directors' shares
  if (/transfer/.test(t) && /share/.test(t) && /director|sponsor|shareholder/.test(t)) {
    return { kind: "insider", text: { en: "A director or sponsor declared a share transfer.", bn: "একজন পরিচালক বা উদ্যোক্তা শেয়ার হস্তান্তরের ঘোষণা দিয়েছেন।" } };
  }
  const buy = /\bbuy\b|purchase|acquire/.test(t);
  const sell = /\bsale\b|\bsell\b/.test(t);
  if ((buy || sell) && /director|sponsor|shareholder|declaration|confirmation|completion/.test(t)) {
    const done = /confirm|complet/.test(t);
    if (buy) {
      return done
        ? { kind: "insider", text: { en: "A director or sponsor finished buying shares.", bn: "একজন পরিচালক বা উদ্যোক্তা শেয়ার কেনা শেষ করেছেন।" } }
        : { kind: "insider", text: { en: "A director or sponsor plans to buy shares.", bn: "একজন পরিচালক বা উদ্যোক্তা শেয়ার কিনবেন বলে জানিয়েছেন।" } };
    }
    return done
      ? { kind: "insider", text: { en: "A director or sponsor finished selling shares.", bn: "একজন পরিচালক বা উদ্যোক্তা শেয়ার বিক্রি শেষ করেছেন।" } }
      : { kind: "insider", text: { en: "A director or sponsor plans to sell shares.", bn: "একজন পরিচালক বা উদ্যোক্তা শেয়ার বিক্রি করবেন বলে জানিয়েছেন।" } };
  }

  // Credit rating, category, meetings, people
  if (/credit rating|\brating\b/.test(t)) return { kind: "rating", text: { en: "Got a new credit rating.", bn: "নতুন ক্রেডিট রেটিং পেয়েছে।" } };
  if (/category/.test(t)) return { kind: "category", text: { en: "Its DSE category changed.", bn: "ডিএসইতে এর ক্যাটাগরি বদলেছে।" } };
  if (/\begm\b|extra-?ordinary general meeting/.test(t)) {
    return { kind: "agm", text: { en: "Called a special shareholders' meeting (EGM).", bn: "শেয়ারহোল্ডারদের বিশেষ সভা (ইজিএম) ডেকেছে।" } };
  }
  if (/\bagm\b|annual general meeting/.test(t)) {
    if (/postpone|adjourn/.test(t)) return { kind: "agm", text: { en: "Postponed its AGM.", bn: "এজিএম পিছিয়েছে।" } };
    if (/date|fixation|schedule|notice/.test(t)) return { kind: "agm", text: { en: "Set the date of its AGM.", bn: "এজিএমের তারিখ ঠিক করেছে।" } };
    return { kind: "agm" };
  }
  if (/appoint|re-?appoint|joined|resign/.test(t)) {
    const role = ROLE.find(([re]) => re.test(t))?.[1];
    if (role && /resign/.test(t)) return { kind: "people", text: { en: `Its ${role.en} resigned.`, bn: `${role.bn} পদত্যাগ করেছেন।` } };
    if (role) return { kind: "people", text: { en: `Appointed a new ${role.en}.`, bn: `নতুন ${role.bn} নিয়োগ দিয়েছে।` } };
    return { kind: "people" };
  }
  if (/price limit/.test(t) && /open|withdraw|lift/.test(t)) {
    return { kind: "other", text: { en: "Its daily price limit was lifted.", bn: "দৈনিক দামের সীমা তুলে নেওয়া হয়েছে।" } };
  }
  return { kind: "other" };
}

/** Lines for the grouped kinds: the lead when several companies share it, the
 *  sentence when it is one company. */
const GROUP_TEXT: Record<string, { many: (n: number) => Bi; one: Bi; kind: NoticeKind }> = {
  visit: {
    kind: "visit",
    many: (n) => ({ en: `DSE visited the factories of ${n} companies:`, bn: `ডিএসই ${n}টি কোম্পানির কারখানা পরিদর্শন করেছে:` }),
    one: { en: "DSE visited its factory.", bn: "ডিএসই এর কারখানা পরিদর্শন করেছে।" },
  },
  board: {
    kind: "board",
    many: (n) => ({ en: `${n} companies set a date for a board meeting:`, bn: `${n}টি কোম্পানি বোর্ড মিটিংয়ের তারিখ দিয়েছে:` }),
    one: { en: "Set a date for a board meeting.", bn: "বোর্ড মিটিংয়ের তারিখ দিয়েছে।" },
  },
  "record-stop": {
    kind: "record",
    many: (n) => ({ en: `Trading stopped for a record date in ${n} shares:`, bn: `রেকর্ড ডেটের জন্য ${n}টি শেয়ারের লেনদেন বন্ধ:` }),
    one: { en: "Trading stopped for a record date.", bn: "রেকর্ড ডেটের জন্য লেনদেন বন্ধ।" },
  },
  "record-back": {
    kind: "record",
    many: (n) => ({ en: `Trading is back after a record date in ${n} shares:`, bn: `রেকর্ড ডেটের পর ${n}টি শেয়ারের লেনদেন আবার চালু:` }),
    one: { en: "Trading is back after a record date.", bn: "রেকর্ড ডেটের পর লেনদেন আবার চালু।" },
  },
};

/** Row order: what a reader would want to hear first. */
const KIND_RANK: Record<NoticeKind, number> = {
  results: 0,
  dividend: 1,
  auditor: 2,
  visit: 3,
  insider: 4,
  rating: 5,
  category: 6,
  agm: 7,
  people: 8,
  other: 9,
  board: 10,
  record: 11,
};

export function buildNotices(items: NewsLike[] | null | undefined): NoticeDigest {
  const counts = Object.fromEntries(CHIP_ORDER.map((c) => [c, 0])) as Record<NoticeChip, number>;
  const out: NoticeDigest = { day: null, total: 0, skipped: 0, rows: [], counts };
  if (!items?.length) return out;

  out.day = items.find((n) => n.post_date)?.post_date?.slice(0, 10) ?? null;
  const seen = new Set<string>();
  const singles: NoticeRow[] = [];
  const groups = new Map<string, NoticeCompany[]>();

  for (const n of items) {
    const code = (n.trading_code || "").trim().toUpperCase();
    const title = bareTitle(n.title || "", code);
    const dedupe = `${code}|${title.toLowerCase()}`;
    if (!code || code === "—" || seen.has(dedupe)) continue;
    seen.add(dedupe);

    const r = readTitle(title);
    if ("skip" in r) {
      out.skipped += 1;
      continue;
    }
    out.total += 1;
    counts[CHIP_OF[r.kind]] += 1;
    const company = { code, name: shortName(n.company_name, code) };

    if (r.group) {
      const list = groups.get(r.group) ?? [];
      if (!list.some((c) => c.code === code)) list.push(company);
      groups.set(r.group, list);
      continue;
    }
    singles.push({
      key: `${code}-${singles.length}`,
      kind: r.kind,
      company,
      // A title we can't read is shown as DSE wrote it (the source stays English).
      text: r.text ?? { en: `DSE notice: ${title}`, bn: `ডিএসইর বিজ্ঞপ্তি: ${title}` },
      n: 1,
      sev: r.sev,
    });
  }

  const grouped: NoticeRow[] = [];
  for (const [g, list] of groups) {
    const spec = GROUP_TEXT[g];
    if (!spec) continue;
    if (list.length === 1) {
      grouped.push({ key: g, kind: spec.kind, company: list[0], text: spec.one, n: 1 });
    } else {
      grouped.push({
        key: g,
        kind: spec.kind,
        companies: list.slice(0, GROUP_NAMES),
        more: Math.max(0, list.length - GROUP_NAMES),
        text: spec.many(list.length),
        n: list.length,
      });
    }
  }

  out.rows = [...singles, ...grouped].sort(
    (a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || (a.sev ?? 9) - (b.sev ?? 9),
  );
  return out;
}
