"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiAddHolding } from "@/lib/api";
import { toast } from "@/lib/toast";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";

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
  const { bn } = useLang();
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPrice(ltp != null ? ltp.toFixed(1) : "");
      setQty("");
      setError("");
    }
  }, [open, ltp]);

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
    if (isNaN(p) || p <= 0) return setError(bn ? "সঠিক কেনার দাম লিখুন।" : "Please enter the price you paid.");
    if (isNaN(q) || q <= 0) return setError(bn ? "সঠিক শেয়ার সংখ্যা লিখুন।" : "Please enter how many shares you bought.");
    setSubmitting(true);
    try {
      await apiAddHolding({ trading_code: code, buy_price: p, qty: q });
      toast({
        message: <T en={`${code} is now in your portfolio`} bn={`${code} আপনার পোর্টফোলিওতে যোগ হয়েছে`} />,
        tone: "success",
      });
      router.push("/portfolio");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : bn ? "যোগ করা যায়নি। আবার চেষ্টা করুন।" : "We couldn't add it. Please try again.",
      );
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
        title={bn ? "পোর্টফোলিওতে যোগ করুন" : "Add to your portfolio"}
        aria-label={bn ? `${code} পোর্টফোলিওতে যোগ করুন` : `Add ${code} to your portfolio`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>
          <T en="Portfolio" bn="পোর্টফোলিও" />
        </span>
      </Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={<T en={`Add ${code} to your portfolio`} bn={`${code} পোর্টফোলিওতে যোগ করুন`} />}
        dismissible={!submitting}
      >
        <form onSubmit={handleSubmit} className="atp-form">
          <label className="atp-field">
            <span>
              <T en="Price you paid (৳)" bn="কেনার দাম (৳)" />
            </span>
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
            <span>
              <T en="Number of shares" bn="শেয়ারের সংখ্যা" />
            </span>
            <input
              type="number"
              step="1"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder={bn ? "যেমন 100" : "For example, 100"}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="mt-1 grid grid-cols-2 gap-2">
            <Button type="button" variant="quiet" block onClick={() => setOpen(false)} disabled={submitting}>
              <T en="Cancel" bn="বাতিল" />
            </Button>
            <Button type="submit" variant="primary" block disabled={submitting}>
              {submitting ? <T en="Adding…" bn="যোগ হচ্ছে…" /> : <T en="Add to portfolio" bn="পোর্টফোলিওতে যোগ করুন" />}
            </Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
