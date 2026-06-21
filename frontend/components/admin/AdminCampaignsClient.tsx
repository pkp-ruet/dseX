"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  apiGetCampaignAudience,
  apiPreviewCampaign,
  apiSendTestEmail,
  apiSendCampaign,
  apiGetCampaignStats,
  type CampaignAudience,
  type CampaignSegment,
  type CampaignStats,
} from "@/lib/api";

const SEGMENTS: { key: CampaignSegment; label: string; hint: string }[] = [
  { key: "portfolio", label: "Portfolio holders", hint: "Value + P&L since they left" },
  { key: "watchlist", label: "Watchlist watchers", hint: "Their tickers, moves & alerts" },
  { key: "cold", label: "Cold (no lists)", hint: "Market FOMO + Strong Buy picks" },
];

const btnBase =
  "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export default function AdminCampaignsClient() {
  const router = useRouter();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();

  const [inactiveDays, setInactiveDays] = useState(30);
  const [audience, setAudience] = useState<CampaignAudience | null>(null);
  const [audienceErr, setAudienceErr] = useState("");

  const [selected, setSelected] = useState<Set<CampaignSegment>>(
    new Set(["portfolio", "watchlist", "cold"]),
  );
  const [previewSeg, setPreviewSeg] = useState<CampaignSegment>("watchlist");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewErr, setPreviewErr] = useState("");

  const [name, setName] = useState("");
  const [limit, setLimit] = useState("50");
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

  // --- audience counts ---
  const loadAudience = useCallback((days: number) => {
    setAudienceErr("");
    apiGetCampaignAudience(days)
      .then(setAudience)
      .catch((e: Error) => setAudienceErr(e?.message ?? "Failed to load audience"));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadAudience(inactiveDays);
  }, [isAdmin, inactiveDays, loadAudience]);

  // --- preview ---
  useEffect(() => {
    if (!isAdmin) return;
    setPreviewErr("");
    apiPreviewCampaign(previewSeg)
      .then(setPreviewHtml)
      .catch((e: Error) => setPreviewErr(e?.message ?? "Preview failed"));
  }, [isAdmin, previewSeg]);

  // --- stats polling while a send is running ---
  useEffect(() => {
    if (!campaignId) return;
    const tick = () =>
      apiGetCampaignStats(campaignId).then(setStats).catch(() => {});
    tick();
    pollRef.current = setInterval(tick, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [campaignId]);

  useEffect(() => {
    if (stats?.status === "done" && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [stats?.status]);

  if (isLoading || (!isAdmin)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading…</p>
      </div>
    );
  }

  const toggleSeg = (k: CampaignSegment) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const targetCount = audience
    ? SEGMENTS.filter((s) => selected.has(s.key)).reduce((n, s) => n + audience.by_segment[s.key], 0)
    : 0;

  const onSendTest = async () => {
    setBusy(true); setTestMsg("");
    try {
      const r = await apiSendTestEmail(previewSeg, testEmail.trim() || undefined);
      setTestMsg(`Test (${previewSeg}) sent to ${r.to}. Check inbox + spam.`);
    } catch (e) {
      setTestMsg(`Failed: ${(e as Error)?.message ?? "send error"}`);
    } finally { setBusy(false); }
  };

  const onSendCampaign = async () => {
    if (selected.size === 0) { setSendMsg("Select at least one segment."); return; }
    const lim = limit.trim() ? Number(limit) : undefined;
    const limLabel = lim ? `${lim} (warm-up batch)` : `all ${targetCount}`;
    const ok = window.confirm(
      `Send "${name || "auto-named"}" to ${limLabel} of ${targetCount} eligible users` +
      `\n\nSegments: ${[...selected].join(", ")}\nInactive ≥ ${inactiveDays} days` +
      `\n\nReminder: warm up a new sending domain — start small (e.g. 50), ramp up over a few days.`,
    );
    if (!ok) return;
    setBusy(true); setSendMsg(""); setStats(null);
    try {
      const r = await apiSendCampaign({
        name: name.trim() || undefined,
        segments: [...selected],
        inactive_days: inactiveDays,
        limit: lim,
      });
      setCampaignId(r.campaign_id);
      setSendMsg(`Started "${r.campaign_id}" → ${r.eligible} eligible. Sending in background…`);
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
          <h1 className="rank-page-title">Email Campaigns</h1>
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
            <h2 className="text-sm font-bold text-[var(--text)] mb-3">Audience</h2>
            <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-3">
              Inactive for at least
              <input
                type="number"
                min={1}
                max={3650}
                value={inactiveDays}
                onChange={(e) => setInactiveDays(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
              />
              days
            </label>

            {audienceErr && <p className="text-[var(--negative)] text-sm">{audienceErr}</p>}
            {audience && (
              <div className="grid grid-cols-3 gap-2 text-center">
                {SEGMENTS.map((s) => (
                  <label
                    key={s.key}
                    className={`cursor-pointer rounded-lg border p-2 transition-colors ${
                      selected.has(s.key)
                        ? "border-[var(--primary)] bg-[var(--primary)]/5"
                        : "border-[var(--border)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selected.has(s.key)}
                      onChange={() => toggleSeg(s.key)}
                    />
                    <div className="text-lg font-bold text-[var(--text)]">
                      {audience.by_segment[s.key]}
                    </div>
                    <div className="text-[11px] font-semibold text-[var(--text)]">{s.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">{s.hint}</div>
                  </label>
                ))}
              </div>
            )}
            {audience && (
              <p className="text-xs text-[var(--text-muted)] mt-3">
                <b className="text-[var(--text)]">{targetCount}</b> selected · {audience.eligible} total
                eligible · {audience.opted_out} opted-out · {audience.no_email} no email
              </p>
            )}
          </div>

          <div className={card}>
            <h2 className="text-sm font-bold text-[var(--text)] mb-3">Send</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Campaign name (optional, e.g. reengage-jun)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
              />
              <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                Limit (warm-up)
                <input
                  type="number"
                  min={1}
                  placeholder="all"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="w-24 px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                />
                <span className="text-xs">blank = all</span>
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
                  ✉ Send test ({previewSeg})
                </button>
                <button
                  onClick={onSendCampaign}
                  disabled={busy || selected.size === 0 || targetCount === 0}
                  className={`${btnBase} bg-[var(--primary)] text-white hover:opacity-90`}
                >
                  ▶ Send campaign
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
                <Stat label="Sent" value={stats?.sent ?? 0} color="var(--positive)" />
                <Stat label="Failed" value={stats?.failed ?? 0} color="var(--negative)" />
                <Stat label="Opened" value={stats?.opened ?? 0} color="var(--primary)" />
              </div>
              {campaignId && (
                <p className="text-[11px] text-[var(--text-muted)] mt-3">id: {campaignId}</p>
              )}
            </div>
          )}
        </div>

        {/* ---- Right: live preview ---- */}
        <div className={card}>
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h2 className="text-sm font-bold text-[var(--text)]">Preview</h2>
            <div className="flex gap-1">
              {SEGMENTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setPreviewSeg(s.key)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    previewSeg === s.key
                      ? "bg-[var(--primary)] text-white"
                      : "border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--border)]/30"
                  }`}
                >
                  {s.key}
                </button>
              ))}
            </div>
          </div>
          {previewErr && <p className="text-[var(--negative)] text-sm">{previewErr}</p>}
          <iframe
            title="Email preview"
            srcDoc={previewHtml}
            sandbox=""
            className="w-full h-[640px] rounded-lg border border-[var(--border)] bg-white"
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-2">
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[11px] text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
