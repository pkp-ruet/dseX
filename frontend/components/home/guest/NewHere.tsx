import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { IconCheck, IconChevronRight, IconCrown } from "@/components/ui/icons";
import { PAGE_ICON } from "@/components/places/pageIcons";
import { PLACES, type Bi } from "@/lib/places";
import { freeN } from "@/lib/premium-line";

const n = (v: number | null, fallback: number) => v ?? fallback;
const WEEK = n(freeN("dividend_calendar"), 7);
const RULES = n(freeN("watch_rules"), 3);
const ANALYSES = n(freeN("analysis"), 10);
const COMPARE = n(freeN("compare"), 10);

/** The icon for each place: the page that best stands for it. */
const PLACE_ICON: Record<string, string> = { market: "today", lists: "lists", mine: "portfolio", learn: "guides" };

/** What a page shows for free when most of it is Premium (THE Premium line,
 *  `lib/premium-line.ts`). Pages not listed here are free. */
const FREE_PART: Record<string, Bi> = {
  calendar: { en: `Next ${WEEK} days free`, bn: `সামনের ${WEEK} দিন ফ্রি` },
  buylist: { en: "1 share a day free", bn: "দিনে 1টি শেয়ার ফ্রি" },
  lists: { en: "How many each list has, free", bn: "প্রতিটি তালিকায় কয়টি, তা ফ্রি" },
  research: { en: "Key numbers free", bn: "মূল সংখ্যাগুলো ফ্রি" },
  foryou: { en: "How many, free", bn: "কয়টি, তা ফ্রি" },
};
const FREE_WORD: Record<string, Bi> = {
  rules: { en: `${RULES} free`, bn: `${RULES}টি ফ্রি` },
};

const FREE_LIST: Bi[] = [
  { en: "Market today, results, sectors and every company ranked", bn: "আজকের বাজার, আর্থিক ফল, সেক্টর আর সব কোম্পানির র‍্যাঙ্কিং" },
  { en: "Every company's price, chart, grade and figures", bn: "প্রতিটি কোম্পানির দাম, চার্ট, গ্রেড আর সব সংখ্যা" },
  {
    en: `${ANALYSES} full analyses a month, and five big companies always open`,
    bn: `মাসে ${ANALYSES}টি পুরো বিশ্লেষণ, আর পাঁচটি বড় কোম্পানির বিশ্লেষণ সবসময় খোলা`,
  },
  { en: `Compare up to ${COMPARE} shares, and filter shares by your own rules`, bn: `${COMPARE}টি পর্যন্ত শেয়ার তুলনা, আর নিজের নিয়মে শেয়ার ফিল্টার` },
  { en: "Your portfolio and watchlist, with no limit on shares", bn: "আপনার পোর্টফোলিও আর ওয়াচলিস্ট, শেয়ারের কোনো সীমা নেই" },
  {
    en: `The next ${WEEK} days of dividends, and ${RULES} watch rules or price alerts`,
    bn: `সামনের ${WEEK} দিনের ডিভিডেন্ড, আর ${RULES}টি নজরের নিয়ম বা প্রাইস অ্যালার্ট`,
  },
];

const PREMIUM_LIST: Bi[] = [
  { en: "Our analysis of every share, and the Buy List", bn: "প্রতিটি শেয়ারের বিশ্লেষণ, আর কেনার তালিকা" },
  { en: "The full check of your portfolio, with a plan", bn: "আপনার পোর্টফোলিওর পুরো যাচাই, একটি পরিকল্পনাসহ" },
  { en: "Every update on your shares the same evening, and a 9 AM brief", bn: "আপনার শেয়ারের সব আপডেট সেদিন সন্ধ্যাতেই, আর সকাল 9টার ব্রিফ" },
  { en: "The whole dividend calendar, with reminders", bn: "পুরো ডিভিডেন্ড ক্যালেন্ডার, রিমাইন্ডারসহ" },
  { en: "Our research reports, our ready lists, and companies picked from your shares", bn: "আমাদের গবেষণা রিপোর্ট, তৈরি তালিকা, আর আপনার শেয়ার দেখে বাছাই করা কোম্পানি" },
];

/**
 * The guest home's second half (2026-11-23): only for a visitor who isn't
 * signed in, and in the HTML for search. The four tabs with every page, its
 * one line and what is free (read from `lib/places.ts`, so a new page shows up
 * here by itself), then what is free and what Premium adds — no price, no
 * link to the plans (the 31 Oct rule on pricing for guests still holds).
 */
export default function NewHere() {
  return (
    <section className="hm-g-new" aria-labelledby="guest-new-h">
      <p className="hm-g-eyebrow">
        <T en="New here?" bn="নতুন এসেছেন?" />
      </p>
      <h2 className="hm-g-h2" id="guest-new-h">
        <T en="Everything on TopStockBD sits in four tabs" bn="TopStockBD-এর সবকিছু চারটি ট্যাবে" />
      </h2>
      <p className="hm-g-sub">
        <T
          en="The same four tabs sit at the bottom of your phone. Pages marked Premium still show part of themselves for free."
          bn="আপনার ফোনের নিচেও এই চারটি ট্যাব থাকে। প্রিমিয়াম চিহ্নিত পেজেরও একটি অংশ ফ্রি দেখা যায়।"
        />
      </p>

      <div className="hm-g-places">
        {PLACES.map((pl) => {
          const PlaceIcon = PAGE_ICON[PLACE_ICON[pl.key]] ?? PAGE_ICON.today;
          return (
            <div key={pl.key} className="hm-tcard hm-g-place">
              <Link href={pl.href} className="hm-g-place-h" data-card={`guest-place-${pl.key}`}>
                <span className="hm-g-place-ic" aria-hidden>
                  <PlaceIcon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="hm-g-place-name">
                    <T en={pl.name.en} bn={pl.name.bn} />
                  </span>
                  <span className="hm-g-place-q">
                    <T en={pl.question.en} bn={pl.question.bn} />
                  </span>
                </span>
                <IconChevronRight size={16} />
              </Link>
              <ul className="hm-g-pages">
                {pl.pages.map((p) => {
                  const part = FREE_PART[p.key];
                  const word = FREE_WORD[p.key] ?? { en: "Free", bn: "ফ্রি" };
                  return (
                    <li key={p.key}>
                      <T
                        en={<Link href={p.href} className="hm-g-page" data-card={`guest-page-${p.key}`}>{pageInner(p.name.en, p.line.en, p.premium ? part?.en ?? "Premium" : word.en, !!p.premium)}</Link>}
                        bn={<Link href={p.hrefBn ?? p.href} className="hm-g-page" data-card={`guest-page-${p.key}`}>{pageInner(p.name.bn, p.line.bn, p.premium ? part?.bn ?? "প্রিমিয়াম" : word.bn, !!p.premium)}</Link>}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <h2 className="hm-g-h2 hm-g-gap" id="guest-plans-h">
        <T en="Free and Premium" bn="ফ্রি আর প্রিমিয়াম" />
      </h2>
      <p className="hm-g-rule">
        <T
          en="The market is free to look at. Your own shares and our judgement are Premium."
          bn="বাজার দেখা ফ্রি। আপনার নিজের শেয়ার আর আমাদের বিচার প্রিমিয়াম।"
        />
      </p>
      <div className="hm-g-fp">
        <div className="hm-tcard hm-g-fp-card">
          <h3 className="hm-g-fp-h">
            <T en="Free, with an account" bn="ফ্রি, একটি অ্যাকাউন্টে" />
          </h3>
          <ul className="hm-g-fp-list hm-g-fp-list--free">
            {FREE_LIST.map((x) => (
              <li key={x.en}>
                <IconCheck size={16} />
                <span>
                  <T en={x.en} bn={x.bn} />
                </span>
              </li>
            ))}
          </ul>
          <p className="hm-g-taste">
            <T
              en="Add one share and you get 7 days of every update on your shares, free."
              bn="একটি শেয়ার যোগ করলেই 7 দিন আপনার শেয়ারের সব আপডেট ফ্রি।"
            />
          </p>
        </div>
        <div className="hm-tcard hm-g-fp-card hm-g-fp-card--prem">
          <h3 className="hm-g-fp-h">
            <IconCrown size={16} />
            <T en="Premium adds" bn="প্রিমিয়ামে আরও পাবেন" />
          </h3>
          <ul className="hm-g-fp-list hm-g-fp-list--prem">
            {PREMIUM_LIST.map((x) => (
              <li key={x.en}>
                <IconCrown size={14} />
                <span>
                  <T en={x.en} bn={x.bn} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function pageInner(name: string, line: string, tag: string, premium: boolean) {
  return (
    <>
      <span className="min-w-0">
        <span className="hm-g-page-name">{name}</span>
        <span className="hm-g-page-line">{line}</span>
      </span>
      <span className={`hm-g-tag ${premium ? "hm-g-tag--prem" : ""}`}>
        {premium && <IconCrown size={11} />}
        {tag}
      </span>
    </>
  );
}
