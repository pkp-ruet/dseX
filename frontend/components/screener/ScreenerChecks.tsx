"use client";

import { useState } from "react";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import { IconChevronRight, IconCrown, IconLock, IconPlus } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";
import type {
  CustomCheckDef, CustomCheckValue, CustomListCatalog, CustomListSpec, ResearchFunnelStep,
} from "@/lib/api";

type Pick = (en: string, bn: string) => string;
const EN: Pick = (en) => en;
const BN: Pick = (_en, bn) => bn;

const Crown = () => <span className="inline-flex align-middle text-gold-ink"><IconCrown size={14} /></span>;

/**
 * Fine-tune: the exact rules behind the screen, one check per row — the whole
 * check as a sentence ("Price is 10 times yearly profit or less"), one line on what it
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

  /** The whole check at its current setting, as one sentence in the language `p` picks. */
  const sentence = (key: string, value: CustomCheckValue | undefined, p: Pick = t) => {
    const def = byKey.get(key);
    if (!def) return key;
    if (Array.isArray(value)) {
      const bnNames = value.map((v) => sectorBn(v));
      return value.length > 3
        ? p(`In one of ${value.length} sectors: ${value.join(", ")}`, `${value.length}টি সেক্টরের একটিতে: ${bnNames.join(", ")}`)
        : p(`In the ${value.join(" or ")} sectors`, `${bnNames.join(" বা ")} সেক্টরে`);
    }
    const opt = def.options.find((o) => o.value === value);
    if (opt?.sentence_en) return p(opt.sentence_en, opt.sentence_bn ?? opt.sentence_en);
    if (def.label_en) return p(def.label_en, def.label_bn ?? def.label_en);
    return opt ? `${p(def.name_en, def.name_bn)}: ${p(opt.label_en, opt.label_bn)}` : p(def.name_en, def.name_bn);
  };
  const Sentence = ({ k, v }: { k: string; v: CustomCheckValue | undefined }) => (
    <T en={sentence(k, v, EN)} bn={sentence(k, v, BN)} />
  );
  const help = (def: CustomCheckDef | undefined) =>
    def?.help_en ? <T en={def.help_en} bn={def.help_bn ?? def.help_en} /> : null;

  const openDef = open && !readOnly ? byKey.get(open) : undefined;
  const openValue = spec.checks.find((c) => c.key === open)?.value;

  return (
    <div>
      <div className="soft-card overflow-hidden">
        {universe != null && (
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2 px-4 py-2.5">
            <p className="text-sm text-text-muted">
              <T en="All rated companies" bn="রেটিং পাওয়া সব কোম্পানি" />
            </p>
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
                          <Sentence k={c.key} v={c.value} />
                          {def?.premium && <> <Crown /></>}
                        </p>
                        {line && <p className="mt-0.5 text-sm text-text-muted">{line}</p>}
                      </div>
                      {left != null && (
                        <div className={`shrink-0 text-right ${running ? "opacity-60" : ""}`}>
                          <p className={`text-sm font-semibold tabular-nums ${left === 0 ? "text-negative" : "text-text-main"}`}>{left}</p>
                          <p className="text-xs text-text-muted">
                            <T en="left" bn="বাকি" />
                          </p>
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
            <T en="Change the exact rules with Premium" bn="প্রিমিয়ামে নিয়মগুলো বদলান" />
          </a>
        ) : !atMax && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-12 w-full items-center gap-2 border-t border-border px-4 text-sm font-semibold text-primary hover:bg-surface-2 active:bg-surface-2"
          >
            <IconPlus size={16} />
            <T en="Add a check" bn="যাচাই যোগ করুন" />
          </button>
        )}
      </div>

      {/* One check: its settings + remove */}
      <Sheet
        open={!!openDef}
        onClose={() => setOpen(null)}
        title={openDef ? <T en={openDef.name_en} bn={openDef.name_bn} /> : ""}
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
              <T en="Remove" bn="বাদ দিন" />
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => setOpen(null)}>
              <T en="Done" bn="ঠিক আছে" />
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
                <T
                  en="A special check: the count is free, and the shares are part of Premium."
                  bn="বিশেষ যাচাই: সংখ্যাটি ফ্রি, আর শেয়ারগুলো প্রিমিয়ামে দেখা যায়।"
                />
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
                      <T en={o.label_en} bn={o.label_bn} />
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
                        {o.sentence_en ? (
                          <T en={o.sentence_en} bn={o.sentence_bn ?? o.sentence_en} />
                        ) : (
                          <T en={o.label_en} bn={o.label_bn} />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm font-semibold text-text-main">
                <Sentence k={openDef.key} v={true} />
              </p>
            )}
          </div>
        )}
      </Sheet>

      {/* The menu */}
      <Sheet open={adding} onClose={() => setAdding(false)} title={<T en="Add a check" bn="যাচাই যোগ করুন" />} size="lg">
        <div className="space-y-5">
          {catalog.groups.map((g) => {
            const items = catalog.checks.filter((c) => c.group === g.key && !chosen.has(c.key));
            if (!items.length) return null;
            return (
              <div key={g.key}>
                <p className="mb-2 text-sm font-semibold text-text-muted">
                  <T en={g.en} bn={g.bn} />
                </p>
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
                            <T en={c.name_en} bn={c.name_bn} />
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
            <T
              en="A special check: you see the count free, and the shares with Premium."
              bn="বিশেষ যাচাই: সংখ্যাটি ফ্রি, আর শেয়ারগুলো প্রিমিয়ামে দেখা যায়।"
            />
          </p>
        </div>
      </Sheet>
    </div>
  );
}
