"use client";

import Sheet from "@/components/ui/Sheet";
import { IconCheck } from "@/components/ui/icons";
import type { ScreenerFilterDef, ScreenerUniverse } from "@/lib/api";

/**
 * "All filters": every figure the screener offers, by group, as a grid of
 * names (two a row, the market word small under the name), so the whole menu
 * fits about one phone screen (2026-11-18; it was 12 rows with a two-line help
 * sentence each). The help sentence lives at the top of each filter's own
 * sheet. Our own analysis comes first with a gold dot; a filter that is on
 * says so (a tap opens it to change). Filters off the menu (today's change,
 * our score …) only sort.
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
    <Sheet open={open} onClose={onClose} title={t("All filters", "সব ফিল্টার")} size="lg">
      <div className="space-y-5">
        {groups.map((g) => {
          const items = filters.filter((f) => f.group === g.key && f.menu !== false);
          if (!items.length) return null;
          const view = items.every((f) => f.ours);
          return (
            <section key={g.key} aria-label={t(g.en, g.bn)}>
              <h3 className="scr-menu-head">
                {view && <span className="scr-own-dot" aria-hidden="true" />}
                {t(g.en, g.bn)}
                {view && <span className="font-normal">· {t("only on TopStockBD", "শুধু টপস্টকবিডিতে")}</span>}
              </h3>
              <ul className="scr-menu">
                {items.map((f) => {
                  const on = active.includes(f.key);
                  return (
                    <li key={f.key}>
                      <button
                        type="button"
                        onClick={() => onPick(f)}
                        className={`scr-menu-item${f.ours ? " scr-menu-item--ours" : ""}${on ? " is-on" : ""}`}
                      >
                        <span className="scr-menu-name">{t(f.name_en, f.name_bn)}</span>
                        {(f.term || on) && (
                          <span className="scr-menu-sub">
                            {on && (
                              <span className="scr-menu-on">
                                <IconCheck size={12} />
                                {t("On", "চালু")}
                              </span>
                            )}
                            {f.term && <span>{f.term}</span>}
                          </span>
                        )}
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
