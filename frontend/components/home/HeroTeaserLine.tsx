"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const SEO_LINE = (
  <p className="text-sm sm:text-base font-medium text-[var(--text)] text-center px-3 py-2 leading-relaxed">
    Find the best DSE stocks to buy — free{" "}
    <strong className="text-[var(--primary)] font-bold">Dhaka Stock Exchange</strong> (DSEX) rankings,
    live <strong className="text-[var(--primary)] font-bold">DSE share price</strong> updates,{" "}
    <strong className="text-[var(--primary)] font-bold">DSE today</strong> picks, and{" "}
    <strong className="text-[var(--primary)] font-bold">Bangladesh stock market</strong> signals.
  </p>
);

export default function HeroTeaserLine() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading || isLoggedIn) {
    return SEO_LINE;
  }

  return (
    <p className="text-sm sm:text-base font-medium text-center px-3 py-2 leading-relaxed text-[var(--text)]">
      <span className="text-[var(--ink-2)]">Invest smarter on the DSE — </span>
      <Link
        href="/register"
        className="font-bold text-[var(--primary)] hover:underline underline-offset-4"
      >
        create a free account
      </Link>
      <span className="text-[var(--ink-2)]"> to unlock your </span>
      <strong className="text-[var(--text)] font-bold">personal watchlist</strong>
      <span className="text-[var(--ink-2)]"> and </span>
      <strong className="text-[var(--text)] font-bold">portfolio analysis</strong>
      <span className="text-[var(--ink-2)]">.</span>
    </p>
  );
}
