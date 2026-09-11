"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePersonalCodes, type PersonalCodes } from "@/lib/use-personal-codes";
import { IconStar } from "@/components/home/personalized/DashIcons";

/**
 * One fetch of the signed-in reader's portfolio + watchlist codes for the whole
 * market-analysis page. `usePersonalCodes` hits the portfolio API on mount, so
 * every stock row calling it directly would mean ~50 requests — the provider
 * calls it once and the rows read from context.
 *
 * Logged-out readers get empty sets, so every consumer renders nothing extra
 * and the server-rendered markup is unchanged (no hydration mismatch).
 */
const EMPTY: PersonalCodes = { portfolio: new Set(), watchlist: new Set() };
const Ctx = createContext<PersonalCodes>(EMPTY);

export function PersonalCodesProvider({ children }: { children: ReactNode }) {
  const codes = usePersonalCodes();
  return <Ctx.Provider value={codes}>{children}</Ctx.Provider>;
}

export function usePersonalCodesCtx(): PersonalCodes {
  return useContext(Ctx);
}

/**
 * Tiny owner tag beside a trading code: "H" when the reader holds it, a star
 * when they follow it (held wins when both). Same H / ★ language as the
 * dashboard's MyStocksToday. Renders nothing for everyone else.
 */
export function PersonalMark({ code }: { code: string }) {
  const { portfolio, watchlist } = usePersonalCodesCtx();
  const c = code.toUpperCase();
  const held = portfolio.has(c);
  const watched = watchlist.has(c);
  if (!held && !watched) return null;
  return (
    <span
      className={`ms-own ${held ? "ms-own--held" : "ms-own--watch"}`}
      title={held ? "In your portfolio" : "On your watchlist"}
      aria-label={held ? "In your portfolio" : "On your watchlist"}
    >
      {held ? "H" : <IconStar size={10} />}
    </span>
  );
}
