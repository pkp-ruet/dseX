"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "@/components/ui/Link";
import { forYouCounts, type ForYou } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { t } from "@/lib/home-copy";
import { PREMIUM_PATH } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { FREE_DISCOVER_ROWS } from "@/lib/free-share";
import { trackEvent } from "@/lib/track";
import Button from "@/components/ui/Button";
import { IconAlert, IconChartBars, IconCheckCircle, IconCrown, IconTarget } from "@/components/ui/icons";

/** Anchor of the card: a free reader's locked case line under each company points here. */
export const DISCOVER_PREMIUM_ANCHOR = "dp-premium";

/**
 * Discover's Premium card for a free reader (2026-11-08, user: "Open list,
 * lock depth" — it was the whole page's lock 2026-11-01 → 11-08). It sits
 * under the free top `FREE_DISCOVER_ROWS`, which the reader has just seen
 * with their names and why each fits them, and says what Premium adds: the
 * rest of the list and the full case under every company. Never a company
 * name. The stock page's Premium card look (`.sp`): gold band, white body,
 * price + button.
 */
export default function ForYouPromo({
  data,
  lang = "en",
  area = "discover",
}: {
  data: ForYou;
  lang?: Lang;
  /** Where it sits, for the lock events. */
  area?: string;
}) {
  const { user } = useAuth();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);
  const bn = lang === "bn";

  const counts = forYouCounts(data);
  const n = counts.total;
  const free = Math.min(FREE_DISCOVER_ROWS, n);
  const rest = n - free;
  const { held, watched } = data.based_on;

  const rows: { icon: ReactNode; q: string; line: string }[] = [
    ...(rest > 0
      ? [{ icon: <IconTarget size={18} />, q: t(lang, "forYouMoreRowAll", { n }), line: t(lang, "forYouMoreRowAllLine") }]
      : []),
    { icon: <IconChartBars size={18} />, q: t(lang, "forYouProRow2"), line: t(lang, "forYouProRow2Line") },
    { icon: <IconAlert size={18} />, q: t(lang, "forYouProRow3"), line: t(lang, "forYouProRow3Line") },
    { icon: <IconCheckCircle size={18} />, q: t(lang, "forYouMoreRowChecks"), line: t(lang, "forYouMoreRowChecksLine") },
  ];

  // Counts from the rest of today's list — never a name.
  const chips = [
    counts.new > 0 ? t(lang, "forYouProChipNew", { n: counts.new }) : null,
    counts.strong > 0 ? t(lang, "forYouProChipStrong", { n: counts.strong }) : null,
  ].filter((c): c is string => !!c);

  const head = rest > 0 ? t(lang, "forYouMoreHead", { rest }) : t(lang, "forYouMoreHeadNone");
  const offer = user?.offer ?? null;
  const href = offer ? "/premium?plan=offer&src=discover#pay" : `${PREMIUM_PATH}#pay`;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area, lock: "discover", stakes: rest });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rest, area]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area, lock: "discover", stakes: rest });
    savePremiumContext({ from: area, label: t(lang, "forYouProLabel"), stakes: chips.length ? chips : [head] });
  };

  return (
    <section
      ref={ref}
      id={DISCOVER_PREMIUM_ANCHOR}
      className={`sp fyp ${bn ? "font-bn" : ""}`}
      lang={bn ? "bn" : undefined}
      aria-labelledby="fyp-t"
    >
      <div className="sp-top">
        <p className="sp-tag">
          <span className="sp-medal" aria-hidden="true">
            <IconCrown size={16} />
          </span>
          {t(lang, "forYouMoreTag")}
        </p>
        <h3 id="fyp-t" className="sp-title">
          {head}
        </h3>
        <p className="sp-lead">{t(lang, "forYouMoreLead", { free, n })}</p>
      </div>

      <div className="sp-body">
        <p className="sp-k">{t(lang, "forYouProListHead")}</p>
        <ul className="sp-rows">
          {rows.map((r) => (
            <li key={r.q} className="sp-row">
              <span className="sp-icon" aria-hidden="true">{r.icon}</span>
              <span className="min-w-0">
                <b>{r.q}</b>
                <span>{r.line}</span>
              </span>
            </li>
          ))}
        </ul>
        {chips.length > 0 && (
          <ul className="sp-also">
            {chips.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="sp-foot">
        <div className="sp-price">
          {offer ? (
            <>
              <b>{t(lang, "forYouProOffer", { p: offer.amount })}</b>
              <span>{t(lang, "forYouProOfferLine", { p: offer.list_amount })}</span>
            </>
          ) : (
            <>
              <b>{t(lang, "forYouProPrice", { p: LOWEST_PRICE })}</b>
              <span>{t(lang, "forYouProPriceLine", { p: FROM_MONTH })}</span>
            </>
          )}
        </div>
        <div className="sp-cta">
          <Button href={href} onClick={onTap} size="lg" block>
            {offer ? t(lang, "forYouProCtaOffer", { p: offer.amount }) : t(lang, "forYouMoreCta")}
          </Button>
        </div>
      </div>

      <p className="sp-fine">
        {t(lang, "forYouProFine")}
        {held + watched === 0 && (
          <>
            {" "}
            <Link prefetch={false} href="/watchlist" className="font-semibold text-primary-ink hover:underline active:opacity-70">
              {t(lang, "forYouProAdd")} →
            </Link>
          </>
        )}
      </p>
    </section>
  );
}

