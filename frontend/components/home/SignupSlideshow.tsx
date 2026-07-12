"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { m, useReducedMotion } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import WatchlistMockup from "@/components/home/WatchlistMockup";
import PriceAlertMockup from "@/components/home/PriceAlertMockup";
import RecommendationMockup from "@/components/home/RecommendationMockup";
import PortfolioMockup from "@/components/home/PortfolioMockup";
import Button from "@/components/ui/Button";

interface Slide {
  key: string;
  eyebrow: string;
  color: string;
  title: string;
  en: string;
  bn: string;
  anon: { label: string; href: string };
  auth: { label: string; href: string };
  visual: ReactNode;
}

const AUTO_MS = 5000;

const SLIDES: Slide[] = [
  {
    key: "portfolio",
    eyebrow: "Portfolio",
    color: "var(--np-cautious)",
    title: "Know if your stocks are winning",
    en: "Add what you own and see your live profit or loss, a simple A–F grade, and exactly what to fix.",
    bn: "আপনার শেয়ারগুলো যোগ করুন — লাভ-ক্ষতি, সহজ A–F গ্রেড আর কী ঠিক করা দরকার, সব এক জায়গায়।",
    anon: { label: "Sign up to track holdings", href: "/register" },
    auth: { label: "Open your portfolio", href: "/portfolio" },
    visual: <PortfolioMockup />,
  },
  {
    key: "watchlist",
    eyebrow: "Watchlist",
    color: "var(--positive)",
    title: "Never lose track of a stock",
    en: "Save the stocks you care about and see all their news together — synced free across your devices.",
    bn: "পছন্দের শেয়ার আর তার সব খবর এক জায়গায় রাখুন — সব ডিভাইসে ফ্রি সিঙ্ক।",
    anon: { label: "Sign up to save stocks", href: "/register" },
    auth: { label: "Open your watchlist", href: "/watchlist" },
    visual: <WatchlistMockup />,
  },
  {
    key: "alerts",
    eyebrow: "Price Alerts",
    color: "var(--warm)",
    title: "Get pinged at your price",
    en: "Set a target price on any stock. We watch it for you and send an alert the day it's hit.",
    bn: "যেকোনো শেয়ারে টার্গেট দাম দিন — সেই দামে পৌঁছালেই আমরা সাথে সাথে জানিয়ে দেব।",
    anon: { label: "Sign up to set alerts", href: "/register" },
    auth: { label: "Open your alerts", href: "/alerts" },
    visual: <PriceAlertMockup />,
  },
  {
    key: "recommendation",
    eyebrow: "For You",
    color: "var(--primary)",
    title: "Not sure what to buy?",
    en: "Answer a 60-second quiz and get a shortlist of DSE stocks matched to your goals, budget and risk.",
    bn: "ছোট একটা কুইজের উত্তর দিন — আপনার লক্ষ্য, বাজেট আর ঝুঁকি বুঝে মিলিয়ে শেয়ার বেছে দেব।",
    anon: { label: "Find my stocks", href: "/stock-recommendation" },
    auth: { label: "Find my stocks", href: "/stock-recommendation" },
    visual: <RecommendationMockup />,
  },
];

export default function SignupSlideshow() {
  const { isLoggedIn } = useAuth();
  const reduced = useReducedMotion();
  const n = SLIDES.length;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLElement | null>(null);
  const touchX = useRef<number | null>(null);

  const go = (i: number) => setIndex(((i % n) + n) % n);

  // Pause when scrolled out of view.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Auto-advance (off under reduced-motion / while paused / off-screen / hidden).
  useEffect(() => {
    if (reduced || paused || !inView || !visible) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % n), AUTO_MS);
    return () => clearInterval(id);
  }, [reduced, paused, inView, visible, n]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    touchX.current = null;
  };

  const activeColor = SLIDES[index].color;
  const playing = !paused && inView && visible && !reduced;

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="What you get with a free account"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-3.5 py-1 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[var(--primary-ink)]">
          Your free account
        </span>
        <h2 className="font-display mt-3 text-[clamp(1.8rem,5.5vw,3rem)] font-extrabold tracking-tight text-[var(--text)] leading-[1.08] max-w-3xl">
          One free account.{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(100deg, var(--primary), var(--np-cautious) 70%, var(--positive))" }}
          >
            Everything you need.
          </span>
        </h2>
        <p className="mt-2.5 text-[0.95rem] text-[var(--text-muted)] max-w-xl">
          Sign up in seconds and unlock your own portfolio, watchlist, price alerts and personal picks.
        </p>
      </div>

      {/* Auto-advance progress + position — makes clear this is a rotating slideshow */}
      <div className="mt-7 flex items-center gap-3">
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--text)_8%,transparent)]">
          <div
            key={`${index}-${playing}`}
            className={`news-slider-progress ${playing ? "" : "is-paused"}`}
            style={
              {
                "--ns-accent": activeColor,
                "--ns-duration": `${AUTO_MS}ms`,
              } as React.CSSProperties
            }
          />
        </div>
        <span className="shrink-0 text-[0.72rem] font-extrabold tabular-nums text-[var(--text-muted)]">
          {index + 1} / {n}
        </span>
      </div>

      {/* Carousel viewport */}
      <div className="mt-3 overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <m.div
          className="flex items-stretch"
          animate={{ x: `-${index * 100}%` }}
          transition={{ type: "spring", stiffness: 260, damping: 32 }}
        >
          {SLIDES.map((s, i) => {
            const cta = isLoggedIn ? s.auth : s.anon;
            const active = i === index;
            return (
              <div
                key={s.key}
                className="w-full shrink-0"
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${n}: ${s.title}`}
                aria-hidden={!active}
                inert={!active ? true : undefined}
              >
                <div className="soft-card h-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center p-5 sm:p-7">
                  <div className="order-2 md:order-1 flex flex-col">
                    <span
                      className="inline-flex self-start items-center gap-1.5 rounded-full px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em]"
                      style={{
                        color: s.color,
                        background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${s.color} 26%, transparent)`,
                      }}
                    >
                      {s.eyebrow}
                    </span>
                    <h3 className="font-display mt-3 text-2xl sm:text-[1.75rem] font-extrabold tracking-tight text-[var(--text)] leading-[1.12]">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--text-muted)]">{s.en}</p>
                    <p lang="bn" className="font-bn mt-1.5 text-[0.92rem] leading-relaxed text-[var(--text)]">
                      {s.bn}
                    </p>
                    <div className="mt-5">
                      <Button href={cta.href} variant="primary" size="sm" tabIndex={active ? 0 : -1}>
                        {cta.label} →
                      </Button>
                    </div>
                  </div>
                  <div className="order-1 md:order-2 w-full md:max-w-[400px] mx-auto md:ml-auto">
                    {s.visual}
                  </div>
                </div>
              </div>
            );
          })}
        </m.div>
      </div>

      {/* Controls: prev · dots · next */}
      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] transition hover:text-[var(--primary)] hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to ${s.eyebrow}`}
              aria-current={i === index}
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: i === index ? 22 : 8, background: i === index ? "var(--primary)" : "var(--border)" }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] transition hover:text-[var(--primary)] hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {!isLoggedIn && (
        <div className="mt-6 flex justify-center">
          <Button href="/register" variant="primary">
            Create your free account →
          </Button>
        </div>
      )}
    </section>
  );
}
