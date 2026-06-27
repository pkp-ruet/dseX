"use client";

import { useEffect, useMemo, useState } from "react";
import { createAlert, updateAlert, deleteAlert, type PriceAlert } from "@/lib/price-alerts";

interface Props {
  code: string;
  ltp: number | null;
  w52High?: number | null;
  w52Low?: number | null;
  /** The currently-armed alert for this code, if editing one. */
  existing?: PriceAlert | null;
  onClose: () => void;
}

function fmt(n: number): string {
  // Trim trailing zeros — ৳120 not ৳120.00, but keep ৳12.5.
  return Number(n.toFixed(2)).toString();
}

/**
 * Set / edit a single price target. Direction (rises-to / drops-to) is inferred
 * from the current price so the user never picks it. Shared by the stock-hero
 * button and the watchlist row action.
 */
export default function PriceAlertModal({ code, ltp, w52High, w52Low, existing, onClose }: Props) {
  const [price, setPrice] = useState(
    existing ? fmt(existing.target_price) : ltp != null ? ltp.toFixed(1) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const target = parseFloat(price);
  const targetValid = !isNaN(target) && target > 0;

  // Direction preview — mirrors the backend's inference (target >= ltp ⇒ above).
  const direction: "above" | "below" | null =
    ltp == null ? null : target >= ltp ? "above" : "below";

  const chips = useMemo(() => {
    const out: { label: string; value: number; tone: "up" | "down" | "flat" }[] = [];
    if (ltp != null && ltp > 0) {
      out.push({ label: "+5%", value: ltp * 1.05, tone: "up" });
      out.push({ label: "+10%", value: ltp * 1.1, tone: "up" });
      out.push({ label: "−5%", value: ltp * 0.95, tone: "down" });
      out.push({ label: "−10%", value: ltp * 0.9, tone: "down" });
    }
    if (w52High != null && w52High > 0) out.push({ label: `52W high`, value: w52High, tone: "up" });
    if (w52Low != null && w52Low > 0) out.push({ label: `52W low`, value: w52Low, tone: "down" });
    return out;
  }, [ltp, w52High, w52Low]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!targetValid) return setError("Enter a valid target price.");
    setSubmitting(true);
    try {
      const ok = existing
        ? await updateAlert(existing.id, target)
        : await createAlert(code, target);
      if (!ok) {
        setError("Couldn't save the alert. Try again.");
        setSubmitting(false);
        return;
      }
      onClose();
    } catch {
      setError("Couldn't save the alert. Try again.");
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    if (!existing) return;
    setSubmitting(true);
    try {
      await deleteAlert(existing.id);
      onClose();
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="atp-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pa-title"
      onClick={() => !submitting && onClose()}
    >
      <div className="atp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="atp-modal-header">
          <h2 id="pa-title">{existing ? `Edit ${code} alert` : `Set ${code} price alert`}</h2>
          <button
            type="button"
            onClick={onClose}
            className="atp-close"
            aria-label="Close"
            disabled={submitting}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="atp-form">
          {ltp != null && (
            <div className="pa-current">
              <span>Now</span>
              <b>৳{ltp.toFixed(1)}</b>
            </div>
          )}

          <label className="atp-field">
            <span>Target price (৳)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              autoFocus
              required
            />
          </label>

          {chips.length > 0 && (
            <div className="pa-chips">
              {chips.map((c) => (
                <button
                  type="button"
                  key={c.label}
                  className={`pa-chip ${c.tone === "up" ? "pa-chip--up" : c.tone === "down" ? "pa-chip--down" : ""}`}
                  onClick={() => setPrice(fmt(c.value))}
                >
                  {c.label} · ৳{fmt(c.value)}
                </button>
              ))}
            </div>
          )}

          {targetValid && (
            <p className="pa-sentence">
              {direction == null ? (
                <>Alert me when <b>{code}</b> reaches <b>৳{fmt(target)}</b></>
              ) : direction === "above" ? (
                <>Alert me when <b>{code}</b> rises to <b>৳{fmt(target)}</b></>
              ) : (
                <>Alert me when <b>{code}</b> drops to <b>৳{fmt(target)}</b></>
              )}
            </p>
          )}

          {error && <p className="atp-error">{error}</p>}

          <div className="atp-actions">
            {existing ? (
              <button
                type="button"
                onClick={handleRemove}
                className="atp-btn atp-btn-danger"
                disabled={submitting}
              >
                Remove
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="atp-btn atp-btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
            )}
            <button type="submit" className="atp-btn atp-btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : existing ? "Update alert" : "Set alert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
