"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { apiGetAdminOffer, apiSetAdminOffer, type AdminOfferState } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { toast } from "@/lib/toast";

/**
 * The reader's own ৳99 month (backend `payments.set_offer_open`): start or end
 * it for everyone. Ending it removes the homepage banner and the card in the
 * pay box (other server workers follow within about 30 seconds); readers who
 * already paid keep their days.
 */
export default function AdminOfferSwitch() {
  const [state, setState] = useState<AdminOfferState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    apiGetAdminOffer()
      .then(setState)
      .catch((e: Error) => setError(e?.message ?? "Failed to load"));
  }, []);

  useEffect(load, [load]);

  const flip = async () => {
    if (!state) return;
    const next = !state.open;
    const ask = next
      ? `Start the ৳${state.amount} offer again? Every free reader who hasn't used it will see the banner and the offer card.`
      : `End the ৳${state.amount} offer now? The banner and the offer card disappear for everyone. Readers who already paid keep their days.`;
    if (!window.confirm(ask)) return;
    setBusy(true);
    try {
      setState(await apiSetAdminOffer(next));
      toast({ message: next ? "Offer started" : "Offer ended", tone: "success" });
    } catch (e) {
      toast({ message: (e as Error)?.message || "Could not change the offer", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const p = state?.payments;
  return (
    <Card as="section" padding="none" className="p-4 sm:p-5 mb-5" aria-labelledby="admin-offer-h">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="admin-offer-h" className="text-base font-semibold text-text-main">
            ৳{state?.amount ?? 99} offer for free readers
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            One month for ৳{state?.amount ?? 99} instead of ৳{state?.list_amount ?? 199}, once per account. Shown on top of
            the homepage and as its own card on /premium while it is running.
          </p>
        </div>
        {state && (
          <span className={`text-sm font-semibold ${state.open ? "text-positive" : "text-text-muted"}`}>
            {state.open ? "Running" : "Ended"}
          </span>
        )}
      </div>

      {error && <p className="form-error mt-3">{error}</p>}

      {state && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-2xl font-bold text-text-main tabular-nums">{p?.accepted ?? 0}</p>
              <p className="text-xs text-text-muted">paid, accepted</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-main tabular-nums">{p?.pending ?? 0}</p>
              <p className="text-xs text-text-muted">paid, to check</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-main tabular-nums">{p?.revoked ?? 0}</p>
              <p className="text-xs text-text-muted">revoked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-main tabular-nums">{state.not_interested}</p>
              <p className="text-xs text-text-muted">said not interested</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant={state.open ? "danger" : "primary"} onClick={flip} disabled={busy}>
              {busy ? "Saving…" : state.open ? "End the offer now" : "Start the offer again"}
            </Button>
            {state.changed_at && (
              <span className="text-xs text-text-muted">
                Last changed {formatDate(state.changed_at)}
                {state.changed_by ? ` by ${state.changed_by}` : ""}
              </span>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
