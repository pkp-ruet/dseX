import type { ReactNode } from "react";
import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import {
  IconCalendar,
  IconChartBars,
  IconCrown,
  IconGrid,
  IconList,
  IconNews,
  IconSparkle,
  IconTrophy,
  IconTune,
} from "@/components/ui/icons";

interface Tile {
  href: string;
  icon: ReactNode;
  title: { en: string; bn: string };
  sub: { en: string; bn: string };
  /** Wears the Premium crown, as it does in the menu. */
  premium?: boolean;
}

const TILES: Tile[] = [
  {
    href: "/dsestockranking",
    icon: <IconTrophy size={20} />,
    title: { en: "Company ranking", bn: "কোম্পানির র‍্যাঙ্কিং" },
    sub: { en: "The strongest companies on the DSE", bn: "ডিএসইর সবচেয়ে শক্তিশালী কোম্পানি" },
  },
  {
    href: "/screener",
    icon: <IconTune size={20} />,
    title: { en: "Stock screener", bn: "স্টক স্ক্রিনার" },
    sub: { en: "Filter shares by price, profit and dividend", bn: "দাম, মুনাফা আর ডিভিডেন্ড দিয়ে শেয়ার বাছাই" },
    premium: true,
  },
  {
    href: "/discover",
    icon: <IconSparkle size={20} />,
    title: { en: "Discover", bn: "খুঁজে দেখুন" },
    sub: { en: "Companies to explore, matched to yours", bn: "আপনার শেয়ারের সাথে মিলিয়ে দেখার মতো কোম্পানি" },
  },
  {
    href: "/stock-insights",
    icon: <IconList size={20} />,
    title: { en: "Premium research", bn: "প্রিমিয়াম গবেষণা" },
    sub: { en: "Serious problems, auditors and results", bn: "গুরুতর সমস্যা, নিরীক্ষক আর আর্থিক ফল" },
    premium: true,
  },
  {
    href: "/dividend-calendar",
    icon: <IconCalendar size={20} />,
    title: { en: "Dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার" },
    sub: { en: "Record dates and AGMs ahead", bn: "সামনের রেকর্ড ডেট আর এজিএম" },
    premium: true,
  },
  {
    href: "/results",
    icon: <IconNews size={20} />,
    title: { en: "Quarterly results", bn: "প্রান্তিকের আর্থিক ফল" },
    sub: { en: "Every company's latest results", bn: "প্রতিটি কোম্পানির সর্বশেষ আর্থিক ফল" },
  },
  {
    href: "/sectors",
    icon: <IconGrid size={20} />,
    title: { en: "Sectors", bn: "সেক্টর" },
    sub: { en: "Each sector, company by company", bn: "প্রতিটি সেক্টর, কোম্পানি ধরে ধরে" },
  },
  {
    href: "/stocks",
    icon: <IconChartBars size={20} />,
    title: { en: "All stocks", bn: "সব শেয়ার" },
    sub: { en: "Every share's price today", bn: "আজ প্রতিটি শেয়ারের দাম" },
  },
];

/**
 * Block 7 of the market page — the only door to finding shares. The page says
 * how the market did; these pages help a reader find and check shares. The
 * crown matches the menu's.
 */
export default function LookForShares() {
  return (
    <section className="mk-section" aria-labelledby="mk-look">
      <h2 className="mk-look-title" id="mk-look">
        <T en="Looking for shares?" bn="শেয়ার খুঁজছেন?" />
      </h2>
      <p className="mk-card-note">
        <T
          en="This page is about the market as a whole. These pages help you find and check shares."
          bn="এই পেজ পুরো বাজার নিয়ে। শেয়ার খুঁজতে আর যাচাই করতে এই পেজগুলো দেখুন।"
        />
      </p>
      <div className="mk-look-grid">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="mk-look">
            <span className="mk-look-ic" aria-hidden="true">
              {t.icon}
            </span>
            <span className="mk-look-t">
              <T en={t.title.en} bn={t.title.bn} />
              {t.premium && (
                <span className="mk-look-crown" title="Premium">
                  <IconCrown size={14} />
                </span>
              )}
            </span>
            <span className="mk-look-s">
              <T en={t.sub.en} bn={t.sub.bn} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
