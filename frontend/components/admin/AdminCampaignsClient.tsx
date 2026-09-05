"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  apiGetDailyEmail,
  apiPreviewDailyEmail,
  apiSendDailyTest,
  apiSendDailyEmail,
  apiGetCampaignStats,
  type DailyOverview,
  type CampaignStats,
} from "@/lib/api";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export default function AdminCampaignsClient() {
  const router = useRouter();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();

  const [cap, setCap] = useState(300);
  const [overview, setOverview] = useState<DailyOverview | null>(null);
  const [overviewErr, setOverviewErr] = useState("");

  const [subject, setSubject] = useState("");
  const subjectDirty = useRef(false);

  const [previewHtml, setPreviewHtml] = useState("");
  const [previewErr, setPreviewErr] = useState("");

  const [testEmail, setTestEmail] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [sendMsg, setSendMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [campaignId, setCampaignId] = useState("");
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- gate ---
  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.replace("/login"); return; }
    if (!isAdmin) { router.replace("/"); return; }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  // --- today's email overview (subject + audience + featured buys) ---
  const loadOverview = useCallback((c: number) => {
    setOverviewErr("");
    apiGetDailyEmail(c)
      .then((d) => {
        setOverview(d);
        if (!subjectDirty.current) setSubject(d.subject);
      })
      .catch((e: Error) => setOverviewErr(e?.message ?? "Failed to load today's email"));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadOverview(cap);
  }, [isAdmin, cap, loadOverview]);

  // --- preview ---
  useEffect(() => {
    if (!isAdmin) return;
    setPreviewErr("");
    apiPreviewDailyEmail()
      .then(setPreviewHtml)
      .catch((e: Error) => setPreviewErr(e?.message ?? "Preview failed"));
  }, [isAdmin]);

  // --- stats polling while a send is running ---
  useEffect(() => {
    if (!campaignId) return;
    const tick = () => apiGetCampaignStats(campaignId).then(setStats).catch(() => {});
    tick();
    pollRef.current = setInterval(tick, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [campaignId]);

  useEffect(() => {
    if (stats?.status === "done" && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      loadOverview(cap); // refresh "already sent" + audience after the run
    }
  }, [stats?.status, cap, loadOverview]);

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading…</p>
      </div>
    );
  }

  const aud = overview?.audience;
  const alreadySent = overview?.already_sent ?? 0;
  const willSend = aud ? Math.max(0, Math.min(aud.ready, cap - alreadySent)) : 0;

  const onSendTest = async () => {
    setBusy(true); setTestMsg("");
    try {
      const r = await apiSendDailyTest(testEmail.trim() || undefined);
      setTestMsg(`Test sent to ${r.to}. Check inbox + spam.`);
    } catch (e) {
      setTestMsg(`Failed: ${(e as Error)?.message ?? "send error"}`);
    } finally { setBusy(false); }
  };

  const onSend = async () => {
    if (willSend === 0) { setSendMsg("Nobody to send to right now (all eligible users are in their 7-day cooldown)."); return; }
    const ok = window.confirm(
      `Send "TopStock Daily" to ${willSend} user${willSend > 1 ? "s" : ""} now?\n\n` +
      `Subject: ${subject}\n\n` +
      `These are power users idle 7+ days. Sending sets a 7-day cooldown so nobody is emailed again this week.` +
      (alreadySent ? `\n\n(${alreadySent} already sent today — this tops up to the ${cap} cap.)` : ""),
    );
    if (!ok) return;
    setBusy(true); setSendMsg(""); setStats(null);
    try {
      const r = await apiSendDailyEmail({ subject: subjectDirty.current ? subject.trim() : undefined, cap });
      setCampaignId(r.campaign_id);
      setSendMsg(`Started → sending to ${r.will_send} users in the background…`);
    } catch (e) {
      setSendMsg(`Failed: ${(e as Error)?.message ?? "send error"}`);
    } finally { setBusy(false); }
  };

  const card = "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5";

  return (
    <div className="max-w-5xl mx-auto py-8 px-3">
      <div className="rank-page-header mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="rank-page-eyebrow">// ADMIN</p>
          <h1 className="rank-page-title">Daily Email</h1>
          {overview && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {overview.date_label}{overview.mood ? ` · ${overview.mood}` : ""}
            </p>
          )}
        </div>
        <a
          href="/admin/analytics"
          className={`${btnBase} border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30`}
        >
          ← Analytics
        </a>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* ---- Left: audience + controls ---- */}
        <div className="space-y-5">
          <div className={card}>
            <h2 className="text-sm font-bold text-[var(--text)] mb-3">Who gets it today</h2>
            {overviewErr && <p className="text-[var(--negative)] text-sm">{overviewErr}</p>}
            {aud && (
              <>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <Metric label="Idle power users" value={aud.eligible} />
                  <Metric label="In cooldown" value={aud.in_cooldown} muted />
                  <Metric label="Will send now" value={willSend} accent />
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Power users (watchlist or portfolio) idle {aud.lapsed_days}+ days, minus anyone
                  emailed in the last {aud.cooldown_days} days.
                  {alreadySent > 0 && <> <b className="text-[var(--text)]">{alreadySent}</b> already sent today.</>}
                </p>
                <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-3">
                  Daily cap
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={cap}
                    onChange={(e) => setCap(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                    className="w-24 px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                  />
                  <span className="text-xs">max recipients / day</span>
                </label>
              </>
            )}
          </div>

          {/* What actually filled today — a block that came up empty is the one
              thing worth spotting before pressing Send. */}
          {overview && overview.blocks?.length > 0 && (
            <div className={card}>
              <h2 className="text-sm font-bold text-[var(--text)] mb-3">What&apos;s in today&apos;s mail</h2>
              <div className="space-y-1.5">
                {overview.blocks.map((b) => (
                  <div key={b.key} className="flex items-start justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: b.ok ? "var(--positive)" : "var(--border)" }}
                      />
                      <span className={b.ok ? "text-[var(--text)]" : "text-[var(--text-muted)]"}>{b.label}</span>
                    </span>
                    <span className="text-xs text-[var(--text-muted)] text-right">{b.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {overview && overview.buys.length > 0 && (
            <div className={card}>
              <h2 className="text-sm font-bold text-[var(--text)] mb-3">
                Featured buys ({overview.buys.length}
                {overview.buys_total > overview.buys.length ? ` of ${overview.buys_total}` : ""})
              </h2>
              <div className="space-y-1.5">
                {overview.buys.map((b) => (
                  <div key={b.code} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-[var(--text)]">
                      {b.code}
                      <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">{b.name}</span>
                    </span>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      {b.is_new && (
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "var(--positive)", color: "#fff" }}
                        >
                          New
                        </span>
                      )}
                      {b.change_pct != null && (
                        <span style={{ color: b.change_pct >= 0 ? "var(--positive)" : "var(--negative)" }}>
                          {b.change_pct >= 0 ? "+" : "−"}{Math.abs(b.change_pct).toFixed(1)}%
                        </span>
                      )}
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--primary)", color: "#fff" }}
                      >
                        {b.strength === "strong" ? "Strong buy" : "Buy"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={card}>
            <h2 className="text-sm font-bold text-[var(--text)] mb-3">Send</h2>
            <div className="space-y-3">
              <label className="block text-xs text-[var(--text-muted)]">
                Subject line
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => { subjectDirty.current = true; setSubject(e.target.value); }}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
                />
              </label>

              <input
                type="email"
                placeholder="Test to (blank = your account email)"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
              />

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={onSendTest}
                  disabled={busy}
                  className={`${btnBase} border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30`}
                >
                  ✉ Send test to me
                </button>
                <button
                  onClick={onSend}
                  disabled={busy || willSend === 0}
                  className={`${btnBase} bg-[var(--primary)] text-white hover:opacity-90`}
                >
                  ▶ Send to {willSend} users
                </button>
              </div>

              {testMsg && <p className="text-xs text-[var(--text-muted)]">{testMsg}</p>}
              {sendMsg && <p className="text-xs text-[var(--text-muted)]">{sendMsg}</p>}
            </div>
          </div>

          {(campaignId || stats) && (
            <div className={card}>
              <h2 className="text-sm font-bold text-[var(--text)] mb-3">
                Progress {stats?.status === "done" ? "· done" : "· sending…"}
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric label="Sent" value={stats?.sent ?? 0} color="var(--positive)" />
                <Metric label="Failed" value={stats?.failed ?? 0} color="var(--negative)" />
                <Metric label="Opened" value={stats?.opened ?? 0} color="var(--primary)" />
              </div>
              {campaignId && <p className="text-[11px] text-[var(--text-muted)] mt-3">id: {campaignId}</p>}
            </div>
          )}
        </div>

        {/* ---- Right: live preview of the exact email ---- */}
        <div className={card}>
          <h2 className="text-sm font-bold text-[var(--text)] mb-3">Preview · the email everyone gets</h2>
          {previewErr && <p className="text-[var(--negative)] text-sm">{previewErr}</p>}
          <iframe
            title="Daily email preview"
            srcDoc={previewHtml}
            sandbox=""
            className="w-full h-[640px] rounded-lg border border-[var(--border)] bg-white"
          />
        </div>
      </div>
    </div>
  );
}

function Metric({
  label, value, color, muted, accent,
}: { label: string; value: number; color?: string; muted?: boolean; accent?: boolean }) {
  const c = color ?? (accent ? "var(--primary)" : muted ? "var(--text-muted)" : "var(--text)");
  return (
    <div className="rounded-lg border border-[var(--border)] p-2">
      <div className="text-xl font-bold" style={{ color: c }}>{value}</div>
      <div className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">{label}</div>
    </div>
  );
}
