import Link from "next/link";
import Button from "@/components/ui/Button";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";
import { IconCheck, IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { changePct, changeTone, money } from "@/lib/formatters";
import type { ScoreItem } from "@/lib/api";

const OPEN = [
  { en: "Why it is a Buy, a Sell or neither, with the full reason", bn: "কেন কেনা, বিক্রি বা কোনোটিই নয়, পুরো কারণসহ" },
  { en: "Its fair price, and how we worked it out", bn: "এর ন্যায্য দাম, আর কীভাবে হিসাব করেছি" },
  { en: "All five checks, explained", bn: "পাঁচটি যাচাইয়ের পুরো ব্যাখ্যা" },
  { en: "Every good sign and thing to watch", bn: "সব ভালো দিক আর সতর্কতার দিক" },
];

/**
 * Today's free full report (`lib/free-report.ts`): one familiar company whose
 * stock page is fully open for everyone today — a free reader sees exactly
 * what Premium is before paying. Used on the landing page (server) and in the
 * dashboard (client, free readers only — Premium has every report open); no
 * hooks, so it renders in both. Every line carries both languages (`<T>`).
 * `#free-report` is what the stock page's Premium section links to.
 */
export default function FreeReportCard({
  item,
}: {
  item: ScoreItem;
  /** Ignored — the card follows the page language. Kept so old callers compile. */
  lang?: "en" | "bn";
}) {
  const code = item.trading_code;
  const name = item.company_name || code;

  return (
    <section id="free-report" aria-labelledby="free-report-h" className="soft-card dash-box p-5 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary-ink">
        <IconCrown size={16} />
        <T en="Today's free full report" bn="আজকের ফ্রি পূর্ণ রিপোর্ট" />
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
            <TierPill score={item.score} />
            {item.signal && <SignalChip signal={item.signal.signal} strength={item.signal.strength} />}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-text-muted">
        <T
          en="Today this whole page is open to everyone. These are the parts Premium opens on every share:"
          bn="আজ এই শেয়ারের পুরো পেজ সবার জন্য খোলা। প্রিমিয়ামে প্রতিটি শেয়ারে যা খোলা থাকে:"
        />
      </p>
      <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {OPEN.map((o) => (
          <li key={o.en} className="flex items-start gap-2 text-sm text-text-main">
            <span className="mt-0.5 shrink-0 text-positive"><IconCheck size={14} /></span>
            <span>
              <T en={o.en} bn={o.bn} />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-text-muted">
        <T
          en="Each day, the full report on one well-known company is free for everyone."
          bn="প্রতিদিন একটি পরিচিত কোম্পানির পূর্ণ রিপোর্ট সবার জন্য ফ্রি।"
        />
      </p>

      <div className="mt-4">
        <Button href={`/stock/${code}?src=free`} block>
          <T en={`Read the full ${code} report`} bn={`${code}-এর পূর্ণ রিপোর্ট পড়ুন`} />
        </Button>
      </div>
    </section>
  );
}
