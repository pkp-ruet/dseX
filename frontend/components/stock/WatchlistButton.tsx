"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  isWatched,
  toggleWatchlist,
  subscribeWatchlist,
  loadWatchlist,
} from "@/lib/watchlist";
import { isLoggedIn } from "@/lib/auth";
import { toast } from "@/lib/toast";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import Button from "@/components/ui/Button";

interface Props {
  code: string;
  className?: string;
}

export default function WatchlistButton({ code, className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [watched, setWatched] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { bn } = useLang();

  useEffect(() => {
    setMounted(true);
    if (isLoggedIn()) {
      loadWatchlist().then(() => setWatched(isWatched(code)));
    }
    return subscribeWatchlist(() => setWatched(isWatched(code)));
  }, [code]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn()) {
      const next = encodeURIComponent(pathname || "/");
      router.push(`/register?save=${code.toUpperCase()}&next=${next}`);
      return;
    }
    toggleWatchlist(code).then((nowWatched) => {
      if (nowWatched === "limit") return; // free cap — the limit notice is already up
      setWatched(nowWatched);
      const c = code.toUpperCase();
      toast({
        message: nowWatched ? (
          <T en={`${c} is now on your watchlist`} bn={`${c} আপনার ওয়াচলিস্টে যোগ হয়েছে`} />
        ) : (
          <T en={`${c} is off your watchlist`} bn={`${c} ওয়াচলিস্ট থেকে সরানো হয়েছে`} />
        ),
        tone: nowWatched ? "success" : "neutral",
        action: nowWatched
          ? { label: <T en="View" bn="দেখুন" />, onClick: () => router.push("/watchlist") }
          : undefined,
      });
    });
  };

  return (
    <Button
      type="button"
      variant="quiet"
      size="sm"
      active={watched}
      onClick={handleClick}
      aria-label={
        bn
          ? watched
            ? `${code} ওয়াচলিস্ট থেকে সরান`
            : `${code} ওয়াচলিস্টে যোগ করুন`
          : watched
            ? `Remove ${code} from your watchlist`
            : `Add ${code} to your watchlist`
      }
      title={
        mounted
          ? watched
            ? bn
              ? "ওয়াচলিস্ট থেকে সরান"
              : "Remove from your watchlist"
            : isLoggedIn()
              ? bn
                ? "ওয়াচলিস্টে যোগ করুন"
                : "Add to your watchlist"
              : bn
                ? "সেভ করতে সাইন ইন করুন"
                : "Sign in to save"
          : undefined
      }
      className={`${mounted ? "" : "invisible"} ${className}`.trim()}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={watched ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      <span>{watched ? <T en="On watchlist" bn="ওয়াচলিস্টে আছে" /> : <T en="Watchlist" bn="ওয়াচলিস্ট" />}</span>
    </Button>
  );
}
