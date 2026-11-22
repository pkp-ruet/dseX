"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { IconCheck, IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { isoLocal, todayDhaka } from "@/lib/dividend-dates";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { PfFinding, PfOutline, PfPromo, PfTaste } from "@/lib/portfolio-report";
import { PfQuestion } from "./PfArea";

/** Which version of the card a GA event came from (old card = no variant). */
const VARIANT = "v6";

/** The free answer: one a month per reader, kept in this browser. */
const TASTE_KEY = (uid: string) => `dsex.pf.taste.${uid}`;
type TasteUse = { month: string; finding: PfFinding["key"] };
const readTaste = (uid: string): TasteUse | null => {
  try {
    const raw = localStorage.getItem(TASTE_KEY(uid));
    return raw ? (JSON.parse(raw) as TasteUse) : null;
  } catch {
    return null;
  }
};

const s = (n: number) => (n === 1 ? "" : "s");

const TICKS: { en: string; bn: string }[] = [
  { en: "Which shares, and why", bn: "কোন শেয়ার, আর কেন" },
  { en: "How many to sell or buy, in taka", bn: "কতগুলো বিক্রি বা কিনবেন, টাকার হিসাবে" },
  { en: "Each share's full story, and a check after every close", bn: "প্রতিটি শেয়ারের পুরো চিত্র, আর প্রতিদিন বাজার বন্ধের পর যাচাই" },
];

/**
 * THE Premium card on the portfolio page (`#pf-premium`), where "What to do"
 * sits for a Premium reader. Short since 2026-11-23 (the simple portfolio
 * page, plan https://claude.ai/artifact/Gmoy9sYiEcvK4wZL5eqTXN; supersedes
 * the four-part card of 2026-11-12): how many things the check found to do
 * (a count, never which share), what doing them does to the grade, three
 * ticks, the price and one button, then "Not sure yet?" (a sample check, and
 * one answer free a month). The watcher's teaser push lands on this id.
 */
export default function PortfolioPromo({
  findings,
  promo,
  outline,
  things,
  sampleHref,
}: {
  findings: PfFinding[];
  promo: PfPromo;
  outline: PfOutline;
  /** How many things "What to do" holds for this portfolio. */
  things: number;
  /** A sample portfolio's page: the full check, free. */
  sampleHref: string;
}) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  const offer = user?.offer ?? null;
  const href = offer ? "/premium?plan=offer&src=portfolio#pay" : `${PREMIUM_PATH}#pay`;
  const grades = outline.path?.grades ?? null;
  const from = grades?.[0] ?? null;
  const to = grades ? grades[grades.length - 1] : null;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "portfolio", lock: "pf-todo", state, job: "watch", variant: VARIANT, things });
        io.disconnect();
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, things]);

  const onTap = (where: string) => {
    trackEvent("premium_lock_tap", { area: "portfolio", lock: "pf-todo", state, job: "watch", variant: VARIANT, where });
    savePremiumContext({
      from: "portfolio",
      label: bn ? "আপনার পোর্টফোলিওর পূর্ণ যাচাই" : "The full check on your portfolio",
      stakes: findings.slice(0, 3).map((x) => (bn ? x.title.bn : x.title.en)),
    });
  };

  return (
    <section ref={ref} id="pf-premium" className="soft-card pfk dash-section" aria-labelledby="pfk-t">
      <div className="pfk-top">
        <h2 id="pfk-t" className="pfh-title">
          <T en="What to do" bn="কী করবেন" />
        </h2>
        <span className="pfk-tag">
          <IconCrown size={13} />
          <T en="Premium" bn="প্রিমিয়াম" />
        </span>
      </div>
      <p className="pfk-found">
        {things > 0 ? (
          <T
            en={`We found ${things} thing${s(things)} to do on your shares.`}
            bn={`আপনার শেয়ারে করার মতো ${things}টি বিষয় পেয়েছি।`}
          />
        ) : (
          <T en={`We checked all ${outline.n} of your shares.`} bn={`আপনার ${outline.n}টি শেয়ারই যাচাই করেছি।`} />
        )}
        {from && to && from !== to && (
          <>
            {" "}
            <T en={`Doing them would lift your grade from ${from} to ${to}.`} bn={`এগুলো করলে আপনার গ্রেড ${from} থেকে ${to} হয়।`} />
          </>
        )}
      </p>
      <ul className="pfk-ticks">
        {TICKS.map((t) => (
          <li key={t.en}>
            <IconCheck size={14} />
            <T en={t.en} bn={t.bn} />
          </li>
        ))}
      </ul>
      <Button href={href} onClick={() => onTap("buy")} size="lg" block>
        {offer ? (
          <T en={`See what to do · ৳${offer.amount} for a month`} bn={`কী করবেন দেখুন · এক মাস ৳${offer.amount}`} />
        ) : things > 0 ? (
          <T en={`See the ${things} thing${s(things)} to do`} bn={`${things}টি বিষয় দেখুন`} />
        ) : (
          <T en="Open your full check" bn="পূর্ণ যাচাই খুলুন" />
        )}
      </Button>
      <p className="pfk-price">
        <T
          en={`৳${LOWEST_PRICE} a month, or about ৳${FROM_MONTH} a month on the yearly plan. bKash, Nagad or bank. Nothing renews by itself.`}
          bn={`মাসে ৳${LOWEST_PRICE}, বা বছরের প্ল্যানে মাসে প্রায় ৳${FROM_MONTH}। bKash, Nagad বা ব্যাংক। নিজে থেকে নবায়ন হয় না।`}
        />
      </p>

      <TryFirst uid={user?.user_id ?? null} tastes={promo.tastes} sampleHref={sampleHref} state={state} />
    </section>
  );
}

/**
 * "Not sure yet?": a sample portfolio's full check, and one answer free a
 * month on the reader's own shares (2026-11-04 — it bends the rule that every
 * answer on this page is Premium, on purpose). The opened answer stays open
 * for the rest of the Dhaka month, kept in this browser (a taste, not an
 * entitlement).
 */
function TryFirst({
  uid,
  tastes,
  sampleHref,
  state,
}: {
  uid: string | null;
  tastes: PfTaste[];
  sampleHref: string;
  state: string;
}) {
  const month = isoLocal(todayDhaka()).slice(0, 7);
  const [used, setUsed] = useState<TasteUse | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const u = readTaste(uid);
    setUsed(u && u.month === month ? u : null);
    setReady(true);
  }, [uid, month]);

  const canTaste = !!uid && ready && tastes.length > 0;
  const open = used ? tastes.find((t) => t.finding === used.finding) ?? null : null;

  const onOpen = () => {
    if (!uid) return;
    const pick = tastes[0];
    const u: TasteUse = { month, finding: pick.finding };
    try {
      localStorage.setItem(TASTE_KEY(uid), JSON.stringify(u));
    } catch {
      /* private mode: it opens for this visit only */
    }
    setUsed(u);
    trackEvent("premium_taste_open", { area: "portfolio", finding: pick.finding, state, variant: VARIANT });
  };

  return (
    <div className="pfx-try">
      <p className="pfx-try-k">
        <T en="Not sure yet? Try it first." bn="এখনো নিশ্চিত নন? আগে দেখে নিন।" />
      </p>
      <div className="pfx-try-acts">
        <Button
          href={sampleHref}
          variant="quiet"
          size="md"
          onClick={() => trackEvent("premium_sample_tap", { area: "portfolio", state, variant: VARIANT })}
        >
          <T en="See a sample check" bn="নমুনা যাচাই দেখুন" />
        </Button>
        {canTaste && !used && (
          <Button type="button" variant="quiet" size="md" onClick={onOpen}>
            <T en="Open 1 answer free" bn="1টি উত্তর ফ্রিতে খুলুন" />
          </Button>
        )}
      </div>
      {canTaste && !used && (
        <p className="pfx-try-note">
          <T en="One free answer a month, on your own shares." bn="মাসে একটি উত্তর ফ্রি, আপনার নিজের শেয়ারে।" />
        </p>
      )}
      {open && (
        <div className="pfx-taste">
          <p className="pfx-try-k">
            <T en="Your free answer this month" bn="এ মাসে আপনার ফ্রি উত্তর" />
          </p>
          <PfQuestion row={open.row} />
        </div>
      )}
    </div>
  );
}
