"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiAuthPing } from "@/lib/api";

export default function PingTracker() {
  const { isLoggedIn } = useAuth();
  const pathname = usePathname();
  const lastPinged = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      lastPinged.current = null;
      return;
    }
    // Dedupe redundant re-renders + React StrictMode double-invoke so each
    // distinct route fires exactly one ping.
    if (lastPinged.current === pathname) return;
    lastPinged.current = pathname;
    apiAuthPing(pathname);
  }, [isLoggedIn, pathname]);

  return null;
}
