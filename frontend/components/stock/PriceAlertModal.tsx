"use client";

import { useMemo, useState } from "react";
import { createAlert, updateAlert, deleteAlert, type PriceAlert } from "@/lib/price-alerts";
import { toast } from "@/lib/toast";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import PremiumLockCard from "@/components/premium/PremiumLockCard";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

interface Props {
  code: string;
  ltp: number | null;
  w52High?: number | null;
  w52Low?: number | null;
  /** The currently-armed alert for this code, if editing one. */
  existing?: PriceAlert | null;
  /** A target to start from (the report's buy-below price). Wins over `existing`. */
  preset?: number | null;
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
export default function PriceAlertModal({ code, ltp, w52High, w52Low, existing, preset, onClose }: Props) {
  const { bn } = useLang();
  const [price, setPrice] = useState(
    preset != null && preset > 0
      ? fmt(preset)
      : existing ? fmt(existing.target_price) : ltp != null ? ltp.toFixed(1) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [atLimit, setAtLimit] = useState(false);

  const target = parseFloat(price);
  const targetValid = !isNaN(target) && target > 0;

  // Direction preview — mirrors the backend's inference (target >= ltp ⇒ above).
  const direction: "above" | "below" | null =
    ltp == null ? null : target >= ltp ? "above" : "below";

  const chips = useMemo(() => {
    const out: { key: string; en: string; bn: string; value: number; tone: "up" | "down" | "flat" }[] = [];
    if (ltp != null && ltp > 0) {
      out.push({ key: "+5", en: "+5%", bn: "+5%", value: ltp * 1.05, tone: "up" });
      out.push({ key: "+10", en: "+10%", bn: "+10%", value: ltp * 1.1, tone: "up" });
      out.push({ key: "-5", en: "−5%", bn: "−5%", value: ltp * 0.95, tone: "down" });
      out.push({ key: "-10", en: "−10%", bn: "−10%", value: ltp * 0.9, tone: "down" });
    }
    if (w52High != null && w52High > 0) out.push({ key: "hi", en: "This year's high", bn: "এ বছরের সর্বোচ্চ", value: w52High, tone: "up" });
    if (w52Low != null && w52Low > 0) out.push({ key: "lo", en: "This year's low", bn: "এ বছরের সর্বনিম্ন", value: w52Low, tone: "down" });
    return out;
  }, [ltp, w52High, w52Low]);

  const saveFailed = bn ? "অ্যালার্ট সেভ করা যায়নি। আবার চেষ্টা করুন।" : "We couldn't save the alert. Please try again.";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!targetValid) return setError(bn ? "সঠিক টার্গেট দাম লিখুন।" : "Please enter a target price.");
    setSubmitting(true);
    try {
      const ok = existing
        ? await updateAlert(existing.id, target)
        : await createAlert(code, target);
      if (ok === "limit") {
        setAtLimit(true);
        setSubmitting(false);
        return;
      }
      if (!ok) {
        setError(saveFailed);
        setSubmitting(false);
        return;
      }
      const at = `৳${target.toFixed(1)}`;
      toast({
        message: <T en={`We will alert you when ${code} reaches ${at}`} bn={`${code} ${at}-এ পৌঁছালে আমরা জানাব`} />,
        tone: "success",
      });
      onClose();
    } catch {
      setError(saveFailed);
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    if (!existing) return;
    setSubmitting(true);
    try {
      await deleteAlert(existing.id);
      toast({ message: <T en={`The alert for ${code} is removed`} bn={`${code}-এর অ্যালার্ট সরানো হয়েছে`} /> });
      onClose();
    } catch {
      setSubmitting(false);
    }
  }

  const t = `৳${fmt(target)}`;

  return (
    <Sheet
      open
      onClose={onClose}
      title={
        existing ? (
          <T en={`Change the ${code} price alert`} bn={`${code}-এর প্রাইস অ্যালার্ট বদলান`} />
        ) : (
          <T en={`Set a price alert for ${code}`} bn={`${code}-এর জন্য প্রাইস অ্যালার্ট দিন`} />
        )
      }
      dismissible={!submitting}
    >
      <form onSubmit={handleSubmit} className="atp-form">
        {ltp != null && (
          <div className="pa-current">
            <span>
              <T en="Price now" bn="এখনকার দাম" />
            </span>
            <b>৳{ltp.toFixed(1)}</b>
          </div>
        )}

        <label className="atp-field">
          <span>
            <T en="Target price (৳)" bn="টার্গেট দাম (৳)" />
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

        {chips.length > 0 && (
          <div className="pa-chips">
            {chips.map((c) => (
              <button
                type="button"
                key={c.key}
                className={`pa-chip ${c.tone === "up" ? "pa-chip--up" : c.tone === "down" ? "pa-chip--down" : ""}`}
                onClick={() => setPrice(fmt(c.value))}
              >
                <T en={c.en} bn={c.bn} /> · ৳{fmt(c.value)}
              </button>
            ))}
          </div>
        )}

        {targetValid && (
          <p className="pa-sentence">
            {direction == null ? (
              <T
                en={<>We will tell you when <b>{code}</b> reaches <b>{t}</b>.</>}
                bn={<><b>{code}</b> <b>{t}</b>-এ পৌঁছালে আমরা আপনাকে জানাব।</>}
              />
            ) : direction === "above" ? (
              <T
                en={<>We will tell you when <b>{code}</b> rises to <b>{t}</b>.</>}
                bn={<><b>{code}</b>-এর দাম বেড়ে <b>{t}</b> হলে আমরা আপনাকে জানাব।</>}
              />
            ) : (
              <T
                en={<>We will tell you when <b>{code}</b> falls to <b>{t}</b>.</>}
                bn={<><b>{code}</b>-এর দাম কমে <b>{t}</b> হলে আমরা আপনাকে জানাব।</>}
              />
            )}
          </p>
        )}

        {error && <p className="form-error">{error}</p>}
        {atLimit && <PremiumLockCard label={{ en: "More than 3 price alerts", bn: "3টির বেশি প্রাইস অ্যালার্ট" }} compact />}

        <div className="grid grid-cols-2 gap-2 mt-4">
          {existing ? (
            <Button type="button" variant="danger" block onClick={handleRemove} disabled={submitting}>
              <T en="Remove" bn="সরিয়ে দিন" />
            </Button>
          ) : (
            <Button type="button" variant="quiet" block onClick={onClose} disabled={submitting}>
              <T en="Cancel" bn="বাতিল" />
            </Button>
          )}
          <Button type="submit" variant="primary" block disabled={submitting}>
            {submitting ? (
              <T en="Saving…" bn="সেভ হচ্ছে…" />
            ) : existing ? (
              <T en="Save changes" bn="পরিবর্তন সেভ করুন" />
            ) : (
              <T en="Set alert" bn="অ্যালার্ট দিন" />
            )}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
