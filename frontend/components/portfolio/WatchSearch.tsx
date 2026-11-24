"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import type { ScoreItem } from "@/lib/api";
import { companyShort } from "@/lib/formatters";
import { IconSearch } from "@/components/ui/icons";
import { openWatchRules } from "@/components/watch-rules/store";

/**
 * "Watch another share" on My shares (2026-11-25; the watchlist page's add bar
 * folded in here): type a name or code, tap Watch, and the Watch sheet opens
 * (it follows the share and sets what we tell you in one step).
 */
export default function WatchSearch({
  priceMap,
  watched,
  owned,
}: {
  priceMap: Map<string, ScoreItem>;
  /** Codes already watched, upper-case. */
  watched: Set<string>;
  /** Codes already owned, upper-case. */
  owned: Set<string>;
}) {
  const { bn } = useLang();
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const t = q.trim().toUpperCase();
    if (t.length < 2) return [];
    const starts: ScoreItem[] = [];
    const rest: ScoreItem[] = [];
    for (const s of priceMap.values()) {
      const code = s.trading_code.toUpperCase();
      if (code.startsWith(t)) starts.push(s);
      else if (code.includes(t) || (t.length >= 3 && (s.company_name ?? "").toUpperCase().includes(t))) rest.push(s);
    }
    return [...starts, ...rest].slice(0, 6);
  }, [q, priceMap]);

  return (
    <section className="ms-watch" aria-labelledby="ms-watch-h">
      <h2 id="ms-watch-h" className="ms-h">
        <T en="Watch another share" bn="অন্য শেয়ারে নজর রাখুন" />
      </h2>
      <div className="pf-search">
        <label htmlFor="ms-watch-q" className="sr-only">
          {bn ? "নাম বা কোড লিখুন" : "Type a name or code"}
        </label>
        <span className="pf-search-icon">
          <IconSearch size={16} />
        </span>
        <input
          id="ms-watch-q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={bn ? "নাম বা কোড লিখুন, যেমন GP" : "Type a name or code, such as GP"}
          autoComplete="off"
          enterKeyHint="search"
          className="input-field"
        />
      </div>
      {matches.length > 0 && (
        <ul className="soft-card ms-matches">
          {matches.map((s) => {
            const code = s.trading_code.toUpperCase();
            const name = companyShort(s.company_name) || code;
            const on = watched.has(code);
            return (
              <li key={code} className="ms-match">
                <span className="ms-match-name">
                  {name} <span className="ms-match-code">{code}</span>
                  {owned.has(code) && (
                    <span className="ms-match-note">
                      <T en="You own it" bn="আপনার আছে" />
                    </span>
                  )}
                </span>
                <Button
                  size="sm"
                  variant="quiet"
                  active={on}
                  onClick={() => {
                    setQ("");
                    openWatchRules(code, name, { ltp: s.ltp });
                  }}
                >
                  {on ? <T en="Watching" bn="নজরে আছে" /> : <T en="Watch" bn="নজর রাখুন" />}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
