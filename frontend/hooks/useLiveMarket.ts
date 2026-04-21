"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getMarketLive, type MarketLiveData } from "@/lib/api";
import { isMarketOpen } from "@/lib/market-hours";

const POLL_INTERVAL_MS = 60_000; // 60s

export interface UseLiveMarketResult {
  data: MarketLiveData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  secondsSinceUpdate: number;
  refresh: () => void;
}

export function useLiveMarket(): UseLiveMarketResult {
  const [data, setData] = useState<MarketLiveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMarketLive();
      setData(result);
      setLastUpdated(new Date());
      setSecondsSinceUpdate(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch regardless of market hours (shows closed state too)
    fetchData();

    // Poll only during trading hours
    intervalRef.current = setInterval(() => {
      if (isMarketOpen()) {
        fetchData();
      }
    }, POLL_INTERVAL_MS);

    // Tick "seconds since update" counter every second
    tickRef.current = setInterval(() => {
      setSecondsSinceUpdate((s) => s + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [fetchData]);

  return { data, loading, error, lastUpdated, secondsSinceUpdate, refresh: fetchData };
}
