"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  apiAcceptPayment,
  apiChangePaymentPlan,
  apiGetAdminPayments,
  apiRevokePayment,
  type AdminPayment,
  type AdminPaymentsResponse,
} from "@/lib/api";
import { METHOD_LABEL, OWN_OFFER_PLAN, PAID_PLANS, TRANSFER_LABEL, planByKey } from "@/lib/premium-plans";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Tabs from "@/components/ui/Tabs";
import AdminGrantPremium from "@/components/admin/AdminGrantPremium";
import AdminOfferSwitch from "@/components/admin/AdminOfferSwitch";
import { toast } from "@/lib/toast";

type StatusTab = "pending" | "accepted" | "revoked" | "all";

const REASONS = ["No payment from this number", "No bank transfer with these details", "Wrong amount", "Already counted", "Refunded"];

/** Who paid, for confirm dialogs: the sender number, or the bank account ending. */
function payer(p: AdminPayment): string {
  if (p.method === "bank" && p.account_last4) return `account ending ${p.account_last4}`;
  return p.sender || p.name || p.email || "this account";
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const STATUS_TONE: Record<AdminPayment["status"], string> = {
  pending: "text-watch",
  accepted: "text-positive",
  revoked: "text-negative",
};

/**
 * /admin/payments — every bKash / Nagad / bank-transfer payment (backend
 * services/payments.py). Premium already started when the reader submitted;
 * here you match each one against the bKash / Nagad statement (sender number,
 * amount, time) or the bank statement (NPSB / BEFTN, the sending account's last
 * 4 digits, the reference, amount) and Accept it, or Revoke it — which takes
 * the plan's days back. A
 * "held" row (the account had a payment revoked before) only gets its days on
 * Accept. When the reader picked one plan but sent the money for another,
 * "Change plan" corrects it (before or after accepting): amount and days follow
 * the plan, and days already granted move by the difference. "Give Premium
 * by hand" (AdminGrantPremium) records a payment taken outside the pay box —
 * it lands here already accepted.
 */
export default function AdminPaymentsClient() {
  const router = useRouter();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();
  const [tab, setTab] = useState<StatusTab>("pending");
  const [data, setData] = useState<AdminPaymentsResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) router.replace("/login");
    else if (!isAdmin) router.replace("/");
  }, [isLoading, isLoggedIn, isAdmin, router]);

  const refetch = useCallback(() => {
    setLoadError("");
    apiGetAdminPayments(tab)
      .then(setData)
      .catch((err: Error) => setLoadError(err?.message ?? "Failed to load"));
  }, [tab]);

  useEffect(() => {
    if (isAdmin) refetch();
  }, [isAdmin, refetch]);

  const act = async (p: AdminPayment, kind: "accept" | "revoke") => {
    if (kind === "revoke") {
      const reason = reasons[p.id] || REASONS[0];
      if (!window.confirm(`Revoke ৳${p.amount} from ${payer(p)}? Their ${p.days} days are taken back.\n\nReason: ${reason}`)) return;
    }
    setBusyId(p.id);
    try {
      if (kind === "accept") await apiAcceptPayment(p.id);
      else await apiRevokePayment(p.id, reasons[p.id] || REASONS[0]);
      toast({ message: kind === "accept" ? "Accepted" : "Revoked — days taken back", tone: "success" });
      refetch();
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Could not update", tone: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const changePlan = async (p: AdminPayment) => {
    const next = planByKey(plans[p.id]);
    if (!next || next.key === p.plan) return;
    const diff = next.days - p.days;
    const effect = p.granted
      ? `Their Premium ${diff > 0 ? "gains" : "loses"} ${Math.abs(diff)} days.`
      : "No days are granted yet — the new plan's days come on Accept.";
    if (!window.confirm(
      `Change ${payer(p)}'s payment from ${planByKey(p.plan)?.name ?? p.plan} (৳${p.amount}) ` +
      `to ${next.name} (৳${next.amount})?

${effect}`,
    )) return;
    setBusyId(p.id);
    try {
      await apiChangePaymentPlan(p.id, next.key);
      toast({ message: `Plan changed to ${next.name} · ৳${next.amount}`, tone: "success" });
      setPlans((m) => {
        const rest = { ...m };
        delete rest[p.id];
        return rest;
      });
      refetch();
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Could not change the plan", tone: "error" });
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading || (!isAdmin && !loadError)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-text-muted">Loading…</p>
      </div>
    );
  }
  if (!isAdmin) return null;

  const counts = data?.counts;
  const items = data?.items ?? [];

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div>
          <p className="text-xs font-bold text-text-muted mb-1">Admin</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-main leading-tight">Payments</h1>
          <p className="text-sm text-text-muted mt-1">
            Premium started when the reader tapped &ldquo;I&apos;ve paid&rdquo;. Find each payment in the
            bKash / Nagad app by the sender number, amount and time — or, for a bank transfer, in the
            bank statement by the account ending, reference and amount — then accept it, or revoke it
            to take the days back.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="quiet" size="sm" onClick={refetch}>Reload</Button>
          <Link href="/admin/analytics" className="text-sm text-primary hover:underline whitespace-nowrap">
            ← Analytics
          </Link>
        </div>
      </div>

      {data && (
        <Card as="section" padding="none" className="p-4 sm:p-5 mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold text-text-main tabular-nums">{counts?.pending ?? 0}</p>
              <p className="text-xs text-text-muted">waiting to be checked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-main tabular-nums">৳{data.month.accepted.toLocaleString("en-IN")}</p>
              <p className="text-xs text-text-muted">accepted this month</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-main tabular-nums">৳{data.month.pending.toLocaleString("en-IN")}</p>
              <p className="text-xs text-text-muted">still to check this month</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-main tabular-nums">{counts?.revoked ?? 0}</p>
              <p className="text-xs text-text-muted">revoked, all time</p>
            </div>
          </div>
        </Card>
      )}

      <AdminOfferSwitch />

      <AdminGrantPremium onDone={refetch} />

      <Tabs<StatusTab>
        ariaLabel="Payment status"
        idBase="pay-tab"
        value={tab}
        onChange={setTab}
        className="mb-4"
        tabs={[
          { key: "pending", label: `To check${counts ? ` (${counts.pending})` : ""}` },
          { key: "accepted", label: "Accepted" },
          { key: "revoked", label: "Revoked" },
          { key: "all", label: "All" },
        ]}
      />

      {loadError && <p className="form-error mb-4">{loadError}</p>}

      <section className="flex flex-col gap-2.5" role="tabpanel" aria-labelledby={`pay-tab-${tab}`}>
        {items.length === 0 ? (
          <p className="text-sm text-text-muted py-10 text-center">Nothing here.</p>
        ) : (
          items.map((p) => (
            <Card key={p.id} padding="none" className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-lg font-bold text-text-main tabular-nums">
                  ৳{p.amount.toLocaleString("en-IN")}{" "}
                  <span className="text-sm font-semibold text-text-muted">
                    {METHOD_LABEL[p.method] ?? p.method} · {planByKey(p.plan)?.name ?? (p.plan === "custom" ? `${p.days} days` : p.plan)}
                  </span>
                </p>
                <span className="text-xs text-text-muted">{fmtTime(p.created_at)}</span>
              </div>
              <p className="mt-1 text-sm text-text-main tabular-nums">
                {p.method === "bank" && p.account_last4 ? (
                  <>
                    {TRANSFER_LABEL[p.transfer ?? ""] ?? "Transfer"} from account ending{" "}
                    <strong>{p.account_last4}</strong>
                    {p.reference ? <> · reference <strong className="break-all">{p.reference}</strong></> : " · no reference"}
                  </>
                ) : p.sender ? (
                  <>From <strong>{p.sender}</strong></>
                ) : (
                  "No sender number"
                )}
                {p.manual && (
                  <span className="text-text-muted">
                    {" "}· added by hand{p.created_by ? ` by ${p.created_by}` : ""}
                  </span>
                )}
              </p>
              {p.note && <p className="text-sm text-text-muted break-words">Note: {p.note}</p>}
              <p className="text-sm text-text-muted break-words">
                {p.name || "—"}{p.email ? ` · ${p.email}` : ""}{p.phone ? ` · ${p.phone}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className={`font-bold capitalize ${STATUS_TONE[p.status]}`}>{p.status}</span>
                {p.status === "pending" && p.transfer === "beftn" && (
                  <span className="text-text-muted">BEFTN can take until the next working day to arrive ·</span>
                )}
                {p.status === "pending" && (
                  <span className="text-text-muted">
                    {p.granted
                      ? `Premium on${p.premium_until_after ? ` until ${fmtTime(p.premium_until_after)}` : ""}`
                      : "Held — gets the days only when you accept"}
                  </span>
                )}
                {p.reason && <span className="text-text-muted">· {p.reason}</span>}
                {p.plan_changes?.map((c, i) => (
                  <span key={i} className="text-text-muted">
                    · plan changed from {planByKey(c.from)?.name ?? c.from}
                    {c.at ? ` on ${fmtTime(c.at)}` : ""}
                  </span>
                ))}
                {p.reviewed_at && <span className="text-text-muted">· checked {fmtTime(p.reviewed_at)}</span>}
              </div>
              {p.status !== "revoked" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {p.status === "pending" && (
                    <Button type="button" size="sm" onClick={() => void act(p, "accept")} disabled={busyId === p.id}>
                      Accept
                    </Button>
                  )}
                  <label htmlFor={`plan-${p.id}`} className="sr-only">Plan</label>
                  <select
                    id={`plan-${p.id}`}
                    className="input-field w-auto text-sm"
                    value={plans[p.id] ?? p.plan}
                    onChange={(e) => setPlans((m) => ({ ...m, [p.id]: e.target.value }))}
                  >
                    {[...PAID_PLANS, OWN_OFFER_PLAN].map((pl) => (
                      <option key={pl.key} value={pl.key}>{pl.name} · ৳{pl.amount}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="quiet"
                    size="sm"
                    onClick={() => void changePlan(p)}
                    disabled={busyId === p.id || !plans[p.id] || plans[p.id] === p.plan}
                  >
                    Change plan
                  </Button>
                  <label htmlFor={`reason-${p.id}`} className="sr-only">Reason to revoke</label>
                  <select
                    id={`reason-${p.id}`}
                    className="input-field w-auto text-sm"
                    value={reasons[p.id] || REASONS[0]}
                    onChange={(e) => setReasons((r) => ({ ...r, [p.id]: e.target.value }))}
                  >
                    {REASONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => void act(p, "revoke")}
                    disabled={busyId === p.id}
                  >
                    Revoke
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
