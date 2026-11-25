"use client";

import { useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import type { Lang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { usePremium } from "@/lib/premium";
import { YEARLY_PLAN } from "@/lib/premium-plans";
import { IconCrown } from "@/components/ui/icons";
import { trackEvent } from "@/lib/track";

const tk = (n: number) => `৳${n.toLocaleString("en-IN")}`;

/**
 * The home page's one Premium card (2026-11-26, user decision), right after
 * the market line, for signed-in readers without Premium. Three parts on one
 * line from 640px (stacked on phones): what it is (crown + "Get Premium for
 * one year"), the price (৳999 a year, ৳1,499 struck through, about ৳83 a
 * month), one button to the plans. This is the only place outside `/premium`
 * that names a price; every other Premium card, lock and wall says what
 * Premium shows and nothing about cost. No feature list, no countdown, no
 * close button. Styles `.hm-promo*` in `app/styles/home.css`.
 */
export default function PremiumPromoCard({ lang }: { lang: Lang }) {
  const bn = lang === "bn";
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const show = !!user && !user.is_admin && !isPremium;
  const seen = useRef(false);

  useEffect(() => {
    if (!show || seen.current) return;
    seen.current = true;
    trackEvent("premium_lock_view", { area: "home", lock: "home-promo" });
  }, [show]);

  if (!show) return null;

  const year = YEARLY_PLAN.amount;
  const was = YEARLY_PLAN.listAmount;
  const perMonth = Math.round(year / 12);

  return (
    <section
      className={`hm-promo ${bn ? "font-bn" : ""}`}
      lang={bn ? "bn" : undefined}
      aria-labelledby="hm-promo-h"
      data-card="premium-promo"
    >
      <div className="hm-promo-what">
        <span className="hm-promo-ic" aria-hidden>
          <IconCrown size={20} />
        </span>
        <div className="min-w-0">
          <p className="hm-promo-k">{bn ? "TopStockBD প্রিমিয়াম" : "TopStockBD Premium"}</p>
          <h2 id="hm-promo-h" className="hm-promo-h">
            {bn ? "এক বছরের প্রিমিয়াম নিন" : "Get Premium for one year"}
          </h2>
        </div>
      </div>

      <div className="hm-promo-price">
        <p className="hm-promo-amt">
          <b className="nums">{tk(year)}</b>
          <span>{bn ? "/ বছর" : "/ year"}</span>
        </p>
        <p className="hm-promo-sub">
          {was && was > year ? (
            <>
              <s className="nums">
                <span className="sr-only">{bn ? "আগের দাম " : "Regular price "}</span>
                {tk(was)}
              </s>
              {" · "}
            </>
          ) : null}
          {bn ? `মাসে প্রায় ${tk(perMonth)}` : `about ${tk(perMonth)} a month`}
        </p>
      </div>

      <div className="hm-promo-go">
        <Button
          href="/premium?plan=yearly&src=home-promo#pay"
          onClick={() => trackEvent("premium_lock_tap", { area: "home", lock: "home-promo" })}
          block
        >
          {bn ? "প্রিমিয়াম নিন" : "Get Premium"}
        </Button>
      </div>
    </section>
  );
}
