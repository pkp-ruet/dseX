"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import PageSkeleton from "@/components/ui/PageSkeleton";

// Loaded only for signed-in visitors. A static import shipped the whole
// dashboard (every card, chart and helper) to every logged-out visitor and
// crawler, who never render it.
const PersonalizedHome = dynamic(() => import("@/components/home/PersonalizedHome"), {
  ssr: false,
  loading: () => <PageSkeleton variant="cards" />,
});

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
