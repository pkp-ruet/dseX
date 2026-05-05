"use client";

import { useEffect } from "react";
import { apiTrackStockVisit } from "@/lib/api";

export default function StockVisitTracker({ code }: { code: string }) {
  useEffect(() => {
    if (!code) return;
    apiTrackStockVisit(code);
  }, [code]);
  return null;
}
