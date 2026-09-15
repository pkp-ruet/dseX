import Link from "next/link";
import type { HomeAlert, HomeAlertKind } from "@/lib/home-alerts";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { ACC } from "@/components/home/personalized/accents";
import DashHeader, { HeaderChip } from "@/components/home/personalized/DashHeader";
import { IconArrowDown, IconArrowUp, IconBell, IconChevron, IconCoin, IconNews, IconSparkle, IconTarget, IconTrendDown, IconTrendUp, IconWallet } from "@/components/home/personalized/DashIcons";

const MAX_ROWS = 4;

/** One SVG per alert kind — the row's tone colours it. */
function KindIcon({ kind, tone }: { kind: HomeAlertKind; tone: HomeAlert["tone"] }) {
  const up = tone === "positive";
  switch (kind) {
    case "target":
      return <IconTarget size={16} />;
    case "signal":
      return <IconSparkle size={16} />;
    case "portfolio":
      return <IconWallet size={16} />;
    case "mover":
      return up ? <IconTrendUp size={16} /> : <IconTrendDown size={16} />;
    case "high":
      return <IconArrowUp size={16} />;
    case "low":
      return <IconArrowDown size={16} />;
    case "dividend":
      return <IconCoin size={16} />;
    case "news":
    default:
      return <IconNews size={16} />;
  }
}

/**
 * "Needs your attention" — the things on the reader's stocks that are NOT a
 * price row: a target hit, a Buy More / Sell flip, a dividend with its record
 * date (and, for a holding, the cash they will be paid). Price moves and
 * 52-week extremes live as chips on the "Your stocks today" rows above, so
 * nothing is listed twice on one screen.
 *
 * The header is deliberately neutral (no amber tile, no red badge): most rows
 * are dividends, not alarms. Each row carries its own tone colour instead.
 * Renders nothing when there is nothing to say.
 */
export default function AttentionStrip({ alerts, lang = "en" }: { alerts: HomeAlert[]; lang?: Lang }) {
  if (alerts.length === 0) return null;
  const bn = lang === "bn";
  const shown = alerts.slice(0, MAX_ROWS);
  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader
        accent={ACC.amber} icon={<IconBell size={15} />}
        title={t(lang, "needsAttention")}
        chips={<HeaderChip>{alerts.length > 9 ? "9+" : alerts.length}</HeaderChip>}
      />

      <ul className="divide-y divide-[var(--cell-rule)]">
        {shown.map((a) => {
          const toneColor =
            a.tone === "positive"
              ? "var(--positive)"
              : a.tone === "negative"
                ? "var(--negative)"
                : "var(--primary)";
          const inner = (
            <>
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                style={{ color: toneColor, background: `color-mix(in srgb, ${toneColor} 11%, transparent)` }}
                aria-hidden
              >
                <KindIcon kind={a.kind} tone={a.tone} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--text)]">{a.title}</span>
                {a.detail && (
                  <span className="block truncate text-xs font-medium" style={{ color: toneColor }}>
                    {a.detail}
                  </span>
                )}
              </span>
              {a.href && (
                <span className="shrink-0 text-[var(--text-muted)]">
                  <IconChevron size={15} />
                </span>
              )}
            </>
          );
          return (
            <li key={a.id}>
              {a.href ? (
                <Link
                  prefetch={false}
                  href={a.href}
                  className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)]"
                >
                  {inner}
                </Link>
              ) : (
                <div className="flex items-center gap-2.5 px-4 py-2.5">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>

      {alerts.length > MAX_ROWS && (
        <p className="border-t border-[var(--border)] px-4 py-2 text-[0.68rem] font-semibold text-[var(--text-muted)]">
          {t(lang, "moreOnYourStocks", { n: alerts.length - MAX_ROWS })}
        </p>
      )}
    </section>
  );
}
