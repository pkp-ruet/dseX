"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Bn from "@/components/i18n/Bn";
import { IconCheck, IconCrown, IconLock } from "@/components/ui/icons";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { isFreeReport } from "@/lib/free-report";
import { trackEvent } from "@/lib/track";

export type PremiumItem = { en: string; bn: string };

/**
 * The stock page's ONE Premium section (`#ch-premium`, 2026-10-25). Every
 * lock on the page blurs in place and links here (`StockLockScope`), so the
 * reader meets one clear offer — what is locked on THIS stock — instead of
 * nine "This is part of Premium" cards.
 *
 * Three states: a free reader sees the list + the price; on the free report
 * of the day everyone sees "open for you today"; a Premium reader gets a quiet
 * line saying the page is fully open (so the membership is visible).
 */
export default function StockPremium({
  code,
  name,
  items,
}: {
  code: string;
  name: string;
  /** What is locked on this page, most useful first. */
  items: PremiumItem[];
}) {
  const { bn } = useLang();
  const { state } = usePremium();
  const [mounted, setMounted] = useState(false);
  const [freeToday, setFreeToday] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    setMounted(true);
    setFreeToday(isFreeReport(code));
  }, [code]);

  const mode = mounted && state === "premium" ? "premium" : freeToday ? "free-today" : "locked";

  useEffect(() => {
    const el = ref.current;
    if (!el || mode !== "locked" || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "stock", lock: "stock-premium", state, stakes: items.length });
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode, state, items.length]);

  if (items.length === 0) return null;

  const t = (en: string, b: string) => (bn ? b : en);
  const textCls = bn ? "font-bn" : "";
  const langAttr = bn ? "bn" : undefined;

  if (mode === "premium") {
    return (
      <section id="ch-premium" className="stock-anchor mb-8">
        <p className={`flex items-center gap-2 text-sm text-text-muted ${textCls}`} lang={langAttr}>
          <span className="premium-chip"><IconCrown size={14} /> Premium</span>
          {t("Everything on this page is open for you.", "এই পাতার সবকিছু আপনার জন্য খোলা।")}
        </p>
      </section>
    );
  }

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "stock", lock: "stock-premium", state, stakes: items.length });
    savePremiumContext({
      from: "stock",
      label: `The full verdict on ${code}`,
      stakes: items.slice(0, 3).map((i) => (bn ? i.bn : i.en)),
    });
  };

  return (
    <section
      ref={ref}
      id="ch-premium"
      aria-labelledby="ch-premium-h"
      className="stock-anchor soft-card mb-8 p-5 sm:p-6"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-primary-ink">
        {mode === "free-today" ? <IconCrown size={16} /> : <IconLock size={16} />}
        <span className={textCls} lang={langAttr}>
          {mode === "free-today"
            ? t("Today's free full report", "আজকের ফ্রি পূর্ণ রিপোর্ট")
            : "Premium"}
        </span>
      </p>
      <h2 id="ch-premium-h" className={`mt-1 text-xl font-bold leading-tight text-text-main sm:text-2xl ${textCls}`} lang={langAttr}>
        {mode === "free-today"
          ? t(`${name}: everything is open today`, `${name}: আজ সবকিছু খোলা`)
          : t(`The full verdict on ${name}`, `${name}-এর পুরো বিশ্লেষণ`)}
      </h2>
      {!bn && (
        <Bn className="mt-0.5 text-sm text-text-muted">
          {mode === "free-today" ? "আজ এই শেয়ারের পুরো রিপোর্ট সবার জন্য ফ্রি" : "কেন কিনবেন বা বিক্রি করবেন — পুরো ব্যাখ্যা"}
        </Bn>
      )}

      <ul className={`mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 ${textCls}`} lang={langAttr}>
        {items.map((it) => (
          <li key={it.en} className="flex items-start gap-2 text-sm text-text-main">
            <span className="mt-0.5 shrink-0 text-positive"><IconCheck size={14} /></span>
            <span>{bn ? it.bn : it.en}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button href={PREMIUM_PATH} onClick={onTap}>
          {mode === "free-today"
            ? t("Get this for every stock", "প্রতিটি শেয়ারে এটি পান")
            : t("See Premium", "প্রিমিয়াম দেখুন")}
        </Button>
        <p className={`text-sm text-text-muted ${textCls}`} lang={langAttr}>
          {mode === "free-today"
            ? t(
                `Every part above is open for everyone today. Premium opens it on every stock, from ৳${LOWEST_PRICE} a month.`,
                `ওপরের সবকিছু আজ সবার জন্য খোলা। প্রিমিয়ামে প্রতিটি শেয়ারে খোলা — মাসে ৳${LOWEST_PRICE} থেকে।`,
              )
            : state === "guest"
              ? t(
                  `Open a free account, then Premium from ৳${LOWEST_PRICE} — bKash or Nagad.`,
                  `বিনামূল্যে অ্যাকাউন্ট খুলুন, তারপর ৳${LOWEST_PRICE} থেকে প্রিমিয়াম — bKash বা Nagad।`,
                )
              : t(
                  `From ৳${LOWEST_PRICE} a month — pay by bKash or Nagad. No auto-renewal.`,
                  `মাসে ৳${LOWEST_PRICE} থেকে — bKash বা Nagad দিয়ে। নিজে থেকে টাকা কাটে না।`,
                )}
        </p>
      </div>
      {mode === "locked" && (
        <p className={`mt-3 text-sm text-text-muted ${textCls}`} lang={langAttr}>
          {t("Want to see one first? ", "আগে একটা দেখে নিতে চান? ")}
          <Link href="/#free-report" className="font-semibold text-primary-ink hover:underline">
            {t("Today's free full report", "আজকের ফ্রি পূর্ণ রিপোর্ট")}
          </Link>
        </p>
      )}
    </section>
  );
}
