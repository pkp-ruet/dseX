"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { type AuthApiResponse } from "@/lib/api";
import { loadWatchlist } from "@/lib/watchlist";

interface Props {
  /** Where the primary email CTA points. */
  registerHref?: string;
  /** Show the secondary "Explore rankings" text link (hero only). */
  showExplore?: boolean;
  /** Layout emphasis — "center" for the closing band, "start" for the hero. */
  align?: "start" | "center";
}

/**
 * Shared signup block: Google sign-in (equal prominence) + "Get Started Free".
 * Reuses the same login flow as /register so a successful Google sign-in lands
 * the user straight back on the homepage, now authenticated.
 */
export default function SignupCtas({
  registerHref = "/register",
  showExplore = true,
  align = "start",
}: Props) {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState("");

  async function handleGoogleSuccess(data: AuthApiResponse) {
    login(data.access_token, data.user);
    await loadWatchlist().catch(() => {});
    router.refresh();
  }

  const alignCls = align === "center" ? "items-center text-center" : "items-stretch sm:items-start";
  const hasGoogle = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <div className={`flex flex-col gap-3 w-full ${alignCls}`}>
      <Link
        href={registerHref}
        className="inline-flex items-center justify-center w-full sm:w-auto min-h-[48px] px-7 rounded-xl font-semibold text-[0.95rem] text-white bg-[var(--primary)] shadow-sm hover:brightness-110 active:brightness-95 transition"
      >
        Get Started — Free
      </Link>

      {hasGoogle && (
        <>
          <div className="flex items-center gap-3 w-full sm:w-auto my-0.5">
            <span className="h-px flex-1 bg-[var(--border)] sm:hidden" />
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">or</span>
            <span className="h-px flex-1 bg-[var(--border)] sm:hidden" />
          </div>

          <div className="w-full flex justify-center sm:justify-start [color-scheme:light]">
            <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={setError} />
          </div>
        </>
      )}

      {error && (
        <p className="text-xs text-[var(--negative)]">{error}</p>
      )}

      {showExplore && (
        <Link
          href="/dsestockranking"
          className="mt-1 text-sm font-medium text-[var(--primary)] hover:underline"
        >
          or explore the rankings first →
        </Link>
      )}
    </div>
  );
}
