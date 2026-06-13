"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  apiGetAdminFeedback,
  type AdminFeedbackResponse,
  type AdminFeedbackItem,
} from "@/lib/api";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex" aria-label={`${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill={i <= n ? "var(--warm)" : "none"}
          stroke={i <= n ? "var(--warm)" : "var(--border)"}
          strokeWidth="1.6"
        >
          <path
            d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.4l-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.95z"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

export default function AdminFeedbackClient() {
  const router = useRouter();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();

  const [data, setData] = useState<AdminFeedbackResponse | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
      return;
    }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  const refetch = useCallback(() => {
    setLoadError("");
    apiGetAdminFeedback()
      .then(setData)
      .catch((err: Error) => setLoadError(err?.message ?? "Failed to load"));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    refetch();
  }, [isAdmin, refetch]);

  if (isLoading || (!isAdmin && !loadError)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading…</p>
      </div>
    );
  }
  if (!isAdmin) return null;

  const stats = data?.stats;
  const items: AdminFeedbackItem[] = data?.items ?? [];
  const dist = stats?.distribution ?? {};
  const maxDist = Math.max(1, ...Object.values(dist));

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      {/* Header / nav */}
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
            Admin
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] leading-tight">
            User Feedback
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Star ratings and comments from the homepage band and the signed-in popup.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={refetch} aria-label="Reload">
            ⟳ Reload
          </Button>
          <Link href="/admin/tips" className="text-xs sm:text-sm text-[var(--accent)] hover:underline whitespace-nowrap">
            Tips
          </Link>
          <Link href="/admin/scores" className="text-xs sm:text-sm text-[var(--accent)] hover:underline whitespace-nowrap">
            Scores
          </Link>
          <Link href="/admin/analytics" className="text-xs sm:text-sm text-[var(--accent)] hover:underline whitespace-nowrap">
            ← Analytics
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border px-3 py-2.5 text-sm text-[var(--negative)]" style={{ borderColor: "color-mix(in srgb, var(--negative) 40%, transparent)", background: "color-mix(in srgb, var(--negative) 10%, transparent)" }}>
          {loadError}
        </div>
      )}

      {/* Summary */}
      {stats && (
        <Card as="section" padding="none" className="rounded-2xl p-4 sm:p-5 mb-5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="shrink-0">
              <p className="text-3xl font-extrabold text-[var(--text)] nums">{stats.average ?? "—"}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                avg · {stats.total} review{stats.total === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
              {[5, 4, 3, 2, 1].map((r) => {
                const c = dist[String(r)] ?? 0;
                return (
                  <div key={r} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-[var(--text-muted)]">{r}</span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(c / maxDist) * 100}%`, background: "var(--warm)" }}
                      />
                    </div>
                    <span className="w-8 text-right text-[var(--text-muted)] nums">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Reviews */}
      <section className="flex flex-col gap-2.5">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-10 text-center">No feedback yet.</p>
        ) : (
          items.map((f) => (
            <Card key={f.id} padding="none" className="rounded-xl px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <Stars n={f.rating} />
                <span className="text-[11px] text-[var(--text-muted)]">{fmtTime(f.created_at)}</span>
              </div>
              {f.comment && (
                <p className="mt-2 text-sm text-[var(--text)] whitespace-pre-wrap break-words">{f.comment}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
                <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-medium capitalize">
                  {f.source}
                </span>
                <span className="text-[var(--text)]">
                  {f.user_name || f.user_email || (f.user_id ? "User" : "Anonymous")}
                </span>
                {f.user_email && f.user_name && <span>· {f.user_email}</span>}
                {f.page && f.page !== "/" && <span>· {f.page}</span>}
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
