"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import type { ForYou } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { t, type CopyKey } from "@/lib/home-copy";
import { PREMIUM_PATH } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import Button from "@/components/ui/Button";
import ForYouFunnel from "@/components/home/personalized/ForYouFunnel";
import { IconAlert, IconCalendar, IconChartBars, IconCrown, IconTarget } from "@/components/ui/icons";

/** Kinds whose pick is one of the reader's own stocks. */
const OWN = new Set(["add_more", "watched"]);

const ROWS: { icon: ReactNode; q: CopyKey; line: CopyKey }[] = [
  { icon: <IconTarget size={18} />, q: "forYouProRow1", line: "forYouProRow1Line" },
  { icon: <IconChartBars size={18} />, q: "forYouProRow2", line: "forYouProRow2Line" },
  { icon: <IconAlert size={18} />, q: "forYouProRow3", line: "forYouProRow3Line" },
  { icon: <IconCalendar size={18} />, q: "forYouProRow4", line: "forYouProRow4Line" },
];

/**
 * "Picked for you" as a free reader sees it (2026-11-01, user: "everything of
 * Picked for you will be a premium feature"). No company, no reason, no row —
 * only what the engine did for them (how many it analysed, how many passed,
 * how many it chose), what the list shows, a few counts from today's list and
 * one button. The stock page's Premium card look (`.sp`): gold band, white
 * body, price + button.
 */
export default function ForYouPromo({
  data,
  name,
  lang = "en",
}: {
  data: ForYou;
  name?: string | null;
  lang?: Lang;
}) {
  const { user } = useAuth();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);
  const bn = lang === "bn";

  const n = data.items.length;
  const personal = data.mode === "personal";
  const first = (name ?? "").trim().split(/\s+/)[0] || "";
  const { held, watched } = data.based_on;
  const basis = held && watched
    ? t(lang, "forYouBasisBoth", { held, watched })
    : held
      ? t(lang, "forYouBasisHeld", { n: held })
      : t(lang, "forYouBasisWatched", { n: watched });
  const headKey = personal
    ? first ? "forYouProHeadName" : "forYouProHead"
    : first ? "forYouProHeadGenericName" : "forYouProHeadGeneric";
  const lead = personal
    ? t(lang, "forYouProLeadPersonal", { passed: data.funnel.passed, n, basis })
    : t(lang, "forYouProLeadGeneric", { passed: data.funnel.passed, n });

  // Counts from today's list — never a name.
  const own = data.items.filter((it) => OWN.has(it.kind)).length;
  const strong = data.items.filter((it) => it.strong).length;
  const chips = [
    data.new > 0 ? t(lang, "forYouProChipNew", { n: data.new }) : null,
    own > 0 ? t(lang, "forYouProChipOwn", { n: own }) : null,
    strong > 0 ? t(lang, "forYouProChipStrong", { n: strong }) : null,
  ].filter((c): c is string => !!c);

  const offer = user?.offer ?? null;
  const href = offer ? "/premium?plan=offer&src=for-you#pay" : `${PREMIUM_PATH}#pay`;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "home", lock: "for-you", stakes: n });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [n]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "home", lock: "for-you", stakes: n });
    savePremiumContext({ from: "home", label: t(lang, "forYouProLabel"), stakes: chips.length ? chips : [t(lang, headKey, { name: first, n })] });
  };

  return (
    <section ref={ref} className={`sp fyp ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} aria-labelledby="fyp-t">
      <div className="sp-top">
        <p className="sp-tag">
          <span className="sp-medal" aria-hidden="true">
            <IconCrown size={16} />
          </span>
          {t(lang, "forYouEyebrow")} · {t(lang, "forYouProTag")}
        </p>
        <h3 id="fyp-t" className="sp-title">
          {t(lang, headKey, { name: first, n })}
        </h3>
        <p className="sp-lead">{lead}</p>
        {data.funnel.rated > 0 && <ForYouFunnel data={data} lang={lang} gold />}
      </div>

      <div className="sp-body">
        <p className="sp-k">{t(lang, "forYouProListHead")}</p>
        <ul className="sp-rows">
          {ROWS.map((r) => (
            <li key={r.q} className="sp-row">
              <span className="sp-icon" aria-hidden="true">{r.icon}</span>
              <span className="min-w-0">
                <b>{t(lang, r.q)}</b>
                <span>{t(lang, r.line)}</span>
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
            {offer ? t(lang, "forYouProCtaOffer", { p: offer.amount }) : t(lang, "forYouProCta", { n })}
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
