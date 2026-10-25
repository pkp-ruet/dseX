import Link from "next/link";
import Button from "@/components/ui/Button";
import Bn from "@/components/i18n/Bn";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";
import { IconCheck, IconCrown } from "@/components/ui/icons";
import { changePct, changeTone, money } from "@/lib/formatters";
import type { ScoreItem } from "@/lib/api";

const OPEN = [
  { en: "Why it is a Buy, a Sell or neither — the full reason", bn: "কেন কেনা, বেচা বা কোনোটাই নয় — পুরো কারণ" },
  { en: "Fair value: what the price should be", bn: "ন্যায্য দাম: দাম কত হওয়া উচিত" },
  { en: "All five health checks, explained", bn: "পাঁচটি স্বাস্থ্য পরীক্ষার পুরো ব্যাখ্যা" },
  { en: "Every good sign and watch-out", bn: "সব ভালো লক্ষণ আর সতর্কতা" },
];

/**
 * Today's free full report (`lib/free-report.ts`): one familiar company whose
 * stock page is fully open for everyone today — a free reader sees exactly
 * what Premium is before paying. Used on the landing page (server) and in the
 * dashboard's "Worth a look" chapter (client); no hooks, so it renders in both.
 * `#free-report` is what the stock page's Premium section links to.
 */
export default function FreeReportCard({
  item,
  lang = "en",
  premium = false,
}: {
  item: ScoreItem;
  lang?: "en" | "bn";
  /** Premium readers have every report open — the card says "featured" instead. */
  premium?: boolean;
}) {
  const bn = lang === "bn";
  const code = item.trading_code;
  const name = item.company_name || code;
  const t = (en: string, b: string) => (bn ? b : en);
  const textCls = bn ? "font-bn" : "";
  const langAttr = bn ? "bn" : undefined;

  return (
    <section id="free-report" aria-labelledby="free-report-h" className="soft-card dash-box p-5 sm:p-6">
      <p className={`flex items-center gap-2 text-sm font-semibold text-primary-ink ${textCls}`} lang={langAttr}>
        <IconCrown size={16} />
        {premium ? t("Today's featured report", "আজকের বিশেষ রিপোর্ট") : t("Today's free full report", "আজকের ফ্রি পূর্ণ রিপোর্ট")}
      </p>

      <div className="mt-3 flex items-center gap-4">
        <ScoreBadge score={item.score} size="md" />
        <div className="min-w-0 flex-1">
          <h3 id="free-report-h" className="truncate text-lg font-bold leading-tight text-text-main">
            <Link href={`/stock/${code}?src=free`} className="hover:underline">{name}</Link>
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{code}</span>
            {item.ltp != null && <span className="nums font-semibold text-text-main">{money(item.ltp)}</span>}
            {item.change_pct != null && (
              <span className={`nums font-semibold ${changeTone(item.change_pct)}`}>{changePct(item.change_pct)}</span>
            )}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <TierPill score={item.score} lang={lang} />
            {item.signal && <SignalChip signal={item.signal.signal} strength={item.signal.strength} lang={lang} />}
          </div>
        </div>
      </div>

      <p className={`mt-4 text-sm text-text-muted ${textCls}`} lang={langAttr}>
        {premium
          ? t("Every report is open for you. Today we picked this one.", "আপনার জন্য সব রিপোর্ট খোলা। আজ আমরা এটি বেছে নিয়েছি।")
          : t(
              "Every part of this stock's page is open for everyone today — the parts Premium opens on every stock:",
              "আজ এই শেয়ারের পুরো পাতা সবার জন্য খোলা — প্রিমিয়ামে যা প্রতিটি শেয়ারে খোলা থাকে:",
            )}
      </p>
      {!premium && (
        <ul className={`mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 ${textCls}`} lang={langAttr}>
          {OPEN.map((o) => (
            <li key={o.en} className="flex items-start gap-2 text-sm text-text-main">
              <span className="mt-0.5 shrink-0 text-positive"><IconCheck size={14} /></span>
              <span>{bn ? o.bn : o.en}</span>
            </li>
          ))}
        </ul>
      )}
      {!bn && !premium && <Bn className="mt-2 text-sm text-text-muted">প্রতিদিন একটি পরিচিত কোম্পানির পুরো রিপোর্ট সবার জন্য ফ্রি।</Bn>}

      <div className="mt-4">
        <Button href={`/stock/${code}?src=free`} block>
          {t(`Read the full ${code} report`, `${code}-এর পুরো রিপোর্ট পড়ুন`)}
        </Button>
      </div>
    </section>
  );
}
