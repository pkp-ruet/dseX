"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { IconShare } from "@/components/stock/StockIcons";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

interface Props {
  code: string;
  companyName: string | null;
  score: number | null;
  ltp: number | null;
  className?: string;
}

/**
 * Native share sheet where the browser has one (every Android phone does),
 * otherwise copy the link. The shared URL is the page itself, so WhatsApp and
 * Facebook unfurl the OG report card (`opengraph-image.tsx`) — the verdict card
 * was designed "for shared screenshots" but nothing on the page let you share.
 */
export default function ShareButton({ code, companyName, score, ltp, className = "" }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { bn } = useLang();

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.origin + `/stock/${code}` : `/stock/${code}`;
    const name = companyName || code;
    const bits = [`${name} (${code})`];
    if (score != null) bits.push(`score ${Math.round(score)}/100`);
    if (ltp != null) bits.push(`৳${ltp >= 100 ? Math.round(ltp).toLocaleString("en-US") : ltp.toFixed(1)}`);
    const text = `${bits.join(" · ")} — free DSE stock analysis on TopStockBD`;

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: `${name} — TopStockBD`, text, url });
        return;
      }
    } catch (err) {
      // User dismissed the sheet — nothing to report.
      if (err instanceof Error && err.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: <T en="Link copied" bn="লিংক কপি হয়েছে" />, tone: "success" });
    } catch {
      toast({ message: <T en="We couldn't copy the link" bn="লিংক কপি করা যায়নি" />, tone: "error" });
    }
  }

  return (
    <Button
      type="button"
      variant="quiet"
      size="sm"
      onClick={handleShare}
      className={`${mounted ? "" : "invisible"} ${className}`.trim()}
      aria-label={bn ? `${code} শেয়ার করুন` : `Share ${code}`}
      title={bn ? "এই শেয়ারের লিংক পাঠান" : "Share this stock"}
    >
      <IconShare size={14} />
      <span>
        <T en="Share" bn="শেয়ার করুন" />
      </span>
    </Button>
  );
}
