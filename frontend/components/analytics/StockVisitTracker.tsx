"use client";

import { useEffect } from "react";
import { apiTrackStockVisit } from "@/lib/api";
import { rememberStock } from "@/lib/recent-stocks";

export default function StockVisitTracker({ code }: { code: string }) {
  useEffect(() => {
    if (!code) return;
    apiTrackStockVisit(code);
    // The home page's "Continue where you left off" strip (this device only).
    rememberStock(code);
  }, [code]);
  return null;
}
