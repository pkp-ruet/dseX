"use client";

import { useMemo, useRef, useState } from "react";
import { T } from "@/components/i18n/T";
import { IconClose, IconCrown, IconPlus, IconSearch, IconShare } from "@/components/ui/icons";
import { useLang } from "@/context/LangContext";
import { toast } from "@/lib/toast";
import type { PickOption } from "@/lib/compare";

interface Props {
  codes: string[];
  names: Record<string, string>;
  options: PickOption[];
  similar: { code: string; short: string }[];
  limit: number;
  isPremium: boolean;
  onAdd: (code: string) => void;
  onRemove: (code: string) => void;
  /** At the limit: the free reader's limit popup, or a note for Premium. */
  onLimit: () => void;
}

const MAX_RESULTS = 8;

/**
 * The shares being compared, as chips with a ✕, and "Add a share": a search
 * over every graded company (the list arrives with the page, so typing needs
 * no request), with similar companies offered before anything is typed.
 * At a free reader's limit the add button turns into the Premium one.
 */
export default function ComparePicker({ codes, names, options, similar, limit, isPremium, onAdd, onRemove, onLimit }: Props) {
  const { bn } = useLang();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const full = codes.length >= limit;

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const starts: PickOption[] = [];
    const contains: PickOption[] = [];
    for (const o of options) {
      if (codes.includes(o.code)) continue;
      const c = o.code.toLowerCase();
      const n = o.name.toLowerCase();
      if (c.startsWith(s) || n.startsWith(s)) starts.push(o);
      else if (c.includes(s) || n.includes(s)) contains.push(o);
      if (starts.length >= MAX_RESULTS) break;
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [q, options, codes]);

  const suggestions = similar.filter((s) => !codes.includes(s.code));

  function add(code: string) {
    onAdd(code);
    setQ("");
    setOpen(false);
  }

  function toggle() {
    if (full) {
      onLimit();
      return;
    }
    setOpen((o) => !o);
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  async function copyLink() {
    const url = window.location.origin + window.location.pathname + window.location.search;
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: <T en="Link copied" bn="লিংক কপি হয়েছে" />, tone: "success" });
    } catch {
      toast({ message: <T en="We couldn't copy the link" bn="লিংক কপি করা যায়নি" />, tone: "error" });
    }
  }

  return (
    <section className="cmp-picker cmp-card" aria-label={bn ? "যে শেয়ারগুলো তুলনা করছেন" : "Shares you are comparing"}>
      <div className="cmp-chips">
        {codes.map((c) => (
          <span key={c} className="cmp-chip">
            <span className="cmp-chip-name">{names[c] ?? c}</span>
            {names[c] && names[c] !== c && <span className="cmp-chip-code">{c}</span>}
            <button
              type="button"
              className="cmp-chip-x"
              onClick={() => onRemove(c)}
              aria-label={bn ? `${names[c] ?? c} বাদ দিন` : `Take ${names[c] ?? c} off`}
            >
              <IconClose size={15} />
            </button>
          </span>
        ))}
        <button
          type="button"
          className={`cmp-add ${full && !isPremium ? "is-locked" : ""}`}
          onClick={toggle}
          aria-expanded={full ? undefined : open}
        >
          {full && !isPremium ? (
            <>
              <IconCrown size={16} />
              <T en="Add more with Premium" bn="প্রিমিয়ামে আরও যোগ করুন" />
            </>
          ) : (
            <>
              <IconPlus size={16} />
              <T en="Add a share" bn="শেয়ার যোগ করুন" />
            </>
          )}
        </button>
      </div>

      {open && !full && (
        <div className="cmp-search">
          <label className="cmp-search-box" htmlFor="cmp-q">
            <IconSearch size={18} />
            <input
              ref={inputRef}
              id="cmp-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && hits[0]) add(hits[0].code);
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder={bn ? "কোম্পানির নাম বা কোড লিখুন" : "Type a company name or code"}
              autoComplete="off"
            />
          </label>
          {q.trim() ? (
            hits.length ? (
              <ul className="cmp-res">
                {hits.map((o) => (
                  <li key={o.code}>
                    <button type="button" className="cmp-res-row" onClick={() => add(o.code)}>
                      <span className="min-w-0">
                        <b>{o.name}</b> <span className="cmp-res-code">{o.code}</span>
                      </span>
                      <span className="cmp-res-add">
                        <T en="Add" bn="যোগ করুন" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cmp-res-none">
                <T en={`No graded company matches “${q.trim()}”.`} bn={`“${q.trim()}” নামে গ্রেড পাওয়া কোনো কোম্পানি নেই।`} />
              </p>
            )
          ) : suggestions.length ? (
            <>
              <p className="cmp-res-h">
                <T en="Companies in the same sector" bn="একই সেক্টরের কোম্পানি" />
              </p>
              <ul className="cmp-res">
                {suggestions.map((o) => (
                  <li key={o.code}>
                    <button type="button" className="cmp-res-row" onClick={() => add(o.code)}>
                      <span className="min-w-0">
                        <b>{o.short}</b> <span className="cmp-res-code">{o.code}</span>
                      </span>
                      <span className="cmp-res-add">
                        <T en="Add" bn="যোগ করুন" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      )}

      <div className="cmp-pick-foot">
        <span>
          {isPremium ? (
            <T en={`${codes.length} of up to ${limit} shares.`} bn={`সর্বোচ্চ ${limit}টির মধ্যে ${codes.length}টি শেয়ার।`} />
          ) : (
            <T
              en={`${codes.length} of ${limit} shares. Premium compares up to 10.`}
              bn={`${limit}টির মধ্যে ${codes.length}টি শেয়ার। প্রিমিয়ামে 10টি পর্যন্ত।`}
            />
          )}
        </span>
        {codes.length >= 2 && (
          <button type="button" className="cmp-copy" onClick={copyLink}>
            <IconShare size={14} />
            <T en="Copy link" bn="লিংক কপি করুন" />
          </button>
        )}
      </div>
    </section>
  );
}
