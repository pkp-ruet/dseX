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

interface Props {
  code: string;
  className?: string;
}

export default function WatchlistButton({ code, className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [watched, setWatched] = useState(false);
  const [mounted, setMounted] = useState(false);

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
      setWatched(nowWatched);
      toast({
        message: nowWatched ? `${code.toUpperCase()} added to your watchlist` : `${code.toUpperCase()} removed from watchlist`,
        tone: nowWatched ? "success" : "neutral",
        action: nowWatched ? { label: "View", onClick: () => router.push("/watchlist") } : undefined,
      });
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={watched ? `Remove ${code} from watchlist` : `Add ${code} to watchlist`}
      title={
        mounted
          ? watched
            ? "Remove from watchlist"
            : isLoggedIn()
              ? "Add to watchlist"
              : "Sign in to save"
          : undefined
      }
      className={`add-watchlist-btn ${watched ? "add-watchlist-btn--on" : ""} ${className}`}
      style={{ visibility: mounted ? "visible" : "hidden" }}
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
      <span>{watched ? "Saved" : "Watchlist"}</span>
    </button>
  );
}
