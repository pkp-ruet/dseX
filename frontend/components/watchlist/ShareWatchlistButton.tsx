"use client";

import { toast } from "@/lib/toast";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

interface Props {
  codes: string[];
}

export default function ShareWatchlistButton({ codes }: Props) {
  const { lang } = useLang();
  async function handleShare() {
    if (codes.length === 0) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://topstockbd.com";
    const url = `${origin}/watchlist?codes=${codes.map((c) => c.toUpperCase()).join(",")}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast({ message: <T en="Link copied. You can share it with anyone." bn="লিংক কপি হয়েছে। যে কারও সঙ্গে শেয়ার করতে পারেন।" />, tone: "success" });
      } else {
        // fallback for old browsers
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast({ message: <T en="Link copied" bn="লিংক কপি হয়েছে" />, tone: "success" });
      }
    } catch {
      toast({ message: <T en="We couldn't copy the link" bn="লিংক কপি করা যায়নি" />, tone: "error" });
    }
  }

  if (codes.length === 0) return null;

  return (
    <Button
      type="button"
      variant="quiet"
      size="sm"
      onClick={handleShare}
      title={lang === "bn" ? "এই ওয়াচলিস্টের একটি লিংক কপি করুন" : "Copy a link to this watchlist"}
      className="shrink-0"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      <T en="Share" bn="শেয়ার করুন" />
    </Button>
  );
}
