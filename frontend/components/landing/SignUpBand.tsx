"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { T } from "@/components/i18n/T";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { apiRegister, type AuthApiResponse, type TrustStats } from "@/lib/api";
import { looksNewlyCreated, markJustSignedUp } from "@/lib/welcome";
import { loadWatchlist } from "@/lib/watchlist";

/**
 * Block 5 — the ask, on a warm band (rebuilt 2026-10-31; was `SignUpStrip`,
 * which only linked out). Left: what an account adds, in four rows. Right: the
 * sign-up form itself — Google, or an email / phone and a password — so a
 * visitor who is ready never leaves the page. Signing in swaps the page for
 * the dashboard (HomePersonalizationGate). No pricing here.
 */

interface Perk {
  title: ReactNode;
  line: ReactNode;
  icon: ReactNode;
}

const PERKS: Perk[] = [
  {
    title: <T en="Your shares, graded" bn="আপনার শেয়ারের গ্রেড" />,
    line: <T en="One grade from A to F for what you own, and what to fix first." bn="আপনার শেয়ারের জন্য A থেকে F একটি গ্রেড, আর আগে কী ঠিক করবেন।" />,
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-6" />
      </>
    ),
  },
  {
    title: <T en="Dividends coming to you" bn="যে ডিভিডেন্ড আপনি পাবেন" />,
    line: <T en="Which of your shares pay soon, and how many taka reach you." bn="আপনার কোন শেয়ার শিগগির ডিভিডেন্ড দেবে, আর কত টাকা আসবে।" />,
    icon: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
  },
  {
    title: <T en="Alerts on your phone" bn="ফোনে প্রাইস অ্যালার্ট" />,
    line: <T en="Pick a price, and we tell you the day a share reaches it." bn="একটি দাম ঠিক করুন, শেয়ার সেখানে পৌঁছালেই আমরা জানাব।" />,
    icon: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
  },
  {
    title: <T en="Your shares, marked everywhere" bn="সব তালিকায় আপনার শেয়ার" />,
    line: <T en="Every list on the site shows which shares are yours." bn="সাইটের প্রতিটি তালিকায় আপনার শেয়ার আলাদা করে চিহ্নিত থাকে।" />,
    icon: <path d="M12 3.5l2.7 5.5 6 .9-4.35 4.24 1.03 6L12 17.3l-5.38 2.84 1.03-6L3.3 9.9l6-.9z" />,
  },
];

function validPhone(v: string): boolean {
  return /^(\+880\d{10}|01\d{9})$/.test(v.replace(/\s/g, ""));
}

function SignUpForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { lang } = useLang();
  const L = (en: string, bn: string) => (lang === "bn" ? bn : en);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function done(data: AuthApiResponse, isNew: boolean) {
    login(data.access_token, data.user);
    if (isNew) markJustSignedUp();
    await loadWatchlist().catch(() => {});
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const id = identifier.trim();
    const isEmail = id.includes("@");
    if (!isEmail && !validPhone(id)) {
      setError(
        L(
          "Enter an email address, or a Bangladeshi phone number such as 01XXXXXXXXX.",
          "একটি ইমেইল ঠিকানা লিখুন, অথবা বাংলাদেশি ফোন নম্বর, যেমন 01XXXXXXXXX।",
        ),
      );
      return;
    }
    if (password.length < 8) {
      setError(L("Your password needs at least 8 characters.", "পাসওয়ার্ডে অন্তত 8টি অক্ষর থাকতে হবে।"));
      return;
    }
    setLoading(true);
    try {
      const data = await apiRegister(isEmail ? { email: id, password } : { phone: id, password });
      await done(data, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : L("We couldn't create your account.", "অ্যাকাউন্ট খোলা যায়নি।"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="soft-card lp-lift p-5 sm:p-7">
      <h3 className="text-xl font-bold text-text-main">
        <T en="Create your free account" bn="আপনার ফ্রি অ্যাকাউন্ট খুলুন" />
      </h3>
      <p className="mt-1 text-sm text-text-main">
        <T en="It takes about 30 seconds. No card needed." bn="লাগে প্রায় 30 সেকেন্ড। কার্ড লাগবে না।" />
      </p>

      <div className="mt-5 [color-scheme:light]">
        <GoogleSignInButton onSuccess={(d) => done(d, looksNewlyCreated(d.user))} onError={setError} />
      </div>
      <div className="auth-divider my-5">
        <T en="or with email or phone" bn="অথবা ইমেইল বা ফোন দিয়ে" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor="lp-signup-id" className="text-sm font-semibold text-text-main">
            <T en="Email or phone" bn="ইমেইল বা ফোন" />
          </label>
          <input
            id="lp-signup-id"
            type="text"
            inputMode="email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
            required
            className="input-field"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="lp-signup-pw" className="text-sm font-semibold text-text-main">
            <T en="Password" bn="পাসওয়ার্ড" />
          </label>
          <div className="relative">
            <input
              id="lp-signup-pw"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={L("At least 8 characters", "অন্তত 8টি অক্ষর")}
              autoComplete="new-password"
              required
              className="input-field pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? L("Hide password", "পাসওয়ার্ড লুকান") : L("Show password", "পাসওয়ার্ড দেখুন")}
              aria-pressed={showPw}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-text-main active:bg-surface-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
                {showPw && <path d="M3 3l18 18" />}
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary btn-lg btn-block">
          {loading ? (
            <T en="Creating your account…" bn="অ্যাকাউন্ট খোলা হচ্ছে…" />
          ) : (
            <T en="Create free account" bn="ফ্রি অ্যাকাউন্ট খুলুন" />
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-text-main">
        <T en="Already have an account?" bn="আগেই অ্যাকাউন্ট আছে?" />{" "}
        <Link href="/login" className="font-semibold text-primary-ink hover:underline">
          <T en="Sign in" bn="সাইন ইন" />
        </Link>
      </p>
    </div>
  );
}

export default function SignUpBand({ trust }: { trust: TrustStats | null }) {
  const users = trust?.user_count ?? 0;
  const avg = trust?.review_average ?? null;
  const reviews = trust?.review_count ?? 0;

  return (
    <section id="signup" aria-labelledby="signup-title" className="lp-bleed bg-surface-2 py-14 sm:py-20">
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 md:grid-cols-[1fr_minmax(0,25rem)] md:gap-12">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-main">
            <T en="Free account" bn="ফ্রি অ্যাকাউন্ট" />
          </p>
          <h2 id="signup-title" className="mt-1.5 text-balance text-3xl font-bold leading-tight tracking-tight text-text-main sm:text-4xl">
            <T en="Make TopStockBD yours." bn="TopStockBD-কে নিজের করে নিন।" />
          </h2>
          <p className="mt-3 max-w-lg text-lg leading-relaxed text-text-main">
            <T
              en="Tell us what you own or follow. From then on, the site works for you every day."
              bn="কোন শেয়ার আপনার আছে বা কোনগুলো দেখছেন, জানিয়ে দিন। তারপর প্রতিদিন সাইটটি আপনার জন্য কাজ করবে।"
            />
          </p>

          <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {PERKS.map((p, i) => (
              <li key={i} className="flex gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface text-text-main" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {p.icon}
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-text-main">{p.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-text-main">{p.line}</p>
                </div>
              </li>
            ))}
          </ul>

          {(users >= 100 || (avg != null && reviews > 0)) && (
            <p className="mt-8 text-sm font-semibold text-text-main">
              {users >= 100 && (
                <T
                  en={`${users.toLocaleString("en-US")} investors have already signed up`}
                  bn={`ইতিমধ্যে ${users.toLocaleString("en-US")} জন বিনিয়োগকারী অ্যাকাউন্ট খুলেছেন`}
                />
              )}
              {users >= 100 && avg != null && reviews > 0 && " · "}
              {avg != null && reviews > 0 && (
                <T en={`★ ${avg.toFixed(1)} from ${reviews} ratings`} bn={`${reviews}টি রেটিংয়ে ★ ${avg.toFixed(1)}`} />
              )}
            </p>
          )}
        </div>

        <SignUpForm />
      </div>
    </section>
  );
}
