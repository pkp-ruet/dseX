"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiLogin, type AuthApiResponse } from "@/lib/api";
import { loadWatchlist } from "@/lib/watchlist";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

type Mode = "email" | "phone";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();

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
      const msg = err instanceof Error ? err.message : "Login failed.";
      setError(msg === "AUTH_EXPIRED" ? "Session expired. Please log in again." : msg);
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
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1 text-[var(--text)]">Sign In</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Welcome back to TopStockBD
        </p>

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
            <label className="text-sm font-medium text-[var(--text)]">
              {mode === "email" ? "Email address" : "Phone number"}
            </label>
            <input
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
            <label className="text-sm font-medium text-[var(--text)]">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="input-field pr-10"
                autoComplete="current-password"
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

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="navbar-rank-btn w-full justify-center py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-sm text-center text-[var(--text-muted)]">
          No account?{" "}
          <Link href="/register" className="text-[var(--accent)] hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
