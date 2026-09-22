import Link from "next/link";
import Bn from "@/components/i18n/Bn";

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

type HubLink = { href: string; label: string; sub: string; bn: string };

const GROUPS: Record<HubGroup, { title: string; bn: string; links: HubLink[] }> = {
  find: {
    title: "More ways to find a stock",
    bn: "শেয়ার খোঁজার আরও কিছু উপায়",
    links: [
      { href: "/stocks", label: "Browse all stocks", sub: "Full A–Z table", bn: "সব শেয়ারের তালিকা" },
      { href: "/buy-sell-signals", label: "Buy / Sell signals", sub: "What to buy or sell now", bn: "এখন কী কিনবেন, কী বিক্রি করবেন" },
      { href: "/stock-insights", label: "Stock lists", sub: "Ready-made lists", bn: "তৈরি করা তালিকা" },
      { href: "/stock-recommendation", label: "Find my stocks", sub: "Three questions, your picks", bn: "তিনটি প্রশ্ন, আপনার শেয়ার" },
      { href: "/daily-tips", label: "Daily tips", sub: "Fresh signals every day", bn: "প্রতিদিনের সংকেত" },
      { href: "/top-picks", label: "Top picks", sub: "Today's strongest names", bn: "আজকের সেরা শেয়ার" },
      { href: "/dse-trending-stocks", label: "Trending stocks", sub: "This week's top movers", bn: "এই সপ্তাহে যেগুলো বেশি বেড়েছে" },
      { href: "/dse-popular-stocks", label: "Popular stocks", sub: "Most traded today", bn: "আজ সবচেয়ে বেশি লেনদেন" },
      { href: "/assistant", label: "TopStock AI", sub: "Ask in plain words", bn: "সহজ ভাষায় প্রশ্ন করুন" },
    ],
  },
  today: {
    title: "More about today's market",
    bn: "আজকের বাজার নিয়ে আরও",
    links: [
      { href: "/dse-today", label: "DSE Today", sub: "Prices, movers and news", bn: "আজকের দাম, গেইনার, খবর" },
      { href: "/market-analysis", label: "Market analysis", sub: "Up or down, cheap or pricey", bn: "বাজার উঠছে না নামছে" },
      { href: "/share-bazar", label: "আজকের শেয়ার বাজার", sub: "Today's market in Bangla", bn: "বাংলায় আজকের বাজার" },
      { href: "/todays-news", label: "Today's news", sub: "All company news, last day", bn: "সব কোম্পানির খবর" },
      { href: "/market-intelligence", label: "Market intelligence", sub: "Signal tables for this market mood", bn: "বাজারের মেজাজ অনুযায়ী সংকেত" },
      { href: "/dividend-calendar", label: "Dividend calendar", sub: "Record dates and AGMs", bn: "রেকর্ড ডেট ও এজিএম" },
      { href: "/sectors", label: "Sectors", sub: "Compare whole industries", bn: "খাত ধরে তুলনা" },
    ],
  },
};

export default function HubLinks({ group, exclude = [] }: { group: HubGroup; exclude?: string[] }) {
  const g = GROUPS[group];
  const links = g.links.filter((l) => !exclude.includes(l.href));
  return (
    <nav aria-label={g.title} className="hub-links">
      <div className="hub-links-head">
        <h2 className="hub-links-title">{g.title}</h2>
        <Bn className="hub-links-bn">{g.bn}</Bn>
      </div>
      <ul className="hub-links-grid">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hub-link">
              <span className="hub-link-label">{l.label}</span>
              <span className="hub-link-sub">{l.sub}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
