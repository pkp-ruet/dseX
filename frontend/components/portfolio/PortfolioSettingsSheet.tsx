"use client";

import { useEffect, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { apiPutPortfolioSettings, type PortfolioSettings } from "@/lib/api";
import { toast } from "@/lib/toast";

/**
 * The reader's own cost rates for the net figures: brokerage fee per trade and
 * the tax withheld on cash dividends (10% with a TIN, 15% without).
 */
export default function PortfolioSettingsSheet({
  open,
  settings,
  onClose,
  onSaved,
}: {
  open: boolean;
  settings: PortfolioSettings;
  onClose: () => void;
  onSaved: (s: PortfolioSettings) => void;
}) {
  const [fee, setFee] = useState(String(settings.fee_pct));
  const [tax, setTax] = useState(String(settings.div_tax_pct));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFee(String(settings.fee_pct));
    setTax(String(settings.div_tax_pct));
    setError("");
  }, [open, settings]);

  async function save() {
    const f = parseFloat(fee);
    const t = parseFloat(tax);
    if (!Number.isFinite(f) || f < 0 || f > 2) return setError("Fee should be between 0% and 2%.");
    if (!Number.isFinite(t) || t < 0 || t > 30) return setError("Tax should be between 0% and 30%.");
    setSaving(true);
    try {
      const res = await apiPutPortfolioSettings({ fee_pct: f, div_tax_pct: t });
      onSaved(res.settings);
      toast({ message: "Rates saved", tone: "success" });
      onClose();
    } catch {
      setError("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!saving}
      title="Your fee and tax rates"
      bn="আপনার খরচ ও করের হার"
      footer={
        <Button type="button" variant="primary" block onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pfs-fee" className="text-sm font-semibold text-text-main">
            Brokerage fee per trade (%)
          </label>
          <input
            id="pfs-fee"
            type="number"
            inputMode="decimal"
            step="0.05"
            min="0"
            max="2"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="input-field text-lg tabular-nums"
          />
          <p className="text-sm text-text-muted">
            Your broker&apos;s commission plus CDBL and BSEC charges. Most DSE accounts pay 0.3%–0.5% on each buy and each sale.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pfs-tax" className="text-sm font-semibold text-text-main">
            Tax taken from cash dividends (%)
          </label>
          <div className="flex gap-2">
            <Chip active={tax === "10"} onClick={() => setTax("10")}>10% — I have a TIN</Chip>
            <Chip active={tax === "15"} onClick={() => setTax("15")}>15% — no TIN</Chip>
          </div>
          <input
            id="pfs-tax"
            type="number"
            inputMode="decimal"
            step="1"
            min="0"
            max="30"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            className="input-field text-lg tabular-nums"
          />
          <p className="text-sm text-text-muted">
            The company takes this off before the cash reaches your account. Check your own dividend slips — this is an estimate, not tax advice.
          </p>
        </div>
        {error && <p className="form-error">{error}</p>}
      </div>
    </Sheet>
  );
}
