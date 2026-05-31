"use client";

import { type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import PersonalizedHome from "@/components/home/PersonalizedHome";

/**
 * Logged-out users (and crawlers / first paint) get the server-rendered marketing
 * landing passed as `children` — keeps SEO intact and avoids hydration mismatch.
 * Logged-in users get the personalized dashboard instead.
 */
export default function HomePersonalizationGate({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn) return <PersonalizedHome />;
  return <>{children}</>;
}
