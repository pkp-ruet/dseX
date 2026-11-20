"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import { IconCheck, IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";

type Bi = { en: string; bn: string };

/**
 * THE Premium card (2026-11-20, the app map step 5: one card design). Every
 * Premium page and part sells itself with this shell, so a reader learns one
 * shape: a gold band (crown · "Premium · <what>", the headline, one lead
 * line), the page's own body (a free example, counts, what Premium shows),
 * then ONE foot — the price (or the reader's own ৳99 month), one button and
 * the fine print. Built on the stock page's `.sp` card (report-visuals.css).
 * At most one per page. It handles the view / tap events
 * (`premium_lock_view` / `premium_lock_tap`) and hands /premium the reason
 * the reader came (`savePremiumContext`).
 */
export default function PremiumCard({
  anchor,
  area,
  lock,
  track,
  src,
  tag,
  title,
  lead,
  children,
  cta,
  context,
  fine,
  className = "",
}: {
  /** The card's id: every "See Premium" on the page points here. */
  anchor: string;
  /** GA area and lock labels. */
  area: string;
  lock: string;
  /** Extra GA params (variant, counts). */
  track?: Record<string, string | number | boolean>;
  /** `src` on the /premium link. */
  src: string;
  /** What this Premium is: "Buy List", "Research · Auditor warnings". */
  tag: Bi;
  title: ReactNode;
  lead?: ReactNode;
  /** The page's own body: a free example, counts, `PremiumTicks`. */
  children?: ReactNode;
  /** The button's words when the reader has no offer. */
  cta: Bi;
  /** What /premium shows as "you came from". */
  context: { label: Bi; stakes: Bi[] };
  /** One extra line in the fine print (e.g. "Premium also compares up to 10"). */
  fine?: Bi;
  className?: string;
}) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);
  const offer = user?.offer ?? null;
  const href = offer
    ? `/premium?plan=offer&src=${src}#pay`
    : user
      ? `${PREMIUM_PATH}?src=${src}#pay`
      : `${PREMIUM_PATH}?src=${src}`;
  const params = JSON.stringify(track ?? {});

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area, lock, state, card: "one", ...JSON.parse(params) });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [area, lock, state, params]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area, lock, state, card: "one", ...JSON.parse(params) });
    savePremiumContext({
      from: lock,
      label: bn ? context.label.bn : context.label.en,
      stakes: context.stakes.slice(0, 3).map((s) => (bn ? s.bn : s.en)),
    });
  };

  return (
    <section ref={ref} id={anchor} className={`sp pc pl-free scroll-mt-24 ${className}`.trim()} aria-labelledby={`${anchor}-t`}>
      <div className="sp-top">
        <p className="sp-tag">
          <span className="sp-medal" aria-hidden="true">
            <IconCrown size={16} />
          </span>
          <T en={`Premium · ${tag.en}`} bn={`প্রিমিয়াম · ${tag.bn}`} />
        </p>
        <h2 id={`${anchor}-t`} className="sp-title">
          {title}
        </h2>
        {lead && <p className="sp-lead">{lead}</p>}
      </div>

      {children && <div className="sp-body">{children}</div>}

      <div className="sp-foot">
        <div className="sp-price">
          {offer ? (
            <>
              <b>
                <T en={`Your first month: ৳${offer.amount}`} bn={`আপনার প্রথম মাস: ৳${offer.amount}`} />
              </b>
              <span>
                <T en={`Instead of ৳${offer.list_amount}, once.`} bn={`৳${offer.list_amount}-এর বদলে, একবারই।`} />
              </span>
            </>
          ) : (
            <>
              <b>
                <T en={`৳${LOWEST_PRICE} a month`} bn={`মাসে ৳${LOWEST_PRICE}`} />
              </b>
              <span>
                <T en={`About ৳${FROM_MONTH} a month on the yearly plan.`} bn={`বছরের প্ল্যানে মাসে প্রায় ৳${FROM_MONTH}।`} />
              </span>
            </>
          )}
        </div>
        <div className="sp-cta">
          <Button href={href} onClick={onTap} size="lg" block>
            {offer ? (
              <T en={`Get your first month for ৳${offer.amount}`} bn={`প্রথম মাস ৳${offer.amount}-এ নিন`} />
            ) : (
              <T en={cta.en} bn={cta.bn} />
            )}
          </Button>
        </div>
      </div>

      <p className="sp-fine">
        {fine && (
          <>
            <T en={fine.en} bn={fine.bn} />{" "}
          </>
        )}
        {state === "guest" ? (
          <T
            en="Create a free account, then pay by bKash, Nagad or bank transfer. Nothing renews by itself."
            bn="একটি ফ্রি অ্যাকাউন্ট খুলুন, তারপর bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।"
          />
        ) : (
          <T
            en="Pay by bKash, Nagad or bank transfer. Nothing renews by itself."
            bn="bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিতে পারবেন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।"
          />
        )}
      </p>
    </section>
  );
}

/** "With Premium you see" + ticks — the body most cards use. */
export function PremiumTicks({ items, label }: { items: Bi[]; label?: Bi }) {
  const k = label ?? { en: "With Premium you see", bn: "প্রিমিয়ামে দেখবেন" };
  return (
    <>
      <p className="sp-k">
        <T en={k.en} bn={k.bn} />
      </p>
      <ul className="pc-ticks">
        {items.map((g) => (
          <li key={g.en}>
            <span className="pc-tick" aria-hidden="true">
              <IconCheck size={16} />
            </span>
            <span className="min-w-0">
              <T en={g.en} bn={g.bn} />
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
