"use client";

import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import Skeleton from "@/components/ui/Skeleton";
import StockRow from "@/components/ui/StockRow";
import { IconLock } from "@/components/ui/icons";
import type { CustomListStock } from "@/lib/api";

const PREVIEW_ROWS = 3;

/**
 * What a locked change would give a free reader (2026-10-27): tapping another
 * answer or another order runs that exact screen and shows the result here —
 * the count against today's, one plain line on what changed, and the first
 * three stocks blurred — with one button to the page's Premium section. A
 * sales sheet that shows the reader their own question answered, not a list
 * of features. Screen-only like every lock: the names are in the HTML.
 */
export default function ScreenerPreview({
  open,
  onClose,
  title,
  line,
  count,
  current,
  stocks,
  loading,
  error,
  cta,
  ctaHref,
  onCta,
  bn,
  t,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** What the change means, in one line. */
  line: string | null;
  /** Stocks the changed screen keeps (null while loading). */
  count: number | null;
  /** Stocks the reader's screen keeps now — null to leave the comparison out (an order change). */
  current: number | null;
  stocks: CustomListStock[] | null;
  loading: boolean;
  error: boolean;
  cta: string;
  ctaHref: string;
  onCta: () => void;
  bn: boolean;
  t: (en: string, bn: string) => string;
}) {
  const rows = (stocks ?? []).slice(0, PREVIEW_ROWS);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex w-full gap-2">
          <Button variant="quiet" className="flex-1" onClick={onClose}>
            {t("Not now", "এখন না")}
          </Button>
          <Button href={ctaHref} variant="primary" className="flex-1" onClick={onCta}>
            {cta}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {line && <p className="text-sm text-text-muted">{line}</p>}

        {error ? (
          <p className="text-sm text-text-muted">
            {t("Couldn't load the preview. Try again in a moment.", "প্রিভিউ আনা যায়নি। একটু পরে আবার চেষ্টা করুন।")}
          </p>
        ) : loading || count == null ? (
          <div className="space-y-2"><Skeleton height={48} /><Skeleton height={140} /></div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-text-main">{count}</span>
              <span className="text-sm text-text-muted">
                {t(count === 1 ? "stock" : "stocks", "টি শেয়ার")}
                {current != null && current !== count && t(` · you have ${current} now`, ` · এখন আছে ${current}টি`)}
              </span>
            </div>

            {rows.length > 0 ? (
              <div className="relative overflow-hidden rounded-lg border border-border">
                <ul aria-hidden className="pointer-events-none select-none blur-sm">
                  {rows.map((s) => (
                    <StockRow
                      key={s.code}
                      as="li"
                      inset="card"
                      code={s.code}
                      name={s.name}
                      price={s.price}
                      change={s.change_pct}
                      lang={bn ? "bn" : "en"}
                    />
                  ))}
                </ul>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-text-main">
                    <IconLock size={14} />
                    {t("Premium", "প্রিমিয়াম")}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                {t("No stock passes with this change today.", "এই বদলে আজ কোনো শেয়ার পাস করছে না।")}
              </p>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
