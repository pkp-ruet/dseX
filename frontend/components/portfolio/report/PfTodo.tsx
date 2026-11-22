"use client";

import { useEffect, useRef } from "react";
import Link from "@/components/ui/Link";
import { TONE_CLASS, tx } from "@/components/report/chip";
import { IconChevronDown, IconChevronRight } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { trackEvent } from "@/lib/track";
import type { PfTodo as Todo } from "@/lib/portfolio-report";

/**
 * "What to do" (`#ch-plan`, 2026-11-23, the simple portfolio page — plan
 * https://claude.ai/artifact/Gmoy9sYiEcvK4wZL5eqTXN): at most three things,
 * most important first — the steps that lift the grade, then the shares to
 * act on, most money first. Each is one title and one line; "How" folds the
 * trades, why, and what a sale makes real. One line under the list says what
 * the steps do to the grade. Replaces "Your way back", "Three changes to an
 * A" and "Each of your shares" (their details now live in each share's
 * sheet). Keeps `#ch-plan` and `#pf-path` (old links).
 */
export default function PfTodo({
  todo,
  onOpenShare,
  children,
}: {
  todo: Todo;
  /** Opens a share's sheet (the portfolio page); without it the item links to the stock page. */
  onOpenShare?: (code: string) => void;
  /** The what-if card, folded at the end. */
  children?: React.ReactNode;
}) {
  const n = todo.items.length;
  const extra = todo.total - n;
  // `/portfolio#pf-whatif` (the stock page's "Try a sale too") opens the fold.
  const whatIf = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const go = () => {
      if (window.location.hash !== "#pf-whatif" || !whatIf.current) return;
      whatIf.current.open = true;
      requestAnimationFrame(() => whatIf.current?.scrollIntoView({ block: "start" }));
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);
  return (
    <section id="ch-plan" className="soft-card pft dash-section" aria-labelledby="pft-t">
      <span id="pf-path" className="dash-section" aria-hidden="true" />
      <div className="pft-top">
        <h2 id="pft-t" className="pfh-title">
          <T en="What to do" bn="কী করবেন" />
        </h2>
        {n > 0 && (
          <span className="pft-count">
            <T en={`${n} thing${n === 1 ? "" : "s"}`} bn={`${n}টি বিষয়`} />
          </span>
        )}
      </div>

      {n === 0 ? (
        <p className="pft-none">{tx(todo.none)}</p>
      ) : (
        <ol className="pft-list">
          {todo.items.map((it, i) => (
            <li key={it.key} className="pft-item">
              <span className="pft-n" aria-hidden="true">{i + 1}</span>
              <div className="min-w-0">
                <p className="pft-title">{tx(it.title)}</p>
                <p className="pft-line pv">{tx(it.line)}</p>
                {/* The reason is always open (2026-11-23); only the trades, what
                    a sale makes real and the link fold — and the first item's
                    fold starts open. */}
                {it.why && <p className="pft-why">{tx(it.why)}</p>}
                {(it.trades.length > 1 || it.note) && (
                  <details
                    className="pft-how"
                    open={i === 0}
                    onToggle={(e) => {
                      if ((e.currentTarget as HTMLDetailsElement).open && i > 0) {
                        trackEvent("pf_open", { what: "todo", key: it.key });
                      }
                    }}
                  >
                    <summary>
                      <span className="pft-how-closed">
                        <T en="Show the steps" bn="ধাপগুলো দেখুন" />
                      </span>
                      <span className="pft-how-opened">
                        <T en="Hide the steps" bn="ধাপগুলো লুকান" />
                      </span>
                      <IconChevronDown size={14} />
                    </summary>
                    <div className="pft-how-body">
                      {it.trades.length > 1 && (
                        <ul className="pft-trades pv">
                          {it.trades.map((t, j) => (
                            <li key={j}>
                              <b data-side={t.side}>{t.side === "sell" ? <T en="Sell" bn="বিক্রি" /> : <T en="Buy" bn="কেনা" />}</b>
                              <span>{tx(t.text)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {it.note && <p className={TONE_CLASS[it.note.tone]}>{tx(it.note.text)}</p>}
                    </div>
                  </details>
                )}
                {it.code &&
                  (onOpenShare ? (
                    <button type="button" className="pft-share" onClick={() => onOpenShare(it.code as string)}>
                      <T en={`${it.code} details`} bn={`${it.code}-এর বিস্তারিত`} />
                      <IconChevronRight size={14} />
                    </button>
                  ) : (
                    <Link href={`/stock/${it.code}`} className="pft-share">
                      <T en={`Open the ${it.code} page`} bn={`${it.code}-এর পেজ খুলুন`} />
                      <IconChevronRight size={14} />
                    </Link>
                  ))}
              </div>
            </li>
          ))}
        </ol>
      )}

      {todo.gradeLine && <p className="pft-grade">{tx(todo.gradeLine)}</p>}
      {extra > 0 && (
        <p className="pft-extra">
          <T
            en={`${extra} more thing${extra === 1 ? "" : "s"} to look at: see the status beside each share below.`}
            bn={`দেখার মতো আরও ${extra}টি বিষয়: নিচে প্রতিটি শেয়ারের পাশে অবস্থা দেখুন।`}
          />
        </p>
      )}

      {todo.more.length > 0 && (
        <details className="pf-fold">
          <summary>
            <T
              en={`${todo.more.length} more share${todo.more.length === 1 ? "" : "s"} that would fit your portfolio`}
              bn={`আপনার পোর্টফোলিওতে মানাবে এমন আরও ${todo.more.length}টি শেয়ার`}
            />
            <IconChevronDown size={16} />
          </summary>
          <ul className="pf-fold-list">
            {todo.more.map((m) => (
              <li key={m.key}>
                <div className="pf-fold-top">
                  {m.code ? (
                    <Link href={`/stock/${m.code}`} className="pf-fold-name">{tx(m.title)}</Link>
                  ) : (
                    <b className="pf-fold-name">{tx(m.title)}</b>
                  )}
                  {m.tag && <span className="pf-fold-tag">{tx(m.tag)}</span>}
                </div>
                <p>{tx(m.line)}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {children && (
        <details ref={whatIf} id="pf-whatif" className="pf-fold dash-section">
          <summary>
            <T en="Try a change yourself" bn="নিজে একটি বদল চেষ্টা করুন" />
            <IconChevronDown size={16} />
          </summary>
          <div className="pft-whatif">{children}</div>
        </details>
      )}

      <p className="pft-fine">
        <T en="Ideas from our analysis, not advice. You decide." bn="আমাদের বিশ্লেষণ থেকে আইডিয়া, পরামর্শ নয়। সিদ্ধান্ত আপনার।" />
      </p>
    </section>
  );
}
