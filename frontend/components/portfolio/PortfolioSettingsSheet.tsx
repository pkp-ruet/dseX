"use client";

import { useEffect, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { apiPutPortfolioSettings, type PortfolioSettings } from "@/lib/api";
import { toast } from "@/lib/toast";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

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
  const { lang } = useLang();
  const L = (en: string, bn: string) => (lang === "bn" ? bn : en);

  useEffect(() => {
    if (!open) return;
    setFee(String(settings.fee_pct));
    setTax(String(settings.div_tax_pct));
    setError("");
  }, [open, settings]);

  async function save() {
    const f = parseFloat(fee);
    const t = parseFloat(tax);
    if (!Number.isFinite(f) || f < 0 || f > 2) return setError(L("The fee should be between 0% and 2%.", "খরচ 0% থেকে 2%-এর মধ্যে হতে হবে।"));
    if (!Number.isFinite(t) || t < 0 || t > 30) return setError(L("The tax should be between 0% and 30%.", "কর 0% থেকে 30%-এর মধ্যে হতে হবে।"));
    setSaving(true);
    try {
      const res = await apiPutPortfolioSettings({ fee_pct: f, div_tax_pct: t });
      onSaved(res.settings);
      toast({ message: <T en="Your rates are saved" bn="আপনার হার সেভ হয়েছে" />, tone: "success" });
      onClose();
    } catch {
      setError(L("We couldn't save that. Please try again.", "সেভ করা যায়নি। আবার চেষ্টা করুন।"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!saving}
      title={<T en="Your fee and tax rates" bn="আপনার খরচ ও করের হার" />}
      footer={
        <Button type="button" variant="primary" block onClick={save} disabled={saving}>
          {saving ? <T en="Saving…" bn="সেভ হচ্ছে…" /> : <T en="Save" bn="সেভ করুন" />}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pfs-fee" className="text-sm font-semibold text-text-main">
            <T en="Brokerage fee per trade (%)" bn="প্রতি লেনদেনে ব্রোকারেজ খরচ (%)" />
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
            <T
              en="Your broker's commission plus CDBL and BSEC charges. Most DSE accounts pay 0.3% to 0.5% on each buy and each sale."
              bn="ব্রোকারের কমিশন আর সিডিবিএল ও বিএসইসির চার্জ মিলিয়ে। বেশির ভাগ ডিএসই অ্যাকাউন্টে প্রতিটি কেনা ও বেচায় 0.3% থেকে 0.5% লাগে।"
            />
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pfs-tax" className="text-sm font-semibold text-text-main">
            <T en="Tax taken from cash dividends (%)" bn="নগদ ডিভিডেন্ড থেকে কাটা কর (%)" />
          </label>
          <div className="flex gap-2">
            <Chip active={tax === "10"} onClick={() => setTax("10")}><T en="10% · I have a TIN" bn="10% · আমার টিআইএন আছে" /></Chip>
            <Chip active={tax === "15"} onClick={() => setTax("15")}><T en="15% · no TIN" bn="15% · টিআইএন নেই" /></Chip>
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
            <T
              en="The company takes this off before the cash reaches your account. Please check your own dividend slips. This is an estimate, not tax advice."
              bn="টাকা আপনার অ্যাকাউন্টে আসার আগেই কোম্পানি এটি কেটে রাখে। নিজের ডিভিডেন্ড স্লিপ মিলিয়ে দেখুন। এটি একটি আনুমানিক হিসাব, কর পরামর্শ নয়।"
            />
          </p>
        </div>
        {error && <p className="form-error">{error}</p>}
      </div>
    </Sheet>
  );
}
