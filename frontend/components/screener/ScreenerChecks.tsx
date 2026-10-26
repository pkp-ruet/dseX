"use client";

import { useState } from "react";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import { IconCrown } from "@/components/ui/icons";
import ScreenerStep from "./ScreenerStep";
import type {
  CustomCheckDef, CustomCheckValue, CustomListCatalog, CustomListSpec, ResearchFunnelStep,
} from "@/lib/api";

const Crown = () => <span className="inline-flex text-gold-ink"><IconCrown size={14} /></span>;

/**
 * Step 2: the screen as one row of chips — "Grade: Good+", "Pays 4%+" — so it
 * reads at a glance. Tapping a chip opens a small sheet with that check's
 * settings and Remove; "+ Add a check" opens the menu by group. Power checks
 * wear a crown: anyone can switch one on and see the count, the stocks are
 * Premium.
 */
export default function ScreenerChecks({
  catalog,
  byKey,
  spec,
  funnel,
  editingName,
  onStartFresh,
  onAdd,
  onSet,
  onRemove,
  t,
}: {
  catalog: CustomListCatalog;
  byKey: Map<string, CustomCheckDef>;
  spec: CustomListSpec;
  /** The last run's funnel — its labels are each check's full sentence. */
  funnel: ResearchFunnelStep[] | null;
  /** Set while a saved screen is open. */
  editingName: string | null;
  onStartFresh: () => void;
  onAdd: (c: CustomCheckDef) => void;
  onSet: (key: string, value: CustomCheckValue) => void;
  onRemove: (key: string) => void;
  t: (en: string, bn: string) => string;
}) {
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const chosen = new Set(spec.checks.map((c) => c.key));
  const atMax = spec.checks.length >= catalog.max_checks;

  const chipText = (key: string, value: CustomCheckValue) => {
    const def = byKey.get(key);
    if (!def) return key;
    const opt = def.options.find((o) => o.value === value);
    if (key === "sector" && opt) return t(opt.label_en, opt.label_bn);
    return opt ? `${t(def.name_en, def.name_bn)}: ${t(opt.label_en, opt.label_bn)}` : t(def.name_en, def.name_bn);
  };

  const openDef = open ? byKey.get(open) : undefined;
  const openValue = spec.checks.find((c) => c.key === open)?.value;
  const openIndex = spec.checks.findIndex((c) => c.key === open);
  const sentence = openDef
    ? (funnel?.[openIndex] && funnel.length === spec.checks.length
        ? t(funnel[openIndex].label_en, funnel[openIndex].label_bn)
        : openDef.label_en ? t(openDef.label_en, openDef.label_bn ?? openDef.label_en) : null)
    : null;

  return (
    <ScreenerStep
      n={2}
      title={t("Your checks", "আপনার শর্ত")}
      note={editingName
        ? <>{t(`Editing your saved screen "${editingName}".`, `সেভ করা স্ক্রিন "${editingName}" বদলাচ্ছেন।`)}{" "}
            <button type="button" onClick={onStartFresh} className="font-semibold text-primary hover:underline">
              {t("Start fresh", "নতুন করে শুরু")}
            </button></>
        : t("Every stock must pass all of them. Tap one to change it.", "প্রতিটি শেয়ারকে সবগুলো পেরোতে হবে। বদলাতে একটিতে চাপুন।")}
    >
      <div className="flex flex-wrap gap-2">
        {spec.checks.map((c) => {
          const def = byKey.get(c.key);
          return (
            <Chip
              key={c.key}
              onClick={() => setOpen(c.key)}
              icon={def?.premium ? <Crown /> : undefined}
              aria-label={t(`Change: ${chipText(c.key, c.value)}`, `বদলান: ${chipText(c.key, c.value)}`)}
            >
              {chipText(c.key, c.value)}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </Chip>
          );
        })}
        {!atMax && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex min-h-10 items-center rounded-full border border-dashed border-text-muted px-3.5 text-sm font-semibold text-primary hover:bg-surface-2 active:bg-surface-2"
          >
            {t("+ Add a check", "+ শর্ত যোগ করুন")}
          </button>
        )}
      </div>

      {/* One check: its settings + remove */}
      <Sheet
        open={!!openDef}
        onClose={() => setOpen(null)}
        title={openDef ? t(openDef.name_en, openDef.name_bn) : ""}
        footer={
          <div className="flex w-full gap-2">
            <Button
              variant="quiet"
              className="flex-1"
              disabled={spec.checks.length <= 1}
              onClick={() => {
                if (open) onRemove(open);
                setOpen(null);
              }}
            >
              {t("Remove", "বাদ দিন")}
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => setOpen(null)}>
              {t("Done", "ঠিক আছে")}
            </Button>
          </div>
        }
      >
        {openDef && (
          <div className="space-y-4">
            {sentence && <p className="text-sm text-text-muted">{sentence}</p>}
            {openDef.premium && (
              <p className="flex items-center gap-1.5 text-sm text-text-main">
                <Crown />
                {t("Power check: the count is free, the stocks are Premium.", "পাওয়ার শর্ত: সংখ্যা ফ্রি, শেয়ারগুলো প্রিমিয়ামে।")}
              </p>
            )}
            {openDef.options.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {openDef.options.map((o) => (
                  <Chip key={String(o.value)} active={openValue === o.value} onClick={() => open && onSet(open, o.value)}>
                    {t(o.label_en, o.label_bn)}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        )}
      </Sheet>

      {/* The menu */}
      <Sheet open={adding} onClose={() => setAdding(false)} title={t("Add a check", "শর্ত যোগ করুন")} size="lg">
        <div className="space-y-5">
          {catalog.groups.map((g) => {
            const items = catalog.checks.filter((c) => c.group === g.key && !chosen.has(c.key));
            if (!items.length) return null;
            return (
              <div key={g.key}>
                <p className="mb-2 text-sm font-semibold text-text-muted">{t(g.en, g.bn)}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((c) => (
                    <Chip
                      key={c.key}
                      icon={c.premium ? <Crown /> : undefined}
                      onClick={() => {
                        onAdd(c);
                        setAdding(false);
                        // A check with settings opens straight away, so the reader sees them.
                        if (c.options.length) setOpen(c.key);
                      }}
                    >
                      {t(c.name_en, c.name_bn)}
                    </Chip>
                  ))}
                </div>
              </div>
            );
          })}
          <p className="flex items-center gap-1.5 border-t border-border pt-4 text-sm text-text-muted">
            <Crown />
            {t("Power check: see the count free, the stocks with Premium.", "পাওয়ার শর্ত: সংখ্যা ফ্রি, শেয়ারগুলো প্রিমিয়ামে।")}
          </p>
        </div>
      </Sheet>
    </ScreenerStep>
  );
}
