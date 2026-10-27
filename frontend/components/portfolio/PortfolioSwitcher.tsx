"use client";

import { useState } from "react";
import Chip from "@/components/ui/Chip";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { IconLock } from "@/components/ui/icons";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import {
  apiCreatePortfolio,
  apiDeletePortfolio,
  apiRenamePortfolio,
  MAIN_PORTFOLIO_ID,
  type PortfolioListItem,
} from "@/lib/api";
import { isLimitError, usePremium } from "@/lib/premium";
import { toast } from "@/lib/toast";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

/**
 * One chip per portfolio + "New portfolio". A second portfolio (a parent's or
 * spouse's BO account) is Premium — a free reader's "New" opens the limit
 * notice, which links to /premium. Extra portfolios kept from a free month
 * stay readable after it ends; the page shows them read-only.
 */
export default function PortfolioSwitcher({
  portfolios,
  active,
  lang,
  onSelect,
  onChanged,
}: {
  portfolios: PortfolioListItem[];
  active: string;
  lang: AnalysisLang;
  onSelect: (pid: string) => void;
  onChanged: (list: PortfolioListItem[], select?: string) => void;
}) {
  const { isPremium } = usePremium();
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const [sheet, setSheet] = useState<null | { mode: "new" } | { mode: "edit"; item: PortfolioListItem }>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const current = portfolios.find((p) => p.id === active);

  const openNew = () => {
    if (!isPremium) return showLimitNotice("portfolios");
    setName("");
    setError("");
    setSheet({ mode: "new" });
  };

  async function save() {
    if (!sheet) return;
    setSaving(true);
    setError("");
    try {
      if (sheet.mode === "new") {
        const res = await apiCreatePortfolio(name);
        onChanged(res.portfolios, res.portfolio.id);
        toast({ message: L(`${res.portfolio.name} added`, `${res.portfolio.name} যোগ হয়েছে`), tone: "success" });
      } else {
        const res = await apiRenamePortfolio(sheet.item.id, name);
        onChanged(res.portfolios);
      }
      setSheet(null);
    } catch (err) {
      if (isLimitError(err, "portfolios")) {
        setSheet(null);
        showLimitNotice("portfolios");
      } else {
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: PortfolioListItem) {
    setSaving(true);
    try {
      const res = await apiDeletePortfolio(item.id);
      onChanged(res.portfolios, MAIN_PORTFOLIO_ID);
      setSheet(null);
      toast({ message: L(`${item.name} deleted`, `${item.name} মুছে ফেলা হয়েছে`) });
    } catch {
      setError(L("We couldn't delete it. Please try again.", "মুছে ফেলা যায়নি। আবার চেষ্টা করুন।"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label={L("Your portfolios", "আপনার পোর্টফোলিও")}>
        {portfolios.map((p) => (
          <Chip key={p.id} active={p.id === active} onClick={() => onSelect(p.id)}>
            {p.id === MAIN_PORTFOLIO_ID ? L("My portfolio", "আমার পোর্টফোলিও") : p.name}
            <span className="ml-1 text-text-muted">{p.count}</span>
          </Chip>
        ))}
        <Chip onClick={openNew} icon={isPremium ? undefined : <IconLock size={14} />}>
          {L("+ New portfolio", "+ নতুন পোর্টফোলিও")}
        </Chip>
        {current && current.id !== MAIN_PORTFOLIO_ID && (
          <Chip
            onClick={() => {
              setName(current.name);
              setError("");
              setSheet({ mode: "edit", item: current });
            }}
          >
            {L("Rename or delete", "নাম বদল / মুছুন")}
          </Chip>
        )}
      </div>

      <Sheet
        open={sheet != null}
        onClose={() => setSheet(null)}
        dismissible={!saving}
        title={sheet?.mode === "edit" ? L("Edit portfolio", "পোর্টফোলিও এডিট") : L("New portfolio", "নতুন পোর্টফোলিও")}

        footer={
          <div className="flex flex-col gap-2">
            <Button type="button" variant="primary" block disabled={saving || !name.trim()} onClick={save}>
              {saving ? "Saving…" : L("Save", "সেভ")}
            </Button>
            {sheet?.mode === "edit" && (
              <Button type="button" variant="danger" block disabled={saving} onClick={() => remove(sheet.item)}>
                {L("Delete this portfolio", "এই পোর্টফোলিও মুছুন")}
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pf-name" className="text-sm font-semibold text-text-main">
            {L("Name", "নাম")}
          </label>
          <input
            id="pf-name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder={L("e.g. Mother's BO account", "যেমন: মায়ের BO অ্যাকাউন্ট")}
            className="input-field text-lg"
          />
          <p className="text-sm text-text-muted">
            {sheet?.mode === "edit"
              ? L("Deleting it removes its shares and history for good.", "মুছলে এর শেয়ার ও ইতিহাস চিরতরে চলে যাবে।")
              : L("It is kept apart from your own shares, and your daily alerts stay about your main portfolio.", "এটি আপনার নিজের শেয়ার থেকে আলাদা থাকবে, আর প্রতিদিনের অ্যালার্ট আপনার মূল পোর্টফোলিও নিয়েই আসবে।")}
          </p>
          {error && <p className="form-error">{error}</p>}
        </div>
      </Sheet>
    </>
  );
}
