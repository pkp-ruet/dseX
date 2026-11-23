"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { toast } from "@/lib/toast";
import { apiAddHolding } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { taka, type PlanItem } from "@/lib/portfolio-builder";

type Line = { code: string; name: string; on: boolean; qty: string; price: string };

/**
 * "I bought these" (2026-11-23): every share of the plan, filled in with the
 * plan's numbers, into the main portfolio. The reader corrects what they
 * really paid and how many they got; shares still waiting for a better price
 * start unticked. Nothing is added without a tap.
 */
export default function BoughtSheet({ items, open, onClose }: { items: PlanItem[]; open: boolean; onClose: () => void }) {
  const { bn } = useLang();
  const [lines, setLines] = useState<Line[]>(() =>
    items.map((i) => ({
      code: i.code,
      name: i.name,
      on: i.state === "now",
      qty: String(i.qty),
      price: String(i.state === "wait" ? i.wait_under ?? i.price ?? "" : i.price ?? ""),
    })),
  );
  const [saving, setSaving] = useState(false);
  const picked = lines.filter((l) => l.on && Number(l.qty) > 0 && Number(l.price) > 0);
  const total = picked.reduce((s, l) => s + Number(l.qty) * Number(l.price), 0);

  const set = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  const save = async () => {
    if (!picked.length) return;
    setSaving(true);
    let added = 0;
    const failed: string[] = [];
    for (const l of picked) {
      try {
        await apiAddHolding({ trading_code: l.code, qty: Math.floor(Number(l.qty)), buy_price: Number(l.price) });
        added += 1;
      } catch {
        failed.push(l.code);
      }
    }
    setSaving(false);
    if (added) {
      toast({
        tone: "success",
        message: (
          <T
            en={`Added ${added} ${added === 1 ? "share" : "shares"} to your portfolio.`}
            bn={`আপনার পোর্টফোলিওতে ${added}টি শেয়ার যোগ হয়েছে।`}
          />
        ),
        action: { label: <T en="View" bn="দেখুন" />, onClick: () => (window.location.href = "/portfolio") },
      });
    }
    if (failed.length) {
      toast({
        tone: "error",
        message: (
          <T en={`Couldn't add ${failed.join(", ")}. Try again.`} bn={`${failed.join(", ")} যোগ করা যায়নি। আবার চেষ্টা করুন।`} />
        ),
      });
    } else {
      onClose();
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!saving}
      size="lg"
      title={<T en="Add what you bought" bn="যা কিনেছেন তা যোগ করুন" />}
      footer={
        <Button size="lg" block onClick={save} disabled={saving || !picked.length}>
          {saving ? (
            <T en="Adding…" bn="যোগ হচ্ছে…" />
          ) : (
            <T
              en={`Add ${picked.length} ${picked.length === 1 ? "share" : "shares"} · ${taka(total)}`}
              bn={`${picked.length}টি শেয়ার যোগ করুন · ${taka(total)}`}
            />
          )}
        </Button>
      }
    >
      <p className="pbb-lead">
        <T
          en="Change the numbers to what you really paid and got. They go into your main portfolio."
          bn="আসলে যত দামে আর যতটি কিনেছেন, সেই সংখ্যা দিন। এগুলো আপনার মূল পোর্টফোলিওতে যাবে।"
        />
      </p>
      <ul className="pbb">
        {lines.map((l, i) => (
          <li key={l.code} className="pbb-row" data-on={l.on ? "1" : undefined}>
            <label className="pbb-pick" htmlFor={`pbb-on-${l.code}`}>
              <input id={`pbb-on-${l.code}`} type="checkbox" checked={l.on} onChange={(e) => set(i, { on: e.target.checked })} />
              <span className="min-w-0">
                <b>{l.code}</b>
                <span>{l.name}</span>
              </span>
            </label>
            <div className="pbb-fields">
              <label htmlFor={`pbb-q-${l.code}`}>
                <span>
                  <T en="Shares" bn="শেয়ার" />
                </span>
                <input
                  id={`pbb-q-${l.code}`}
                  inputMode="numeric"
                  className="input-field"
                  value={l.qty}
                  disabled={!l.on}
                  aria-label={bn ? `${l.code} শেয়ারের সংখ্যা` : `${l.code} shares`}
                  onChange={(e) => set(i, { qty: e.target.value.replace(/[^0-9]/g, "").slice(0, 8) })}
                />
              </label>
              <label htmlFor={`pbb-p-${l.code}`}>
                <span>
                  <T en="Price paid (৳)" bn="কেনা দাম (৳)" />
                </span>
                <input
                  id={`pbb-p-${l.code}`}
                  inputMode="decimal"
                  className="input-field"
                  value={l.price}
                  disabled={!l.on}
                  aria-label={bn ? `${l.code} কেনা দাম` : `${l.code} price paid`}
                  onChange={(e) => set(i, { price: e.target.value.replace(/[^0-9.]/g, "").slice(0, 10) })}
                />
              </label>
            </div>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
