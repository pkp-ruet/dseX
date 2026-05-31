"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import SignupCtas from "@/components/home/SignupCtas";

export default function FinalCTA() {
  const { isLoggedIn } = useAuth();

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-[var(--surface-2)] px-5 sm:px-10 py-10 sm:py-14 text-center">
      <h2 className="text-[clamp(1.6rem,5vw,2.4rem)] font-extrabold tracking-tight text-[var(--text)] leading-tight max-w-2xl mx-auto">
        Start making confident DSE decisions today
      </h2>
      <p className="mt-3 text-[var(--text-muted)] max-w-xl mx-auto">
        Free forever. Create your account to save stocks, track your portfolio, and get the
        full fundamental picture of every Dhaka Stock Exchange company.
      </p>

      <div className="mt-7 flex justify-center">
        {isLoggedIn ? (
          <Link
            href="/dsestockranking"
            className="inline-flex items-center justify-center min-h-[48px] px-8 rounded-xl font-semibold text-white bg-[var(--primary)] hover:brightness-110 transition"
          >
            Explore the rankings →
          </Link>
        ) : (
          <div className="w-full max-w-xs">
            <SignupCtas showExplore={false} align="center" />
          </div>
        )}
      </div>
    </section>
  );
}
