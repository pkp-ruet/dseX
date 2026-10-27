"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";

/** Route error boundary — same surface as app/error.tsx, route-specific copy. */
export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("profile failed to render:", error);
  }, [error]);

  return (
    <ErrorState
      title={<T en="We couldn't load your profile" bn="আপনার প্রোফাইল এখন লোড করা যাচ্ছে না" />}
      onRetry={reset}
      links={[{ href: "/portfolio", label: <T en="Your portfolio" bn="আপনার পোর্টফোলিও" /> }]}
    />
  );
}
