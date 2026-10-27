import Link from "next/link";
import { T } from "@/components/i18n/T";

/**
 * HubLinks — the "more ways in" strip that lives on a hub page.
 *
 * The global navigation (drawer, bottom bar, footer) lists only the hubs.
 * Every secondary discovery page is reached from here instead, so the menu
 * stays narrow while nothing becomes an orphan:
 *
 *   find  → rendered on /dsestockranking and /buy-sell-signals
 *   today → rendered on /dse-today and /market-analysis
 */
export type HubGroup = "find" | "today";

type Pair = { en: string; bn: string };
type HubLink = { href: string; label: Pair; sub: Pair };

const GROUPS: Record<HubGroup, { title: Pair; links: HubLink[] }> = {
  find: {
    title: { en: "More ways to find a stock", bn: "শেয়ার খোঁজার আরও উপায়" },
    links: [
      { href: "/stocks", label: { en: "All stocks", bn: "সব শেয়ার" }, sub: { en: "The full A–Z list", bn: "A থেকে Z পুরো তালিকা" } },
      { href: "/buy-sell-signals", label: { en: "Buy signals and tips", bn: "কেনার সংকেত ও টিপস" }, sub: { en: "What looks worth buying now", bn: "এখন কোনটি কেনার মতো" } },
      { href: "/stock-insights", label: { en: "Stock lists", bn: "শেয়ারের তালিকা" }, sub: { en: "Ready-made lists", bn: "তৈরি করা তালিকা" } },
      { href: "/screener", label: { en: "Stock screener", bn: "স্টক স্ক্রিনার" }, sub: { en: "Find stocks that fit what you want", bn: "আপনার চাওয়া অনুযায়ী শেয়ার খুঁজুন" } },
      { href: "/dse-trending-stocks", label: { en: "Trending stocks", bn: "আলোচিত শেয়ার" }, sub: { en: "This week's biggest movers", bn: "এ সপ্তাহে যেগুলোর দাম বেশি নড়েছে" } },
      { href: "/dse-popular-stocks", label: { en: "Popular stocks", bn: "জনপ্রিয় শেয়ার" }, sub: { en: "The most traded today", bn: "আজ সবচেয়ে বেশি লেনদেন হয়েছে" } },
      { href: "/assistant", label: { en: "TopStock AI", bn: "TopStock AI" }, sub: { en: "Ask in plain words", bn: "সহজ ভাষায় প্রশ্ন করুন" } },
    ],
  },
  today: {
    title: { en: "More about today's market", bn: "আজকের বাজার নিয়ে আরও" },
    links: [
      { href: "/dse-today", label: { en: "DSE today", bn: "আজকের DSE" }, sub: { en: "Prices, biggest moves and news", bn: "দাম, বড় ওঠানামা আর খবর" } },
      { href: "/market-analysis", label: { en: "Market analysis", bn: "বাজার বিশ্লেষণ" }, sub: { en: "Is the market up or down?", bn: "বাজার উঠছে না নামছে" } },
      { href: "/share-bazar", label: { en: "Today's market in Bangla", bn: "আজকের শেয়ার বাজার" }, sub: { en: "A short daily report in Bengali", bn: "প্রতিদিনের সংক্ষিপ্ত বাজার প্রতিবেদন" } },
      { href: "/todays-news", label: { en: "Today's news", bn: "আজকের খবর" }, sub: { en: "Every company's news from the last day", bn: "গত এক দিনে সব কোম্পানির খবর" } },
      { href: "/results", label: { en: "Quarterly results", bn: "প্রান্তিকের ফল" }, sub: { en: "Each company's latest profit", bn: "প্রতিটি কোম্পানির সর্বশেষ মুনাফা" } },
      { href: "/dividend-calendar", label: { en: "Dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার" }, sub: { en: "Record dates and AGMs", bn: "রেকর্ড ডেট আর এজিএম" } },
      { href: "/sectors", label: { en: "Sectors", bn: "সেক্টর" }, sub: { en: "Compare whole industries", bn: "পুরো সেক্টর মিলিয়ে দেখুন" } },
    ],
  },
};

export default function HubLinks({ group, exclude = [] }: { group: HubGroup; exclude?: string[] }) {
  const g = GROUPS[group];
  const links = g.links.filter((l) => !exclude.includes(l.href));
  return (
    <nav aria-label={g.title.en} className="hub-links">
      <div className="hub-links-head">
        <h2 className="hub-links-title">
          <T en={g.title.en} bn={g.title.bn} />
        </h2>
      </div>
      <ul className="hub-links-grid">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hub-link">
              <span className="hub-link-label">
                <T en={l.label.en} bn={l.label.bn} />
              </span>
              <span className="hub-link-sub">
                <T en={l.sub.en} bn={l.sub.bn} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
