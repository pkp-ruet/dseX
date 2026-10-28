"use client";

import { useState } from "react";
import { IconShare } from "@/components/ui/icons";
import { useLang } from "@/context/LangContext";
import { toast } from "@/lib/toast";
import { T } from "@/components/i18n/T";
import type { CheckKey } from "@/lib/stock-report";

/**
 * Share one check of the report as an image (`/api/og/check`). On a phone
 * with the share sheet the PNG itself goes to WhatsApp / Messenger; elsewhere
 * the section link is shared or copied. Only the free face is in the image.
 */
export default function ShareCheck({ code, k, name }: { code: string; k: CheckKey; name: string }) {
  const { bn } = useLang();
  const [busy, setBusy] = useState(false);

  const onShare = async () => {
    if (busy) return;
    setBusy(true);
    const link = `${window.location.origin}/stock/${encodeURIComponent(code)}#rp-${k}`;
    const title = `${name} (${code}) — TopStockBD`;
    try {
      if (typeof navigator.share === "function") {
        try {
          const res = await fetch(`/api/og/check?code=${encodeURIComponent(code)}&k=${k}`);
          if (res.ok) {
            const blob = await res.blob();
            const file = new File([blob], `${code}-${k}.png`, { type: "image/png" });
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({ files: [file], title, text: link });
              return;
            }
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
        }
        await navigator.share({ title, url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      toast({ message: <T en="Link copied" bn="লিংক কপি হয়েছে" /> });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        toast({ message: <T en="Couldn't share this one. Try again." bn="শেয়ার করা যায়নি। আবার চেষ্টা করুন।" /> });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label={bn ? "এই অংশটি শেয়ার করুন" : "Share this check"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 active:opacity-70"
    >
      <IconShare size={16} />
    </button>
  );
}
