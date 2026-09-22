"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiAddHolding } from "@/lib/api";
import { toast } from "@/lib/toast";
import Button from "@/components/ui/Button";

interface Props {
  code: string;
  ltp: number | null;
}

export default function AddToPortfolioButton({ code, ltp }: Props) {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState(ltp != null ? ltp.toFixed(1) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPrice(ltp != null ? ltp.toFixed(1) : "");
      setQty("");
      setError("");
    }
  }, [open, ltp]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function handleClick() {
    if (isLoading) return;
    if (!isLoggedIn) {
      router.push("/register");
      return;
    }
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const p = parseFloat(price);
    const q = parseInt(qty, 10);
    if (isNaN(p) || p <= 0) return setError("Enter a valid buy price.");
    if (isNaN(q) || q <= 0) return setError("Enter a valid quantity.");
    setSubmitting(true);
    try {
      await apiAddHolding({ trading_code: code, buy_price: p, qty: q });
      toast({ message: `${code} added to your portfolio`, tone: "success" });
      router.push("/portfolio");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="quiet"
        size="sm"
        onClick={handleClick}
        title="Add to portfolio"
        aria-label={`Add ${code} to portfolio`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Portfolio</span>
      </Button>

      {open && (
        <div
          className="atp-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="atp-title"
          onClick={() => !submitting && setOpen(false)}
        >
          <div className="atp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="atp-modal-header">
              <h2 id="atp-title">Add {code} to portfolio</h2>
              <Button
                type="button"
                variant="link"
                size="sm"
                iconOnly
                onClick={() => setOpen(false)}
                aria-label="Close"
                disabled={submitting}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="atp-form">
              <label className="atp-field">
                <span>Buy price (৳)</span>
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
              <label className="atp-field">
                <span>Quantity</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="e.g. 100"
                  required
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Button type="button" variant="quiet" block onClick={() => setOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" block disabled={submitting}>
                  {submitting ? "Adding…" : "Add to portfolio"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
