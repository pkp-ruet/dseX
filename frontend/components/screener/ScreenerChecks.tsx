"use client";

import { useState } from "react";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import { IconChevronRight, IconCrown, IconLock, IconPlus } from "@/components/ui/icons";
import type {
  CustomCheckDef, CustomCheckValue, CustomListCatalog, CustomListSpec, ResearchFunnelStep,
} from "@/lib/api";

const Crown = () => <span className="inline-flex align-middle text-gold-ink"><IconCrown size={14} /></span>;

/**
 * Fine-tune: the exact rules behind the screen, one check per row — the whole
 * check as a sentence ("Price ÷ profit is 10 or less"), one line on what it
 * means, and how many companies are still in after it. Everyone can read
 * them; changing them is Premium (`readOnly` for everyone else). A row opens
 * a sheet with that check's settings and Remove; "Add a check" opens the menu
 * by group. Power checks wear a crown: the count is free, the stocks Premium.
 */
export default function ScreenerChecks({
  catalog,
  byKey,
  spec,
  funnel,
  funnelKeys,
  universe,
  running,
  readOnly,
  open,
  onOpen: setOpen,
  onAdd,
  onSet,
  onRemove,
  t,
}: {
  catalog: CustomListCatalog;
  byKey: Map<string, CustomCheckDef>;
  spec: CustomListSpec;
  /** The last run's funnel. */
  funnel: ResearchFunnelStep[] | null;
  /** The check keys that run used, in order — counts show only while they match the screen. */
  funnelKeys: string[] | null;
  /** Rated companies the screen starts from. */
  universe: number | null;
  running: boolean;
  /** Read the rules, don't change them (free readers). */
  readOnly: boolean;
  /** The check whose settings sheet is open — the page holds it, so the
   *  near-miss block can open a check too. */
  open: string | null;
  onOpen: (key: string | null) => void;
  onAdd: (c: CustomCheckDef) => void;
  onSet: (key: string, value: CustomCheckValue) => void;
  onRemove: (key: string) => void;
  t: (en: string, bn: string) => string;
}) {
  const [adding, setAdding] = useState(false);
  const chosen = new Set(spec.checks.map((c) => c.key));
  const atMax = spec.checks.length >= catalog.max_checks;
  const countsFit = !!funnel && !!funnelKeys && funnelKeys.length === spec.checks.length
    && funnelKeys.every((k, i) => spec.checks[i]?.key === k);

  /** The whole check at its current setting, as one sentence. */
  const sentence = (key: string, value: CustomCheckValue | undefined) => {
    const def = byKey.get(key);
    if (!def) return key;
    if (Array.isArray(value)) {
      return value.length > 3
        ? t(`In one of ${value.length} sectors: ${value.join(", ")}`, `${value.length}টি খাতের একটিতে: ${value.join(", ")}`)
        : t(`In the ${value.join(" or ")} sectors`, `${value.join(" বা ")} খাতে`);
    }
    const opt = def.options.find((o) => o.value === value);
    if (opt?.sentence_en) return t(opt.sentence_en, opt.sentence_bn ?? opt.sentence_en);
    if (def.label_en) return t(def.label_en, def.label_bn ?? def.label_en);
    return opt ? `${t(def.name_en, def.name_bn)}: ${t(opt.label_en, opt.label_bn)}` : t(def.name_en, def.name_bn);
  };
  const help = (def: CustomCheckDef | undefined) => (def?.help_en ? t(def.help_en, def.help_bn ?? def.help_en) : null);

  const openDef = open && !readOnly ? byKey.get(open) : undefined;
  const openValue = spec.checks.find((c) => c.key === open)?.value;

  return (
    <div>
      <div className="soft-card overflow-hidden">
        {universe != null && (
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2 px-4 py-2.5">
            <p className="text-sm text-text-muted">{t("All rated companies", "রেটিং পাওয়া সব কোম্পানি")}</p>
            <p className="text-sm font-semibold tabular-nums text-text-main">{universe}</p>
          </div>
        )}
        <ol>
          {spec.checks.map((c, i) => {
            const def = byKey.get(c.key);
            const left = countsFit ? funnel![i]?.left : undefined;
            const line = help(def);
            return (
              <li key={c.key} className="border-b border-border last:border-b-0">
                {(() => {
                  const body = (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-main">
                          {sentence(c.key, c.value)}
                          {def?.premium && <> <Crown /></>}
                        </p>
                        {line && <p className="mt-0.5 text-sm text-text-muted">{line}</p>}
                      </div>
                      {left != null && (
                        <div className={`shrink-0 text-right ${running ? "opacity-60" : ""}`}>
                          <p className={`text-sm font-semibold tabular-nums ${left === 0 ? "text-negative" : "text-text-main"}`}>{left}</p>
                          <p className="text-xs text-text-muted">{t("left", "বাকি")}</p>
                        </div>
                      )}
                    </>
                  );
                  return readOnly ? (
                    <div className="flex min-h-14 items-center gap-3 px-4 py-3">{body}</div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpen(c.key)}
                      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 active:bg-surface-2"
                      aria-label={t(`Change: ${sentence(c.key, c.value)}`, `বদলান: ${sentence(c.key, c.value)}`)}
                    >
                      {body}
                      <span className="shrink-0 text-text-muted" aria-hidden><IconChevronRight size={16} /></span>
                    </button>
                  );
                })()}
              </li>
            );
          })}
        </ol>
        {readOnly ? (
          <a
            href="#sc-premium"
            className="flex min-h-12 w-full items-center gap-2 border-t border-border px-4 text-sm font-semibold text-primary hover:bg-surface-2 active:bg-surface-2"
          >
            <IconLock size={16} />
            {t("Change the exact rules with Premium", "প্রিমিয়ামে নিয়মগুলো বদলান")}
          </a>
        ) : !atMax && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-12 w-full items-center gap-2 border-t border-border px-4 text-sm font-semibold text-primary hover:bg-surface-2 active:bg-surface-2"
          >
            <IconPlus size={16} />
            {t("Add a check", "শর্ত যোগ করুন")}
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
            {help(openDef) && <p className="text-sm text-text-muted">{help(openDef)}</p>}
            {openDef.premium && (
              <p className="flex items-center gap-1.5 text-sm text-text-main">
                <Crown />
                {t("Power check: the count is free, the stocks are Premium.", "পাওয়ার শর্ত: সংখ্যা ফ্রি, শেয়ারগুলো প্রিমিয়ামে।")}
              </p>
            )}
            {openDef.key === "sector" ? (
              <div className="flex flex-wrap gap-2">
                {openDef.options.map((o) => {
                  // Several sectors: each chip toggles; at least one stays on.
                  const cur = Array.isArray(openValue) ? openValue : typeof openValue === "string" ? [openValue] : [];
                  const name = String(o.value);
                  const on = cur.includes(name);
                  const next = on ? cur.filter((x) => x !== name) : [...cur, name];
                  return (
                    <Chip
                      key={name}
                      active={on}
                      onClick={() => open && next.length && onSet(open, next.length === 1 ? next[0] : next)}
                    >
                      {t(o.label_en, o.label_bn)}
                    </Chip>
                  );
                })}
              </div>
            ) : openDef.options.length > 0 ? (
              <div role="radiogroup" aria-label={t(openDef.name_en, openDef.name_bn)} className="soft-card overflow-hidden">
                {openDef.options.map((o) => {
                  const on = openValue === o.value;
                  return (
                    <button
                      key={String(o.value)}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => open && onSet(open, o.value)}
                      className={`flex min-h-12 w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left last:border-b-0 hover:bg-surface-2 active:bg-surface-2 ${on ? "bg-primary-soft" : ""}`}
                    >
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-primary" : "border-border"}`}
                        aria-hidden
                      >
                        {on && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </span>
                      <span className="text-sm text-text-main">
                        {o.sentence_en ? t(o.sentence_en, o.sentence_bn ?? o.sentence_en) : t(o.label_en, o.label_bn)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm font-semibold text-text-main">{sentence(openDef.key, true)}</p>
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
                <ul className="soft-card overflow-hidden">
                  {items.map((c) => (
                    <li key={c.key} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        onClick={() => {
                          onAdd(c);
                          setAdding(false);
                          // A check with settings opens straight away, so the reader sees them.
                          if (c.options.length) setOpen(c.key);
                        }}
                        className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 active:bg-surface-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text-main">
                            {t(c.name_en, c.name_bn)}
                            {c.premium && <> <Crown /></>}
                          </p>
                          {help(c) && <p className="mt-0.5 text-sm text-text-muted">{help(c)}</p>}
                        </div>
                        <span className="shrink-0 text-primary" aria-hidden><IconPlus size={16} /></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <p className="flex items-center gap-1.5 border-t border-border pt-4 text-sm text-text-muted">
            <Crown />
            {t("Power check: see the count free, the stocks with Premium.", "পাওয়ার শর্ত: সংখ্যা ফ্রি, শেয়ারগুলো প্রিমিয়ামে।")}
          </p>
        </div>
      </Sheet>
    </div>
  );
}
