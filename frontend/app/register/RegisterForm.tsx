"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiRegister, type AuthApiResponse } from "@/lib/api";
import { addToWatchlist, loadWatchlist } from "@/lib/watchlist";
import { markJustSignedUp, looksNewlyCreated } from "@/lib/welcome";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

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
      setError("Enter a valid BD phone number (e.g. 01XXXXXXXXX or +880XXXXXXXXX).");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPw) {
      setError("Passwords do not match.");
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
      const msg = err instanceof Error ? err.message : "Registration failed.";
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
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1 text-[var(--text)]">Create Account</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Free forever. Sync your watchlist across devices.
        </p>

        {saveCode && (
          <div className="mb-5 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2.5 text-xs sm:text-sm text-[var(--text)]">
            <span className="text-[var(--accent)] font-bold">★</span>{" "}
            We&apos;ll save <span className="font-bold">{saveCode}</span> to your list right after sign-up.
          </div>
        )}

        <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={setError} />
        <div className="auth-divider my-5">or</div>

        {/* Mode toggle */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          {(["email", "phone"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setIdentifier(""); setError(""); }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === m
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {m === "email" ? "Email" : "Phone"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="login-1" className="text-sm font-medium text-[var(--text)]">
              {mode === "email" ? "Email address" : "Phone number"}
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
            <label htmlFor="login-2" className="text-sm font-medium text-[var(--text)]">
              Name <span className="text-[var(--text-muted)] font-normal">(optional)</span>
            </label>
            <input id="login-2"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="input-field"
              autoComplete="name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="login-3" className="text-sm font-medium text-[var(--text)]">Password</label>
            <div className="relative">
              <input id="login-3"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                className="input-field pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                aria-label={showPw ? "Hide password" : "Show password"}
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
            <label htmlFor="login-4" className="text-sm font-medium text-[var(--text)]">Confirm password</label>
            <input id="login-4"
              type={showPw ? "text" : "password"}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Repeat password"
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
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-5 text-sm text-center text-[var(--text-muted)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
