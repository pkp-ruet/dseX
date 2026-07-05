"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScoreItem } from "@/lib/api";
import {
  analyzePortfolio,
  buildRebalancePlan,
  type AnalysisLang,
  type ComputedRow,
} from "@/lib/portfolio-analysis";
import PortfolioAnalysisView from "./PortfolioAnalysisView";

const LANG_KEY = "dsex.portfolio.lang";

interface Props {
  rows: ComputedRow[];
  priceMap: Map<string, ScoreItem>;
}

export default function PortfolioAnalysis({ rows, priceMap }: Props) {
  const [lang, setLang] = useState<AnalysisLang>("bn");

  // Restore the last-used language (localStorage is unavailable during SSR).
  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "bn" || saved === "en") setLang(saved);
  }, []);

  const changeLang = (next: AnalysisLang) => {
    setLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // storage may be unavailable (private mode) — the toggle still works for the session
    }
  };

  const analysis = useMemo(() => analyzePortfolio(rows, priceMap, lang), [rows, priceMap, lang]);
  const rebalance = useMemo(() => buildRebalancePlan(analysis, priceMap), [analysis, priceMap]);
  return (
    <PortfolioAnalysisView
      analysis={analysis}
      rebalance={rebalance}
      lang={lang}
      onLangChange={changeLang}
    />
  );
}
