"use client";

import { useMemo } from "react";
import type { ScoreItem } from "@/lib/api";
import {
  analyzePortfolio,
  buildRebalancePlan,
  type ComputedRow,
} from "@/lib/portfolio-analysis";
import PortfolioAnalysisView from "./PortfolioAnalysisView";

interface Props {
  rows: ComputedRow[];
  priceMap: Map<string, ScoreItem>;
}

export default function PortfolioAnalysis({ rows, priceMap }: Props) {
  const analysis = useMemo(() => analyzePortfolio(rows, priceMap), [rows, priceMap]);
  const rebalance = useMemo(() => buildRebalancePlan(analysis, priceMap), [analysis, priceMap]);
  return <PortfolioAnalysisView analysis={analysis} rebalance={rebalance} />;
}
