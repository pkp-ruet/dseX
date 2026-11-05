"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import {
  IconAlert, IconBell, IconBook, IconBriefcase, IconCalendar, IconCheck, IconCoin, IconCrown, IconGrid,
  IconList, IconNews, IconPlus, IconTarget, IconTrendDown, IconTrendUp,
} from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { tx } from "@/components/report/chip";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { isoLocal, todayDhaka } from "@/lib/dividend-dates";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { PfFinding, PfPromo, PfTaste } from "@/lib/portfolio-report";
import { PfQuestion } from "./PfReportChapter";

/** Which version of the card a GA event came from (old card = no variant). */
const VARIANT = "v3";

/** Findings shown; the rest are counted in one line. */
const SHOWN = 4;

const ICON: Record<PfFinding["key"], ReactNode> = {
  decide: <IconTarget size={18} />,
  warn: <IconAlert size={18} />,
  add: <IconPlus size={18} />,
  weak: <IconBriefcase size={18} />,
  grade: <IconTrendUp size={18} />,
  spread: <IconGrid size={18} />,
  moves: <IconList size={18} />,
  week: <IconNews size={18} />,
  paid: <IconCoin size={18} />,
  cash: <IconCoin size={18} />,
  results: <IconCalendar size={18} />,
  each: <IconBook size={18} />,
  strong: <IconCheck size={18} />,
  daily: <IconBell size={18} />,
  loss: <IconTrendDown size={18} />,
};

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

/**
 * THE Premium card on the portfolio page (`#pf-premium`). A free reader sees
 * their money, their shares and the detail tabs; the answer, the chapters and
 * the plan sit behind one gate and this card is where they would be. The
 * watcher's teaser push lands on this id.
 *
 * Simplified 2026-11-06 (user: "portfolio premium promo card looks
 * complicated … make it simple, clean and easy to understand"). Four parts,
 * one job each: a standard headline on what the full check covers (user,
 * same day: the taka headline was "too specific about one thing"),
 * what we found (up to four counted findings, never a share name), the price
 * and one button, and a quiet "try it first" row (a sample portfolio, and one
 * answer free a month on their own shares). The area dots, the nearest date,
 * the 30-day timeline, the feature chips and the broker-fee line are gone.
 */
export default function PortfolioPromo({
  findings,
  promo,
  sampleHref,
}: {
  findings: PfFinding[];
  promo: PfPromo;
  /** A sample portfolio's page: the full check, free. */
  sampleHref: string;
}) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  const first = (user?.display_name ?? "").trim().split(/\s+/)[0] || "";
  const offer = user?.offer ?? null;
  const href = offer ? "/premium?plan=offer&src=portfolio#pay" : `${PREMIUM_PATH}#pay`;

  const shown = findings.slice(0, SHOWN);
  const more = findings.length - shown.length;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", {
          area: "portfolio", lock: "pf-promo", state, stakes: findings.length, job: "watch", variant: VARIANT,
        });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, findings.length]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "portfolio", lock: "pf-promo", state, stakes: findings.length, job: "watch", variant: VARIANT });
    savePremiumContext({
      from: "portfolio",
      label: bn ? "আপনার পোর্টফোলিওর পূর্ণ যাচাই" : "The full check on your portfolio",
      stakes: findings.slice(0, 3).map((x) => (bn ? x.title.bn : x.title.en)),
    });
  };

  const name = (en: string, bn: string) => ({ en: first ? `${first}, ${en}` : en[0].toUpperCase() + en.slice(1), bn: first ? `${first}, ${bn}` : bn });

  return (
    <section ref={ref} id="pf-premium" className="sp pfx dash-section" aria-labelledby="pfp-t">
      {/* ── The headline ── */}
      <div className="sp-top">
        <p className="sp-tag">
          <span className="sp-medal" aria-hidden="true">
            <IconCrown size={16} />
          </span>
          <T en="Premium · your portfolio check" bn="প্রিমিয়াম · আপনার পোর্টফোলিও যাচাই" />
        </p>
        <h2 id="pfp-t" className="sp-title">
          <T {...name("get the full check on your portfolio.", "আপনার পোর্টফোলিওর পূর্ণ যাচাই দেখুন।")} />
        </h2>
        <p className="sp-lead">
          <T
            en="We check every share you own: how strong each company is, how your money is spread, the prices you pay, the warnings and what is coming next. Premium shows you what we found, and what to do."
            bn="আপনার প্রতিটি শেয়ার আমরা যাচাই করি: কোম্পানি কতটা শক্তিশালী, টাকা কীভাবে ভাগ করা, দাম কেমন, কোনো সতর্কসংকেত আছে কি না, আর সামনে কী আসছে। আমরা কী পেয়েছি আর এখন কী করবেন, তা দেখায় প্রিমিয়াম।"
          />
        </p>
      </div>

      {/* ── What we found, counted ── */}
      {shown.length > 0 && (
        <div className="sp-body">
          <p className="sp-k">
            <T en="What we found in your portfolio" bn="আপনার পোর্টফোলিওতে আমরা যা পেয়েছি" />
          </p>
          <ul className="pfx-finds">
            {shown.map((x, i) => (
              <li key={`${x.key}-${i}`}>
                <span className="pfx-icon" aria-hidden="true">{ICON[x.key]}</span>
                <span>{tx(x.title)}</span>
              </li>
            ))}
          </ul>
          {more > 0 && (
            <p className="pfx-more">
              <T
                en={`And ${more} more thing${more === 1 ? "" : "s"} in your full check.`}
                bn={`আপনার পূর্ণ যাচাইয়ে আরও ${more}টি বিষয় আছে।`}
              />
            </p>
          )}
        </div>
      )}

      {/* ── The price and one button ── */}
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
              <T en="Get the full check" bn="পূর্ণ যাচাই নিন" />
            )}
          </Button>
          <p className="pfx-fine">
            <T en="bKash, Nagad or bank. Nothing renews by itself." bn="bKash, Nagad বা ব্যাংকে। নিজে থেকে নবায়ন হয় না।" />
          </p>
        </div>
      </div>

      {/* ── Try it first ── */}
      <TryFirst
        uid={user?.user_id ?? null}
        tastes={promo.tastes}
        sampleHref={sampleHref}
        state={state}
      />
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
