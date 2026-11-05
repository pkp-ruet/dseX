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
import type { Bi } from "@/lib/research-reports";

/**
 * THE Premium card on a research report (2026-11-05). The dividend calendar's
 * card, made generic: the report's name and promise, one free taste (a
 * figure or an example the page already gives away), what Premium shows as
 * plain ticks, the price and one button. Never the report's answers.
 */
export default function ResearchPromo({
  anchor,
  lock,
  name,
  title,
  lead,
  taste,
  gets,
}: {
  anchor: string;
  /** GA lock label, e.g. "research-risks". */
  lock: string;
  name: Bi;
  title: Bi;
  lead: Bi;
  taste?: ReactNode;
  gets: Bi[];
}) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  const offer = user?.offer ?? null;
  const href = offer ? `/premium?plan=offer&src=${lock}#pay` : user ? `${PREMIUM_PATH}#pay` : PREMIUM_PATH;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "research", lock, state });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lock, state]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "research", lock, state });
    savePremiumContext({ from: lock, label: bn ? name.bn : name.en, stakes: gets.slice(0, 3).map((g) => (bn ? g.bn : g.en)) });
  };

  return (
    <section ref={ref} id={anchor} className="sp rr-promo" aria-labelledby={`${anchor}-t`}>
      <div className="sp-top">
        <p className="sp-tag">
          <span className="sp-medal" aria-hidden="true">
            <IconCrown size={16} />
          </span>
          <T en={`Premium research · ${name.en}`} bn={`প্রিমিয়াম গবেষণা · ${name.bn}`} />
        </p>
        <h2 id={`${anchor}-t`} className="sp-title">
          <T en={title.en} bn={title.bn} />
        </h2>
        <p className="sp-lead">
          <T en={lead.en} bn={lead.bn} />
        </p>
      </div>

      <div className="sp-body">
        {taste}
        <p className="sp-k rr-gets-k">
          <T en="With Premium you see" bn="প্রিমিয়ামে দেখবেন" />
        </p>
        <ul className="rr-gets">
          {gets.map((g) => (
            <li key={g.en}>
              <span className="rr-tick" aria-hidden="true">
                <IconCheck size={16} />
              </span>
              <span className="min-w-0">
                <T en={g.en} bn={g.bn} />
              </span>
            </li>
          ))}
        </ul>
      </div>

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
              <T en="Read the full report" bn="পুরো প্রতিবেদন পড়ুন" />
            )}
          </Button>
        </div>
      </div>

      <p className="sp-fine">
        {state === "guest" ? (
          <T
            en="Create a free account, then pay by bKash, Nagad or bank transfer. Nothing renews by itself."
            bn="একটি ফ্রি অ্যাকাউন্ট খুলুন, তারপর bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।"
          />
        ) : (
          <T en="Pay by bKash, Nagad or bank transfer. Nothing renews by itself." bn="bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিতে পারবেন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।" />
        )}
      </p>
    </section>
  );
}
