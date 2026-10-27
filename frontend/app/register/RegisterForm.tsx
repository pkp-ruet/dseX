"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiRegister, type AuthApiResponse } from "@/lib/api";
import { addToWatchlist, loadWatchlist } from "@/lib/watchlist";
import { markJustSignedUp, looksNewlyCreated } from "@/lib/welcome";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

type Mode = "email" | "phone";

function validatePhone(phone: string): boolean {
  const stripped = phone.replace(/\s/g, "");
  return /^(\+880\d{10}|01\d{9})$/.test(stripped);
}

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const saveCode = (searchParams.get("save") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const { login } = useAuth();
  const { lang } = useLang();
  const L = (en: string, bn: string) => (lang === "bn" ? bn : en);

  const [mode, setMode] = useState<Mode>("email");
  const [identifier, setIdentifier] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "phone" && !validatePhone(identifier)) {
      setError(
        L(
          "Please enter a valid Bangladeshi phone number, such as 01XXXXXXXXX or +880XXXXXXXXX.",
          "সঠিক বাংলাদেশি ফোন নম্বর লিখুন, যেমন 01XXXXXXXXX বা +880XXXXXXXXX।",
        ),
      );
      return;
    }
    if (password.length < 8) {
      setError(L("Your password needs at least 8 characters.", "পাসওয়ার্ডে অন্তত 8টি অক্ষর থাকতে হবে।"));
      return;
    }
    if (password !== confirmPw) {
      setError(L("The two passwords do not match.", "দুটি পাসওয়ার্ড মিলছে না।"));
      return;
    }

    setLoading(true);
    try {
      const payload =
        mode === "email"
          ? { email: identifier, password, display_name: displayName || undefined }
          : { phone: identifier, password, display_name: displayName || undefined };
      const data = await apiRegister(payload);
      login(data.access_token, data.user);
      markJustSignedUp(); // password registration is always a brand-new account
      await loadWatchlist();
      if (saveCode) {
        await addToWatchlist(saveCode).catch(() => {});
      }
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : L("We couldn't create your account.", "অ্যাকাউন্ট খোলা যায়নি।");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(data: AuthApiResponse) {
    login(data.access_token, data.user);
    // Google from the register page may be signup OR an existing login — only
    // greet as new when the account looks freshly created.
    if (looksNewlyCreated(data.user)) markJustSignedUp();
    await loadWatchlist();
    if (saveCode) {
      await addToWatchlist(saveCode).catch(() => {});
    }
    const next = searchParams.get("next");
    router.push(next && next.startsWith("/") ? next : "/");
  }

  return (
    <div className="page-form pb-8">
      <PageHeader
        size="article"
        title={<T en="Create your account" bn="আপনার অ্যাকাউন্ট খুলুন" />}
        lead={
          <T
            en="An account is free. Your watchlist and portfolio stay with you on every device."
            bn="অ্যাকাউন্ট খোলা ফ্রি। আপনার ওয়াচলিস্ট আর পোর্টফোলিও সব ডিভাইসে একসঙ্গে থাকবে।"
          />
        }
      />
      {/* One centred form card (2026-10 redesign, step 9) */}
      <div className="soft-card p-5 sm:p-6">

        {saveCode && (
          <div className="mb-5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm text-text-main">
            <T
              en={
                <>
                  We will add <span className="font-bold">{saveCode}</span> to your watchlist as soon as your account is open.
                </>
              }
              bn={
                <>
                  অ্যাকাউন্ট খোলার সঙ্গে সঙ্গে <span className="font-bold">{saveCode}</span> আপনার ওয়াচলিস্টে যোগ হবে।
                </>
              }
            />
          </div>
        )}

        <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={setError} />
        <div className="auth-divider my-5">
          <T en="or" bn="অথবা" />
        </div>

        {/* Mode toggle — segmented control, each member a 40px .btn-tab */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg bg-surface border border-border" role="tablist" aria-label={L("Sign-up method", "অ্যাকাউন্ট খোলার পদ্ধতি")}>
          {(["email", "phone"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => { setMode(m); setIdentifier(""); setError(""); }}
              className={`btn-tab flex-1 ${mode === m ? "is-active" : ""}`}
            >
              {m === "email" ? <T en="Email" bn="ইমেইল" /> : <T en="Phone" bn="ফোন" />}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="login-1" className="text-sm font-medium text-text-main">
              {mode === "email" ? (
                <T en="Email address" bn="ইমেইল ঠিকানা" />
              ) : (
                <T en="Phone number" bn="ফোন নম্বর" />
              )}
            </label>
            <input id="login-1"
              type={mode === "email" ? "email" : "tel"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={mode === "email" ? "you@example.com" : "01XXXXXXXXX"}
              required
              className="input-field"
              autoComplete={mode === "email" ? "email" : "tel"}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="login-2" className="text-sm font-medium text-text-main">
              <T en="Name" bn="নাম" />{" "}
              <span className="text-text-muted font-normal">
                <T en="(optional)" bn="(না দিলেও চলবে)" />
              </span>
            </label>
            <input id="login-2"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={L("Your name", "আপনার নাম")}
              className="input-field"
              autoComplete="name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="login-3" className="text-sm font-medium text-text-main">
              <T en="Password" bn="পাসওয়ার্ড" />
            </label>
            <div className="relative">
              <input id="login-3"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={L("At least 8 characters", "অন্তত 8টি অক্ষর")}
                required
                className="input-field pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:text-text-main active:bg-surface-2"
                aria-label={showPw ? L("Hide password", "পাসওয়ার্ড লুকান") : L("Show password", "পাসওয়ার্ড দেখুন")}
              >
                {showPw ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="login-4" className="text-sm font-medium text-text-main">
              <T en="Confirm password" bn="পাসওয়ার্ড আবার লিখুন" />
            </label>
            <input id="login-4"
              type={showPw ? "text" : "password"}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder={L("Type the password again", "পাসওয়ার্ডটি আবার লিখুন")}
              required
              className="input-field"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary btn-block"
          >
            {loading ? (
              <T en="Creating your account…" bn="অ্যাকাউন্ট খোলা হচ্ছে…" />
            ) : (
              <T en="Create an account" bn="অ্যাকাউন্ট খুলুন" />
            )}
          </button>
        </form>

        <p className="mt-5 text-sm text-center text-text-muted">
          <T en="Already have an account?" bn="অ্যাকাউন্ট আছে?" />{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            <T en="Sign in" bn="সাইন ইন" />
          </Link>
        </p>
      </div>
    </div>
  );
}
