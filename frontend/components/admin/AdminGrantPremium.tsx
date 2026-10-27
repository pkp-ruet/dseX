"use client";

import { useEffect, useState } from "react";
import { apiAdminManualPayment, apiAdminSearchUsers, type AdminUserHit } from "@/lib/api";
import { METHOD_LABEL, PAID_PLANS, planByKey } from "@/lib/premium-plans";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { toast } from "@/lib/toast";

const METHODS = ["cash", "bkash", "nagad", "bank", "other"] as const;

const ERRORS: Record<string, string> = {
  bad_plan: "Pick a plan.",
  bad_days: "Days must be between 1 and 3650.",
  bad_amount: "Amount must be between ৳0 and ৳100,000.",
  bad_method: "Pick how they paid.",
  bad_sender: "That is not a Bangladeshi mobile number (01XXXXXXXXX).",
  user_not_found: "That account no longer exists.",
};

function fmtDate(iso: string | Date | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function planState(u: AdminUserHit): string {
  if (!u.is_premium) return u.premium_until ? `Free · Premium ended ${fmtDate(u.premium_until)}` : "Free";
  const how = u.premium_source === "paid" ? "paid" : u.premium_source === "trial" ? "free month" : "given by admin";
  return `Premium until ${fmtDate(u.premium_until)} · ${how}`;
}

/**
 * "Give Premium" on /admin/payments: find an account by email, phone or name
 * and give it a plan by hand. The backend (payments.manual_payment) stores it
 * as an accepted payment with the taka typed here, so it counts in the
 * month's total and shows in the list below — where Revoke takes the days
 * back and Change plan works as for any payment.
 */
export default function AdminGrantPremium({ onDone }: { onDone: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<AdminUserHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [user, setUser] = useState<AdminUserHit | null>(null);
  const [plan, setPlan] = useState<string>(PAID_PLANS[0].key);
  const [days, setDays] = useState(String(PAID_PLANS[0].days));
  const [amount, setAmount] = useState(String(PAID_PLANS[0].amount));
  const [method, setMethod] = useState<string>("cash");
  const [sender, setSender] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits(null);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      setSearching(true);
      apiAdminSearchUsers(term)
        .then((r) => live && setHits(r.items))
        .catch(() => live && setHits([]))
        .finally(() => live && setSearching(false));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q]);

  const pickPlan = (key: string) => {
    setPlan(key);
    const p = planByKey(key);
    setDays(p ? String(p.days) : "");
    setAmount(p ? String(p.amount) : "0");
  };

  const reset = () => {
    setUser(null);
    setQ("");
    setHits(null);
    pickPlan(PAID_PLANS[0].key);
    setMethod("cash");
    setSender("");
    setNote("");
    setError("");
  };

  const daysN = Number(days);
  const amountN = Number(amount);
  const valid =
    !!user && Number.isInteger(daysN) && daysN >= 1 && daysN <= 3650 &&
    Number.isInteger(amountN) && amountN >= 0 && amountN <= 100000;

  // Days start after any Premium the account still has — same as the backend.
  const endsOn = (() => {
    if (!user || !valid) return null;
    const now = Date.now();
    const cur = user.premium_until ? new Date(user.premium_until).getTime() : 0;
    return new Date(Math.max(now, cur) + daysN * 86_400_000);
  })();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !valid) return;
    const who = user.name || user.email || user.phone || user.user_id;
    if (!window.confirm(
      `Give ${who} ${daysN} days of Premium and record ৳${amountN.toLocaleString("en-IN")} ` +
      `(${METHOD_LABEL[method] ?? method})?\n\nPremium until ${fmtDate(endsOn)}.`,
    )) return;
    setBusy(true);
    setError("");
    try {
      await apiAdminManualPayment({
        user_id: user.user_id,
        plan,
        days: daysN,
        amount: amountN,
        method,
        sender: sender.trim() || undefined,
        note: note.trim() || undefined,
      });
      toast({ message: `Premium given · ৳${amountN.toLocaleString("en-IN")} recorded`, tone: "success" });
      reset();
      onDone();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(ERRORS[code] ?? (code || "Could not give Premium"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card as="section" padding="none" className="p-4 sm:p-5 mb-5" aria-labelledby="grant-title">
      <h2 id="grant-title" className="text-base font-bold text-text-main">Give Premium by hand</h2>
      <p className="text-sm text-text-muted mt-1">
        For cash, a transfer the reader never entered, or a gift. It is saved as an accepted payment,
        so the amount counts in this month&apos;s total, and Revoke takes the days back.
      </p>

      {!user ? (
        <div className="mt-4">
          <label htmlFor="grant-search" className="block text-sm font-semibold text-text-main mb-1">
            Find the account
          </label>
          <input
            id="grant-search"
            type="search"
            className="input-field"
            placeholder="Email, phone or name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
          />
          {searching && <p className="text-sm text-text-muted mt-2">Searching…</p>}
          {!searching && hits && hits.length === 0 && (
            <p className="text-sm text-text-muted mt-2">No account matches that.</p>
          )}
          {hits && hits.length > 0 && (
            <ul className="mt-2 flex flex-col divide-y divide-border border border-border rounded-lg">
              {hits.map((u) => (
                <li key={u.user_id}>
                  <button
                    type="button"
                    onClick={() => setUser(u)}
                    className="w-full text-left px-3 py-2.5 min-h-10 hover:bg-surface-2 active:bg-surface-2"
                  >
                    <span className="block text-sm font-semibold text-text-main">{u.name || "No name"}</span>
                    <span className="block text-sm text-text-muted break-words">
                      {[u.email, u.phone].filter(Boolean).join(" · ") || u.user_id}
                    </span>
                    <span className={`block text-xs ${u.is_premium ? "text-positive" : "text-text-muted"}`}>
                      {planState(u)}
                      {u.payments ? ` · ${u.payments} payment${u.payments === 1 ? "" : "s"}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-main">{user.name || "No name"}</p>
              <p className="text-sm text-text-muted break-words">
                {[user.email, user.phone].filter(Boolean).join(" · ") || user.user_id}
              </p>
              <p className={`text-xs ${user.is_premium ? "text-positive" : "text-text-muted"}`}>{planState(user)}</p>
            </div>
            <Button type="button" variant="link" size="sm" onClick={reset}>Change</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="grant-plan" className="block text-sm font-semibold text-text-main mb-1">Plan</label>
              <select id="grant-plan" className="input-field" value={plan} onChange={(e) => pickPlan(e.target.value)}>
                {PAID_PLANS.map((p) => (
                  <option key={p.key} value={p.key}>{p.name} · ৳{p.amount}</option>
                ))}
                <option value="custom">Custom days</option>
              </select>
            </div>
            <div>
              <label htmlFor="grant-days" className="block text-sm font-semibold text-text-main mb-1">Days</label>
              <input
                id="grant-days"
                type="number"
                inputMode="numeric"
                min={1}
                max={3650}
                className="input-field"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="grant-amount" className="block text-sm font-semibold text-text-main mb-1">
                Amount taken (৳)
              </label>
              <input
                id="grant-amount"
                type="number"
                inputMode="numeric"
                min={0}
                max={100000}
                className="input-field"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="grant-method" className="block text-sm font-semibold text-text-main mb-1">Paid by</label>
              <select id="grant-method" className="input-field" value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="grant-sender" className="block text-sm font-semibold text-text-main mb-1">
                Sent from (optional)
              </label>
              <input
                id="grant-sender"
                type="tel"
                inputMode="tel"
                className="input-field"
                placeholder="01XXXXXXXXX"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="grant-note" className="block text-sm font-semibold text-text-main mb-1">Note (optional)</label>
            <input
              id="grant-note"
              type="text"
              maxLength={200}
              className="input-field"
              placeholder="e.g. paid in cash at the office"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!valid || busy}>
              {busy ? "Saving…" : `Give Premium · ৳${valid ? amountN.toLocaleString("en-IN") : "—"}`}
            </Button>
            {endsOn && <span className="text-sm text-text-muted">Premium until {fmtDate(endsOn)}</span>}
          </div>
        </form>
      )}
    </Card>
  );
}
