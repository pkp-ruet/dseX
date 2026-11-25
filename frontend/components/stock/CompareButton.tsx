"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import { IconCompare, IconSearch } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { usePersonalCodes } from "@/lib/use-personal-codes";
import { getInsightScores } from "@/lib/api";
import { MAX_COMPARE, compareHref, joinBn, joinEn, shortName } from "@/lib/compare";
import { trackEvent } from "@/lib/track";

export interface ComparePeer {
  code: string;
  name: string | null;
}

/** How many of each kind of suggestion the sheet offers. */
const SHOW = 4;

/**
 * The stock page's Compare button (2026-11-25, "Compare and Builder Homes":
 * Compare moved onto the shares). It asks "Compare GP with…" in place — the
 * reader's own shares, similar companies (the page's peers) or any share by
 * name — so the compare page opens already filled. Until then it opened the
 * compare page with only this share in it, where the reader still had to pick.
 * "Just open Compare" keeps that way for a reader who wants to pick there.
 */
export default function CompareButton({ code, name, peers = [] }: { code: string; name?: string; peers?: ComparePeer[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="quiet"
        size="sm"
        onClick={() => {
          setOpen(true);
          trackEvent("compare_sheet_open", { code });
        }}
        title="Compare with other shares"
      >
        <IconCompare size={14} />
        <span>
          <T en="Compare" bn="তুলনা" />
        </span>
      </Button>
      {open && <CompareSheet code={code} name={name} peers={peers} onClose={() => setOpen(false)} />}
    </>
  );
}

function CompareSheet({
  code,
  name,
  peers,
  onClose,
}: {
  code: string;
  name?: string;
  peers: ComparePeer[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { bn } = useLang();
  const { isLoggedIn } = useAuth();
  const { portfolio, watchlist } = usePersonalCodes();
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [companies, setCompanies] = useState<ComparePeer[] | null>(null);
  const triedRef = useRef(false);
  const me = code.toUpperCase();

  // The company list for the search, once the reader starts typing.
  useEffect(() => {
    if (!q.trim() || triedRef.current) return;
    triedRef.current = true;
    getInsightScores()
      .then((items) => setCompanies(items.map((c) => ({ code: c.trading_code.toUpperCase(), name: c.company_name }))))
      .catch(() => setCompanies([]));
  }, [q]);

  const mine = useMemo(
    () => [...portfolio, ...[...watchlist].filter((c) => !portfolio.has(c))].filter((c) => c !== me).slice(0, SHOW),
    [portfolio, watchlist, me],
  );
  const similar = useMemo(
    () => peers.filter((p) => p.code.toUpperCase() !== me).slice(0, SHOW),
    [peers, me],
  );
  const names = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const p of peers) m.set(p.code.toUpperCase(), p.name);
    for (const c of companies ?? []) if (!m.has(c.code)) m.set(c.code, c.name);
    return m;
  }, [peers, companies]);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t || !companies) return [];
    return companies
      .filter((c) => c.code !== me && (c.code.toLowerCase().includes(t) || (c.name ?? "").toLowerCase().includes(t)))
      .sort((a, b) => Number(b.code.toLowerCase().startsWith(t)) - Number(a.code.toLowerCase().startsWith(t)))
      .slice(0, 6);
  }, [q, companies, me]);

  const full = picked.length >= MAX_COMPARE - 1;
  const toggle = (c: string) => {
    const k = c.toUpperCase();
    setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : full ? p : [...p, k]));
  };
  const codes = [me, ...picked];
  const go = () => {
    trackEvent("compare_sheet_go", { code: me, n: codes.length });
    onClose();
    router.push(compareHref(codes));
  };

  const chip = (c: string) => {
    const on = picked.includes(c.toUpperCase());
    return (
      <button
        key={c}
        type="button"
        className={`cmp-pick-chip${on ? " is-on" : ""}`}
        aria-pressed={on}
        disabled={!on && full}
        onClick={() => toggle(c)}
        title={names.get(c.toUpperCase()) ?? undefined}
      >
        {c}
      </button>
    );
  };

  const label =
    picked.length === 0
      ? { en: "Just open Compare", bn: "শুধু তুলনা পেজ খুলুন" }
      : codes.length <= 3
        ? { en: `Compare ${joinEn(codes)}`, bn: `${joinBn(codes)} তুলনা করুন` }
        : { en: `Compare ${codes.length} shares`, bn: `${codes.length}টি শেয়ার তুলনা করুন` };

  return (
    <Sheet
      open
      onClose={onClose}
      title={<T en={`Compare ${me} with…`} bn={`${me}-এর সঙ্গে তুলনা…`} />}
      subtitle={name ? shortName(name, me) : undefined}
      footer={
        <Button variant="primary" size="lg" block onClick={go}>
          <T en={label.en} bn={label.bn} />
        </Button>
      }
    >
      <div className={`cmp-pick ${bn ? "font-bn" : ""}`}>
        {isLoggedIn && mine.length > 0 && (
          <div className="cmp-pick-group">
            <p className="cmp-pick-h">
              <T en="Your shares" bn="আপনার শেয়ার" />
            </p>
            <div className="cmp-pick-chips">{mine.map(chip)}</div>
          </div>
        )}
        {similar.length > 0 && (
          <div className="cmp-pick-group">
            <p className="cmp-pick-h">
              <T en="Similar companies" bn="একই ধরনের কোম্পানি" />
            </p>
            <div className="cmp-pick-chips">{similar.map((p) => chip(p.code.toUpperCase()))}</div>
          </div>
        )}
        <div className="cmp-pick-group">
          <label className="cmp-pick-h" htmlFor="cmp-pick-q">
            <T en="Any other share" bn="অন্য যেকোনো শেয়ার" />
          </label>
          <div className="cmp-pick-search">
            <span className="cmp-pick-search-ic" aria-hidden="true">
              <IconSearch size={16} />
            </span>
            <input
              id="cmp-pick-q"
              type="search"
              className="input-field"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={bn ? "নাম বা কোড লিখুন" : "Type a name or code"}
              autoComplete="off"
              enterKeyHint="search"
            />
          </div>
          {q.trim() && (
            <ul className="cmp-pick-list">
              {companies == null ? (
                <li className="cmp-pick-note">
                  <T en="Loading companies…" bn="কোম্পানির তালিকা আনা হচ্ছে…" />
                </li>
              ) : matches.length === 0 ? (
                <li className="cmp-pick-note">
                  <T en="No share matches that." bn="এ নামে কোনো শেয়ার নেই।" />
                </li>
              ) : (
                matches.map((m) => {
                  const on = picked.includes(m.code);
                  return (
                    <li key={m.code}>
                      <button
                        type="button"
                        className={`cmp-pick-row${on ? " is-on" : ""}`}
                        aria-pressed={on}
                        disabled={!on && full}
                        onClick={() => {
                          toggle(m.code);
                          setQ("");
                        }}
                      >
                        <span className="cmp-pick-row-c">{m.code}</span>
                        <span className="cmp-pick-row-n">{shortName(m.name, m.code)}</span>
                        <span className="cmp-pick-row-a">{on ? <T en="Added" bn="যোগ হয়েছে" /> : <T en="Add" bn="যোগ করুন" />}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
        {picked.some((c) => !mine.includes(c) && !similar.some((s) => s.code.toUpperCase() === c)) && (
          <div className="cmp-pick-group">
            <p className="cmp-pick-h">
              <T en="Also added" bn="আরও যোগ করেছেন" />
            </p>
            <div className="cmp-pick-chips">
              {picked.filter((c) => !mine.includes(c) && !similar.some((s) => s.code.toUpperCase() === c)).map(chip)}
            </div>
          </div>
        )}
        <p className="cmp-pick-note">
          <T
            en={`Pick one or more. Up to ${MAX_COMPARE} shares side by side; our analysis of each is Premium.`}
            bn={`এক বা একাধিক বাছুন। পাশাপাশি সর্বোচ্চ ${MAX_COMPARE}টি শেয়ার; প্রতিটির বিশ্লেষণ প্রিমিয়ামে।`}
          />
        </p>
      </div>
    </Sheet>
  );
}
