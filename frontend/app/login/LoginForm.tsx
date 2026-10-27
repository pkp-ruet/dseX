"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiLogin, type AuthApiResponse } from "@/lib/api";
import { loadWatchlist } from "@/lib/watchlist";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

type Mode = "email" | "phone";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { lang } = useLang();
  const L = (en: string, bn: string) => (lang === "bn" ? bn : en);

  const [mode, setMode] = useState<Mode>("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload =
        mode === "email"
          ? { email: identifier, password }
          : { phone: identifier, password };
      const data = await apiLogin(payload);
      login(data.access_token, data.user);
      await loadWatchlist();
      router.push("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : L("We couldn't sign you in.", "সাইন ইন করা যায়নি।");
      setError(
        msg === "AUTH_EXPIRED"
          ? L("Your session has ended. Please sign in again.", "আপনার সেশন শেষ হয়েছে। আবার সাইন ইন করুন।")
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(data: AuthApiResponse) {
    login(data.access_token, data.user);
    await loadWatchlist();
    router.push("/");
  }

  return (
    <div className="page-form pb-8">
      <PageHeader
        size="article"
        title={<T en="Sign in" bn="সাইন ইন" />}
        lead={
          <T
            en="Welcome back. Sign in to see your watchlist and portfolio on every device."
            bn="আবার স্বাগতম। সাইন ইন করলে আপনার ওয়াচলিস্ট আর পোর্টফোলিও সব ডিভাইসে পাবেন।"
          />
        }
      />
      {/* One centred form card (2026-10 redesign, step 9) */}
      <div className="soft-card p-5 sm:p-6">

        <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={setError} />
        <div className="auth-divider my-5">
          <T en="or" bn="অথবা" />
        </div>

        {/* Mode toggle — segmented control, each member a 40px .btn-tab */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg bg-surface border border-border" role="tablist" aria-label={L("Sign-in method", "সাইন ইনের পদ্ধতি")}>
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
              <T en="Password" bn="পাসওয়ার্ড" />
            </label>
            <div className="relative">
              <input id="login-2"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={L("Enter your password", "পাসওয়ার্ড লিখুন")}
                required
                className="input-field pr-10"
                autoComplete="current-password"
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
            {loading ? <T en="Signing in…" bn="সাইন ইন হচ্ছে…" /> : <T en="Sign in" bn="সাইন ইন" />}
          </button>
        </form>

        <p className="mt-5 text-sm text-center text-text-muted">
          <T en="No account yet?" bn="এখনো অ্যাকাউন্ট নেই?" />{" "}
          <Link href="/register" className="text-primary hover:underline font-medium">
            <T en="Create one" bn="অ্যাকাউন্ট খুলুন" />
          </Link>
        </p>
      </div>
    </div>
  );
}
