"use client";

import Sheet from "@/components/ui/Sheet";
import { IconCheck, IconCrown } from "@/components/ui/icons";
import type { ScreenerFilterDef, ScreenerUniverse } from "@/lib/api";

/**
 * "Add a filter": every figure the screener knows, by group, each with its
 * plain name, its market word small and one line on what it is. Figures
 * already on the screen show a tick (a tap opens them to change). The last
 * group, TopStockBD's view, wears a crown.
 */
export default function AddFilterSheet({
  open,
  groups,
  filters,
  active,
  onPick,
  onClose,
  t,
}: {
  open: boolean;
  groups: ScreenerUniverse["groups"];
  filters: ScreenerFilterDef[];
  /** Keys already on the screen. */
  active: string[];
  onPick: (def: ScreenerFilterDef) => void;
  onClose: () => void;
  t: (en: string, bn: string) => string;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={t("Add a filter", "ফিল্টার যোগ করুন")} size="lg">
      <div className="space-y-6">
        {groups.map((g) => {
          const items = filters.filter((f) => f.group === g.key);
          if (!items.length) return null;
          const view = items.every((f) => f.premium);
          return (
            <section key={g.key} aria-label={t(g.en, g.bn)}>
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-text-muted">
                {view && <span className="text-gold-ink"><IconCrown size={14} /></span>}
                {t(g.en, g.bn)}
                {view && <span className="font-normal">· {t("Premium", "প্রিমিয়াম")}</span>}
              </h3>
              {view && (
                <p className="mb-1 text-sm text-text-main">
                  {t("Our own reading of each company. Anyone can see how many shares pass; which ones they are is Premium.",
                     "প্রতিটি কোম্পানি নিয়ে আমাদের নিজের মূল্যায়ন। কতগুলো শেয়ার মেলে তা সবাই দেখে; কোনগুলো, তা প্রিমিয়ামে।")}
                </p>
              )}
              <ul className="divide-y divide-border">
                {items.map((f) => {
                  const on = active.includes(f.key);
                  return (
                    <li key={f.key}>
                      <button
                        type="button"
                        onClick={() => onPick(f)}
                        className="flex min-h-14 w-full items-start gap-3 py-3 text-left active:bg-surface-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold text-text-main">
                            {t(f.name_en, f.name_bn)}
                            {f.term && <span className="ml-1.5 text-sm font-normal text-text-muted">{f.term}</span>}
                          </span>
                          <span className="mt-0.5 block text-sm text-text-muted">{t(f.help_en, f.help_bn)}</span>
                        </span>
                        {on && <span className="mt-1 shrink-0 text-primary" aria-label={t("On", "চালু")}><IconCheck size={18} /></span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}
